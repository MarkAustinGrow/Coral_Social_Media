import asyncio
import os
import json
import logging
import time
import requests
import argparse
from requests_oauthlib import OAuth1
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain.prompts import ChatPromptTemplate
from langchain.chat_models import init_chat_model
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.tools import tool
from supabase import create_client, Client
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime
from anyio import ClosedResourceError
import urllib.parse

import signal
import sys
import atexit
import agent_status_updater as asu
import agent_multiuser_utils_simple as amu
from user_twitter_credentials import create_user_twitter_client, has_user_twitter_credentials, get_user_twitter_username

# Load environment variables early
dotenv_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=dotenv_path)

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Agent name for database logging
AGENT_NAME = "Twitter Posting Agent (Multi-User)"

# Get user context for user-specific MCP server
user_id = amu.get_user_context()

# Use centralized multi-user Coral server
base_url = "http://coral.8interns.com/devmode/exampleApplication/privkey/session1/sse"
params = {
    "waitForAgents": 7,  # Total number of agents in the system
    "agentId": f"twitter_posting_agent_{user_id}",
    "agentDescription": f"You are twitter_posting_agent for user {user_id}, responsible for posting scheduled tweets to Twitter"
}
query_string = urllib.parse.urlencode(params)
MCP_SERVER_URL = f"{base_url}?{query_string}"

print(f"🔗 Using centralized MCP server: {MCP_SERVER_URL}")

# Register signal handlers for graceful shutdown
def signal_handler(sig, frame):
    """Handle Ctrl+C and other signals to gracefully shut down"""
    print("Shutting down gracefully...")
    asu.mark_agent_stopped(AGENT_NAME)
    sys.exit(0)

# Register signal handlers
signal.signal(signal.SIGINT, signal_handler)  # Ctrl+C
signal.signal(signal.SIGTERM, signal_handler)  # Termination signal

# Register function to mark agent as stopped when the script exits (use both old and new for compatibility)
atexit.register(lambda: asu.mark_agent_stopped(AGENT_NAME))
atexit.register(lambda: amu.mark_agent_stopped_with_user(AGENT_NAME))

def log_to_database(level, message, metadata=None):
    """
    Log agent activity to the agent_logs table in Supabase with user context.
    
    Args:
        level: Log level ('info', 'warning', 'error')
        message: Log message
        metadata: Optional JSON metadata
    """
    # Use the new multiuser-aware logging function
    amu.log_to_database(AGENT_NAME, level, message, metadata)

# Simple rate limiter for Twitter API
class SimpleRateLimiter:
    """
    A simple rate limiter for Twitter API calls.
    Tracks API calls and enforces waiting periods when limits are reached.
    """
    
    def __init__(self, max_calls_per_window=180, window_seconds=900):
        """
        Initialize the rate limiter.
        
        Args:
            max_calls_per_window: Maximum number of calls allowed in the time window
            window_seconds: Time window in seconds
        """
        self.max_calls = max_calls_per_window
        self.window_seconds = window_seconds
        self.calls = []
        self.is_rate_limited = False
        self.rate_limit_reset_time = None
    
    def check_rate_limit(self):
        """
        Check if we're currently rate limited.
        
        Returns:
            True if rate limited, False otherwise
        """
        # If we're explicitly rate limited, check if the reset time has passed
        if self.is_rate_limited and self.rate_limit_reset_time:
            if time.time() >= self.rate_limit_reset_time:
                logger.info("Rate limit reset time has passed. Clearing rate limit flag.")
                self.is_rate_limited = False
                self.rate_limit_reset_time = None
                return False
            return True
        
        # Clean up old calls
        now = time.time()
        self.calls = [call_time for call_time in self.calls if now - call_time < self.window_seconds]
        
        # Check if we've exceeded the limit
        return len(self.calls) >= self.max_calls
    
    def add_call(self):
        """
        Record an API call.
        
        Returns:
            True if the call was recorded, False if rate limited
        """
        if self.check_rate_limit():
            return False
        
        self.calls.append(time.time())
        return True
    
    def set_rate_limited(self, reset_time=None):
        """
        Set the rate limited flag and reset time.
        
        Args:
            reset_time: Time when the rate limit will reset (Unix timestamp)
        """
        self.is_rate_limited = True
        
        if reset_time:
            self.rate_limit_reset_time = reset_time
        else:
            # Default to 15 minutes from now
            self.rate_limit_reset_time = time.time() + 900
        
        logger.warning(f"Rate limited until {datetime.fromtimestamp(self.rate_limit_reset_time).strftime('%Y-%m-%d %H:%M:%S')}")
    
    def get_remaining_calls(self):
        """
        Get the number of remaining calls in the current window.
        
        Returns:
            Number of remaining calls
        """
        # Clean up old calls
        now = time.time()
        self.calls = [call_time for call_time in self.calls if now - call_time < self.window_seconds]
        
        return max(0, self.max_calls - len(self.calls))

# Twitter client using Twitter API v2 with OAuth 1.0a - Updated for user-specific credentials
class UserTwitterClient:
    """
    A Twitter API v2 client that uses user-specific credentials from Supabase.
    """
    
    def __init__(self, user_id):
        """
        Initialize the Twitter API v2 client with user-specific OAuth 1.0a credentials.
        
        Args:
            user_id: The user ID to get credentials for
        """
        self.user_id = user_id
        self.twitter_client = None
        self.rate_limiter = SimpleRateLimiter()
        self.cached_username = None
        self.last_username_check = None
        
        # Initialize the Twitter client with user-specific credentials
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize the Twitter client with user-specific credentials."""
        try:
            # Check if user has Twitter credentials
            if not has_user_twitter_credentials(self.user_id):
                logger.error(f"User {self.user_id} has not configured Twitter credentials")
                log_to_database("error", f"User {self.user_id} has not configured Twitter credentials")
                return False
            
            # Create user-specific Twitter client
            self.twitter_client = create_user_twitter_client(self.user_id)
            
            if self.twitter_client:
                # Get username for logging
                username = get_user_twitter_username(self.user_id)
                logger.info(f"Twitter client initialized for user {self.user_id} (@{username})")
                log_to_database("info", f"Twitter client initialized for user {self.user_id}", {"twitter_username": username})
                return True
            else:
                logger.error(f"Failed to create Twitter client for user {self.user_id}")
                log_to_database("error", f"Failed to create Twitter client for user {self.user_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error initializing Twitter client for user {self.user_id}: {str(e)}")
            log_to_database("error", f"Error initializing Twitter client for user {self.user_id}: {str(e)}")
            return False
    
    def create_tweet(self, text, in_reply_to_tweet_id=None):
        """
        Create a tweet using Twitter API v2 with user-specific credentials.
        Uses the official Twitter API v2 format for threading.
        
        Args:
            text: The text of the tweet
            in_reply_to_tweet_id: Optional ID of a tweet to reply to
            
        Returns:
            Response from Twitter API
        """
        if not self.twitter_client:
            raise Exception(f"Twitter client not initialized for user {self.user_id}. User needs to configure Twitter credentials.")
        
        # Check rate limits
        if not self.rate_limiter.add_call():
            logger.warning("Rate limit would be exceeded. Waiting...")
            raise Exception("Rate limit would be exceeded. Try again later.")
        
        try:
            # DEBUGGING: Log threading information
            if in_reply_to_tweet_id:
                logger.info(f"🔗 THREADING: Creating reply tweet for user {self.user_id}")
                logger.info(f"🔗 Reply to tweet ID: {in_reply_to_tweet_id}")
                logger.info(f"🔗 Tweet content: {text[:100]}...")
                log_to_database("info", f"Creating threaded tweet for user {self.user_id}", {
                    "in_reply_to_tweet_id": in_reply_to_tweet_id,
                    "content_preview": text[:100]
                })
            else:
                logger.info(f"🆕 THREADING: Creating standalone tweet for user {self.user_id}")
                logger.info(f"🆕 Tweet content: {text[:100]}...")
                log_to_database("info", f"Creating standalone tweet for user {self.user_id}", {
                    "content_preview": text[:100]
                })
            
            # Use the user-specific Twitter client with Tweepy-compatible format
            if in_reply_to_tweet_id:
                # FIXED: Use Tweepy-compatible parameter format instead of API v2 reply object
                logger.info(f"🔗 THREADING: Using Tweepy-compatible threading format")
                logger.info(f"🔗 THREADING: Setting in_reply_to_tweet_id parameter: {in_reply_to_tweet_id}")
                
                response = self.twitter_client.create_tweet(
                    text=text,
                    in_reply_to_tweet_id=in_reply_to_tweet_id
                )
                logger.info(f"🔗 THREADING: Twitter API response received for reply tweet")
                logger.info(f"🔗 THREADING: Response data: {response.data if hasattr(response, 'data') else 'No data attribute'}")
            else:
                logger.info(f"🆕 THREADING: Calling Twitter API without reply-to parameter")
                response = self.twitter_client.create_tweet(text=text)
                logger.info(f"🆕 THREADING: Twitter API response received for standalone tweet")
                logger.info(f"🆕 THREADING: Response data: {response.data if hasattr(response, 'data') else 'No data attribute'}")
            
            # Log the response for debugging
            tweet_id = response.data['id']
            logger.info(f"✅ THREADING: Tweet created successfully with ID: {tweet_id}")
            if in_reply_to_tweet_id:
                logger.info(f"✅ THREADING: This tweet should appear as a reply to {in_reply_to_tweet_id}")
            
            # Convert response to consistent format
            return {
                'id': response.data['id'],
                'id_str': response.data['id'],
                'text': text,
                'created_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ THREADING: Error creating tweet for user {self.user_id}: {str(e)}")
            if in_reply_to_tweet_id:
                logger.error(f"❌ THREADING: Failed to create reply to tweet {in_reply_to_tweet_id}")
            
            # Handle rate limiting
            if "rate limit" in str(e).lower() or "429" in str(e):
                self.rate_limiter.set_rate_limited()
            
            raise Exception(f"Error creating tweet for user {self.user_id}: {str(e)}")
    
    def verify_credentials(self):
        """
        Verify the credentials by getting the authenticated user's account info.
        
        Returns:
            User information
        """
        if not self.twitter_client:
            raise Exception(f"Twitter client not initialized for user {self.user_id}")
        
        try:
            # Use the user-specific Twitter client to get user info
            me = self.twitter_client.get_me()
            
            # Cache the username
            self.cached_username = me.data.username
            self.last_username_check = time.time()
            
            return {
                'data': {
                    'id': me.data.id,
                    'name': me.data.name,
                    'username': me.data.username
                }
            }
            
        except Exception as e:
            logger.error(f"Error verifying credentials for user {self.user_id}: {str(e)}")
            raise Exception(f"Error verifying credentials for user {self.user_id}: {str(e)}")
    
    def get_rate_limits(self):
        """
        Get rate limit information for the Twitter API.
        
        Returns:
            Rate limit information
        """
        remaining = self.rate_limiter.get_remaining_calls()
        
        return {
            "endpoint": "/2/tweets",
            "remaining": remaining,
            "limit": self.rate_limiter.max_calls,
            "reset_time": int(time.time() + self.rate_limiter.window_seconds),
            "user_id": self.user_id
        }
    
    def get_username(self):
        """
        Get the authenticated user's username with caching.
        
        Returns:
            Username string
        """
        # Check if we have a cached username that's less than 24 hours old
        if self.cached_username and self.last_username_check:
            hours_since_check = (time.time() - self.last_username_check) / 3600
            if hours_since_check < 24:
                return self.cached_username
        
        try:
            # Get username from user credentials utility
            username = get_user_twitter_username(self.user_id)
            if username:
                self.cached_username = username
                self.last_username_check = time.time()
                return username
            
            # Fallback to API call
            user_info = self.verify_credentials()
            return user_info['data']['username']
        except Exception as e:
            logger.error(f"Error getting username for user {self.user_id}: {str(e)}")
            # Return cached username if available, otherwise a default
            return self.cached_username or f"user_{self.user_id}"

# Initialize user-specific Twitter client
def get_twitter_client():
    """Get or create a Twitter client for the current user."""
    user_id = amu.get_user_context()
    
    if not user_id:
        logger.error("No user context available for Twitter client")
        return None
    
    try:
        return UserTwitterClient(user_id)
    except Exception as e:
        logger.error(f"Failed to initialize Twitter client: {str(e)}")
        return None

# Initialize Supabase client
try:
    # Supabase client
    supabase_client = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_KEY")
    )
    
    # Ensure potential_tweets table exists in Supabase
    try:
        # Check if table exists by attempting to select from it
        supabase_client.table("potential_tweets").select("id").limit(1).execute()
        logger.info("Supabase table 'potential_tweets' exists")
    except Exception as e:
        logger.error(f"Error checking potential_tweets table: {str(e)}")
        logger.info("Make sure to run the SQL scripts in supabase_schema.sql")
        
except Exception as e:
    logger.error(f"Error initializing Supabase client: {str(e)}")
    raise

# Validate other required API keys
if not os.getenv("OPENAI_API_KEY"):
    raise ValueError("OPENAI_API_KEY is not set in environment variables.")

if not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_KEY"):
    raise ValueError("SUPABASE_URL or SUPABASE_KEY is not set in environment variables.")

def get_tools_description(tools):
    return "\n".join(
        f"Tool: {tool.name}, Schema: {json.dumps(tool.args).replace('{', '{{').replace('}', '}}')}"
        for tool in tools
    )

@tool
def get_scheduled_tweets(limit: int = 10):
    """
    Get tweets scheduled for posting for the current user.
    
    Args:
        limit: Maximum number of tweets to return (default: 10)
        
    Returns:
        Dictionary containing scheduled tweets
    """
    try:
        # Get user context - CRITICAL for multiuser support
        user_id = amu.get_user_context()
        
        if not user_id:
            logger.error("No user context available for scheduled tweets")
            log_to_database("error", "No user context available for scheduled tweets")
            return {
                "error": "No user context available for scheduled tweets",
                "count": 0,
                "result": {"tweets": [], "threads": {}}
            }
        
        log_to_database("info", f"Fetching scheduled tweets (limit: {limit}) for user {user_id}")
        # Get current time
        now = datetime.now()
        
        # Query the potential_tweets table in Supabase with user_id filtering
        # Order by blog_post_id first, then position to ensure threads are grouped and ordered correctly
        result = supabase_client.table("potential_tweets").select("*").eq("status", "scheduled").eq("user_id", user_id).lte("scheduled_for", now.isoformat()).order("blog_post_id", desc=False).order("position", desc=False).limit(limit).execute()
        
        tweets = result.data if result.data else []
        
        # Group tweets by blog_post_id to identify threads
        threads = {}
        for tweet in tweets:
            blog_post_id = tweet.get("blog_post_id")
            if blog_post_id not in threads:
                threads[blog_post_id] = []
            threads[blog_post_id].append(tweet)
        
        # Sort tweets in each thread by position
        for blog_post_id in threads:
            threads[blog_post_id].sort(key=lambda x: x.get("position", 0))
        
        log_to_database("info", f"Retrieved {len(tweets)} scheduled tweets for user {user_id}", {"thread_count": len(threads)})
        return {
            "result": {
                "tweets": tweets,
                "threads": threads
            },
            "count": len(tweets),
            "user_id": user_id
        }
        
    except Exception as e:
        logger.error(f"Error getting scheduled tweets: {str(e)}")
        log_to_database("error", f"Error getting scheduled tweets: {str(e)}")
        return {
            "error": f"Failed to get scheduled tweets: {str(e)}",
            "count": 0,
            "result": {"tweets": [], "threads": {}}
        }

@tool
def post_tweet(content: str, in_reply_to_id: str = None):
    """
    Post a tweet to Twitter using user-specific credentials.

    Args:
        content: Text of the tweet.
        in_reply_to_id: Optional ID to reply to.

    Returns:
        Dict containing result or error.
    """
    user_id = amu.get_user_context()
    
    if not user_id:
        logger.error("No user context available for posting tweet")
        log_to_database("error", "No user context available for posting tweet")
        return {
            "success": False,
            "error": "No user context available",
            "result": None,
            "message": "No user context available for posting tweet"
        }
    
    log_to_database("info", f"Posting tweet for user {user_id}: {content[:50]}..." + (f" (in reply to: {in_reply_to_id})" if in_reply_to_id else ""))
    max_retries = 3
    retry_delay = 2

    for attempt in range(max_retries):
        try:
            # Get user-specific Twitter client
            twitter_client = get_twitter_client()
            
            if not twitter_client:
                return {
                    "success": False,
                    "error": "User needs to configure Twitter credentials",
                    "result": None,
                    "message": "User needs to configure Twitter credentials in the setup wizard"
                }
            
            # Create tweet using user-specific Twitter API
            response = twitter_client.create_tweet(content, in_reply_to_id)
            
            # Extract tweet ID from response
            tweet_id = response['id_str']
            username = twitter_client.get_username()
            
            logger.info(f"Tweet posted successfully for user {user_id} (@{username}): {tweet_id}")
            log_to_database("info", f"Tweet posted successfully for user {user_id}", {"tweet_id": tweet_id, "twitter_username": username})
            return {
                "success": True,
                "result": "Tweet posted successfully",
                "tweet_id": tweet_id,
                "message": f"Tweet posted successfully with ID: {tweet_id}",
                "user_id": user_id,
                "twitter_username": username
            }
        
        except Exception as e:
            logger.error(f"Error on attempt {attempt+1} for user {user_id}: {str(e)}")
            
            # Check for specific error types
            error_message = str(e).lower()
            
            # Handle rate limiting
            if "rate limit" in error_message or "429" in error_message:
                logger.warning(f"Rate limit exceeded on attempt {attempt+1} for user {user_id}. Waiting before retry.")
                log_to_database("warning", f"Rate limit exceeded on attempt {attempt+1} for user {user_id}. Waiting before retry.")
                # Use exponential backoff for rate limits
                wait_time = retry_delay * (4 ** attempt)
                time.sleep(wait_time)
                continue
            
            # Handle authentication errors
            if "authentication" in error_message or "401" in error_message or "credentials" in error_message:
                log_to_database("error", f"Authentication failed for user {user_id}. User needs to reconfigure Twitter credentials.")
                return {
                    "success": False,
                    "error": str(e),
                    "result": None,
                    "message": "Authentication failed. Please reconfigure your Twitter credentials in the setup wizard."
                }
            
            # Handle permission errors
            if "permission" in error_message or "403" in error_message:
                log_to_database("error", f"Permission denied for user {user_id}. Twitter app may not have write permissions.")
                return {
                    "success": False,
                    "error": str(e),
                    "result": None,
                    "message": "Permission denied. Your Twitter app may not have write permissions or the account may be restricted."
                }
            
            # For other errors, retry if we have attempts left
            if attempt < max_retries - 1:
                time.sleep(retry_delay * (2 ** attempt))
                continue
                
            # If we've exhausted retries, return the error
            log_to_database("error", f"Failed to post tweet for user {user_id} after {max_retries} attempts: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "result": None,
                "message": f"Failed to post tweet: {str(e)}"
            }
    
    return {
        "success": False,
        "error": "Failed to post tweet after all attempts",
        "result": None,
        "message": "Failed to post tweet after all attempts"
    }

@tool
def post_tweet_thread(tweets: list):
    """
    Post a thread of one or more tweets to Twitter using user-specific credentials, updating Supabase after each post.

    Args:
        tweets: List of tweet records (must include 'id' and 'content')

    Returns:
        Dictionary containing result or error
    """
    try:
        # Get user context - CRITICAL for multiuser support
        user_id = amu.get_user_context()
        
        if not user_id:
            logger.error("No user context available for posting tweet thread")
            log_to_database("error", "No user context available for posting tweet thread")
            return {
                "success": False,
                "error": "No user context available for posting tweet thread",
                "posted_tweets": []
            }
        
        log_to_database("info", f"Posting tweet thread with {len(tweets)} tweets for user {user_id}")
        if not tweets:
            return {"error": "No tweets provided", "posted_tweets": []}

        sorted_tweets = sorted(tweets, key=lambda x: x.get("position", 0))
        posted_tweets = []

        previous_tweet_id = None

        for index, tweet in enumerate(sorted_tweets):
            logger.info(f"Posting tweet {index + 1}/{len(sorted_tweets)} in thread for user {user_id}")

            # FIXED: Use direct function call instead of LangChain tool to avoid 'parent_run_id' error
            try:
                # Get user-specific Twitter client
                twitter_client = get_twitter_client()
                
                if not twitter_client:
                    error_msg = "User needs to configure Twitter credentials"
                    logger.error(f"Failed to get Twitter client for user {user_id}: {error_msg}")
                    log_to_database("error", f"Failed to get Twitter client for user {user_id}: {error_msg}")
                    
                    # Mark remaining tweets as failed
                    for remaining_tweet in sorted_tweets[index:]:
                        try:
                            supabase_client.table("potential_tweets").update({
                                "status": "failed"
                            }).eq("id", remaining_tweet.get("id")).eq("user_id", user_id).execute()
                        except Exception as db_error:
                            logger.error(f"Failed to update remaining tweet {remaining_tweet.get('id')} status: {str(db_error)}")
                    
                    return {
                        "success": False,
                        "error": error_msg,
                        "posted_tweets": posted_tweets
                    }
                
                # FIXED: Direct Twitter API call with proper threading
                tweet_content = tweet.get("content", "")
                
                if previous_tweet_id:
                    logger.info(f"🔗 THREADING: Posting tweet {index + 1} as reply to {previous_tweet_id}")
                    log_to_database("info", f"Posting threaded tweet {index + 1} as reply to {previous_tweet_id} for user {user_id}")
                else:
                    logger.info(f"🆕 THREADING: Posting tweet {index + 1} as standalone (first in thread)")
                    log_to_database("info", f"Posting first tweet in thread for user {user_id}")
                
                # Use the Twitter client directly
                twitter_response = twitter_client.create_tweet(tweet_content, previous_tweet_id)
                
                # Extract tweet ID from response
                current_tweet_id = twitter_response['id_str']
                username = twitter_client.get_username()
                
                logger.info(f"✅ THREADING: Tweet {index + 1} posted successfully with ID: {current_tweet_id}")
                if previous_tweet_id:
                    logger.info(f"✅ THREADING: Tweet {current_tweet_id} should appear as reply to {previous_tweet_id}")
                
                log_to_database("info", f"Tweet {index + 1} posted successfully for user {user_id}", {
                    "tweet_id": current_tweet_id, 
                    "twitter_username": username,
                    "in_reply_to": previous_tweet_id
                })
                
                # Update database
                try:
                    supabase_client.table("potential_tweets").update({
                        "status": "posted",
                        "posted_at": datetime.now().isoformat()
                    }).eq("id", tweet.get("id")).eq("user_id", user_id).execute()
                    logger.info(f"Successfully updated Supabase for tweet {tweet.get('id')} for user {user_id}")
                    log_to_database("info", f"Successfully updated tweet {tweet.get('id')} status to 'posted' for user {user_id}")
                except Exception as db_error:
                    logger.error(f"Failed to update tweet {tweet.get('id')} in Supabase: {str(db_error)}")
                
                # Set up for next tweet in thread
                previous_tweet_id = current_tweet_id
                posted_tweets.append({
                    "tweet_id": current_tweet_id,
                    "content": tweet_content,
                    "local_id": tweet.get("id")
                })
                
                # Avoid rate limit issues
                time.sleep(3)
                
            except Exception as e:
                logger.error(f"Failed to post tweet ID {tweet.get('id')} for user {user_id}: {str(e)}")
                log_to_database("error", f"Failed to post tweet ID {tweet.get('id')} in thread for user {user_id}", {"error": str(e)})
                
                # Mark this tweet as failed
                try:
                    supabase_client.table("potential_tweets").update({
                        "status": "failed"
                    }).eq("id", tweet.get("id")).eq("user_id", user_id).execute()
                except Exception as db_error:
                    logger.error(f"Failed to update Supabase on failure: {str(db_error)}")

                # CRITICAL: Stop the thread here - don't continue posting individual tweets
                # Mark remaining tweets as failed too
                for remaining_tweet in sorted_tweets[index+1:]:
                    try:
                        supabase_client.table("potential_tweets").update({
                            "status": "failed"
                        }).eq("id", remaining_tweet.get("id")).eq("user_id", user_id).execute()
                    except Exception as db_error:
                        logger.error(f"Failed to update remaining tweet {remaining_tweet.get('id')} status: {str(db_error)}")

                return {
                    "success": False,
                    "error": f"Failed to post tweet {tweet.get('id')}: {str(e)}",
                    "posted_tweets": posted_tweets
                }

        # Get username from the last posted tweet or use default
        username = posted_tweets[-1].get("twitter_username") if posted_tweets else f"user_{user_id}"
        if not username or username.startswith("user_"):
            # Try to get username from Twitter client
            try:
                twitter_client = get_twitter_client()
                if twitter_client:
                    username = twitter_client.get_username()
            except:
                username = f"user_{user_id}"
        
        log_to_database("info", f"Successfully posted thread of {len(posted_tweets)} tweets for user {user_id} (@{username})")
        return {
            "success": True,
            "result": "Tweet thread posted successfully",
            "posted_tweets": posted_tweets,
            "count": len(posted_tweets),
            "message": f"Successfully posted thread of {len(posted_tweets)} tweets",
            "user_id": user_id,
            "twitter_username": username
        }

    except Exception as e:
        logger.error(f"Unhandled error posting thread for user {user_id}: {str(e)}")
        log_to_database("error", f"Unhandled error posting thread for user {user_id}: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "posted_tweets": [],
            "message": f"Failed to post thread: {str(e)}"
        }

@tool
def check_api_rate_limits():
    """
    Check Twitter API rate limits for the current user.
    
    Returns:
        Dictionary containing rate limit information
    """
    try:
        user_id = amu.get_user_context()
        
        if not user_id:
            logger.error("No user context available for checking rate limits")
            log_to_database("error", "No user context available for checking rate limits")
            return {
                "success": False,
                "error": "No user context available",
                "result": {}
            }
        
        log_to_database("info", f"Checking Twitter API rate limits for user {user_id}")
        
        # Get user-specific Twitter client
        twitter_client = get_twitter_client()
        
        if not twitter_client:
            return {
                "success": False,
                "error": "User needs to configure Twitter credentials",
                "result": {}
            }
        
        # Get rate limits from user-specific Twitter client
        rate_limit_info = twitter_client.get_rate_limits()
        
        # Calculate percentage used
        remaining = rate_limit_info.get("remaining", 0)
        limit = rate_limit_info.get("limit", 1)  # Avoid division by zero
        percentage_used = ((limit - remaining) / limit) * 100
        
        # Format reset time
        reset_time = rate_limit_info.get("reset_time", 0)
        reset_time_str = datetime.fromtimestamp(reset_time).strftime('%Y-%m-%d %H:%M:%S')
        
        username = twitter_client.get_username()
        
        rate_limit_result = {
            "success": True,
            "result": {
                **rate_limit_info,
                "percentage_used": round(percentage_used, 2),
                "reset_time_formatted": reset_time_str,
                "twitter_username": username
            }
        }
        
        log_to_database("info", f"API rate limits for user {user_id} (@{username}): {remaining}/{limit} remaining ({round(percentage_used, 2)}% used)", 
                       {"remaining": remaining, "limit": limit, "reset_time": reset_time_str, "twitter_username": username})
        
        return rate_limit_result
        
    except Exception as e:
        logger.error(f"Error checking rate limits: {str(e)}")
        log_to_database("error", f"Error checking rate limits: {str(e)}")
        
        # Default values
        default_reset_time = int(time.time()) + 900  # 15 minutes from now
        default_reset_time_str = datetime.fromtimestamp(default_reset_time).strftime('%Y-%m-%d %H:%M:%S')
        
        return {
            "success": False,
            "error": f"Failed to check rate limits: {str(e)}",
            "result": {
                "endpoint": "/2/tweets",
                "remaining": 180,  # Default value
                "limit": 300,      # Default value
                "reset_time": default_reset_time,
                "percentage_used": 40.0,  # Default value
                "reset_time_formatted": default_reset_time_str
            }
        }

async def create_twitter_posting_agent(client, tools, agent_tools):
    tools_description = get_tools_description(tools)
    agent_tools_description = get_tools_description(agent_tools)
    
    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            f"""You are an agent interacting with the tools from Coral Server and having your own tools. Your task is to perform any instructions coming from any agent.
            
            IMPORTANT: You are operating in MULTI-USER mode. Each user has their own Twitter account and credentials.
            You will only post tweets to the current user's Twitter account using their personal API credentials.
            
            Follow these steps in order:
            1. Call wait_for_mentions from coral tools (timeoutMs: 8000) to receive mentions from other agents.
            2. When you receive a mention, keep the thread ID and the sender ID.
            3. Take 2 seconds to think about the content (instruction) of the message and check only from the list of your tools available for you to action.
            4. Check the tool schema and make a plan in steps for the task you want to perform.
            5. Only call the tools you need to perform for each step of the plan to complete the instruction in the content.
            6. Take 3 seconds and think about the content and see if you have executed the instruction to the best of your ability and the tools. Make this your response as "answer".
            7. Use `send_message` from coral tools to send a message in the same thread ID to the sender Id you received the mention from, with content: "answer".
            8. If any error occurs, use `send_message` to send a message in the same thread ID to the sender Id you received the mention from, with content: "error".
            9. Always respond back to the sender agent even if you have no answer or error.
            10. Wait for 2 seconds and repeat the process from step 1.
            
            If no mentions are received (timeout), you should:
            1. Check API rate limits using check_api_rate_limits
            2. If rate limits allow, get scheduled tweets using get_scheduled_tweets for the current user
            3. If there are scheduled tweets available:
               a. Post the thread using post_tweet_thread
               b. Wait a few seconds between threads to avoid rate limiting
            4. If there are no scheduled tweets OR if any error occurs:
               a. Log the status and wait
               b. Do NOT repeatedly call the same tools
               c. Move on to the next cycle gracefully
            
            When posting tweets, focus on:
            - Respecting Twitter API rate limits for the current user
            - Posting threads in the correct order
            - Handling errors gracefully (especially credential issues)
            - Updating the status of tweets in Supabase with user context
            - Ensuring all operations are user-specific and isolated
            - Providing clear error messages when users need to configure Twitter credentials
            
            These are the list of all tools (Coral + your tools): {tools_description}
            These are the list of your tools: {agent_tools_description}"""
        ),
        ("placeholder", "{agent_scratchpad}")
    ])

    model = init_chat_model(
        model="gpt-4o-mini",
        model_provider="openai",
        api_key=os.getenv("OPENAI_API_KEY"),
        temperature=0.3,
        max_tokens=16000
    )

    agent = create_tool_calling_agent(model, tools, prompt)
    return AgentExecutor(agent=agent, tools=tools, verbose=True)

async def main():
    # Check if user has Twitter credentials before starting
    user_id = amu.get_user_context()
    
    if not user_id:
        logger.error("No user context available. Cannot start Twitter Posting Agent.")
        log_to_database("error", "No user context available. Cannot start Twitter Posting Agent.")
        return
    
    if not has_user_twitter_credentials(user_id):
        logger.warning(f"User {user_id} has not configured Twitter credentials. Agent will wait for credentials to be configured.")
        log_to_database("warning", f"User {user_id} has not configured Twitter credentials. Agent will wait for credentials to be configured.")
    
    # Use the new MCP client pattern (langchain-mcp-adapters 0.1.0+)
    client = MultiServerMCPClient(
        connections={
            "coral": {
                "transport": "sse",
                "url": MCP_SERVER_URL,
                "headers": {"X-User-ID": user_id},  # CRITICAL: User isolation header
                "timeout": 300,
                "sse_read_timeout": 300,
            }
        }
    )
    
    logger.info(f"Connected to MCP server at {MCP_SERVER_URL}")
    log_to_database("info", f"Twitter Posting Agent (Multi-User) connected to MCP server for user {user_id}")
    
    # Define agent-specific tools
    agent_tools = [
        get_scheduled_tweets,
        post_tweet,
        post_tweet_thread,
        check_api_rate_limits
    ]
    
    # Get Coral tools using the new pattern
    coral_tools = client.get_tools()
    
    # Combine Coral tools with agent-specific tools
    tools = coral_tools + agent_tools
    
    # Create the agent executor (but don't invoke it continuously)
    agent_executor = await create_twitter_posting_agent(client, tools, agent_tools)
    
    # OPTIMIZED MAIN LOOP - Only call OpenAI when there's actual work to do
    last_posting_time = 0
    posting_interval = 300  # 5 minutes between posting checks
    
    while True:
        try:
            logger.info("Waiting for mentions...")
            log_to_database("info", "Waiting for mentions from other agents")
            
            # Call wait_for_mentions directly through MCP (NO OpenAI API call)
            try:
                wait_for_mentions_tool = next((tool for tool in coral_tools if tool.name == "wait_for_mentions"), None)
                if wait_for_mentions_tool:
                    # Wait for mentions without invoking OpenAI
                    mention_result = await wait_for_mentions_tool.ainvoke({"timeoutMs": 8000})
                    
                    if mention_result and "mentions" in mention_result and mention_result["mentions"]:
                        # We received mentions - NOW invoke OpenAI to process them
                        logger.info("Received mentions, processing with OpenAI...")
                        log_to_database("info", "Received mentions, invoking agent executor")
                        
                        # Only NOW do we call OpenAI API
                        await agent_executor.ainvoke({
                            "agent_scratchpad": [],
                            "mentions": mention_result["mentions"]  # Pass the mentions to the agent
                        })
                        
                        logger.info("Completed processing mentions")
                        log_to_database("info", "Completed processing mentions")
                    else:
                        # No mentions received, check if it's time for scheduled posting
                        logger.info("No mentions received, checking scheduled posting...")
                        
                        current_time = time.time()
                        time_since_last_posting = current_time - last_posting_time
                        
                        if time_since_last_posting >= posting_interval:
                            # Time for scheduled posting - check if we have scheduled tweets
                            try:
                                tweets_result = get_scheduled_tweets.invoke({"limit": 1})
                                if tweets_result.get("count", 0) > 0:
                                    # We have scheduled tweets - NOW invoke OpenAI for posting
                                    logger.info("Time for scheduled tweet posting, processing with OpenAI...")
                                    log_to_database("info", "Time for scheduled tweet posting, invoking agent executor")
                                    
                                    await agent_executor.ainvoke({
                                        "agent_scratchpad": [],
                                        "scheduled_task": "tweet_posting"  # Indicate this is scheduled work
                                    })
                                    
                                    last_posting_time = current_time
                                    logger.info("Completed scheduled tweet posting")
                                    log_to_database("info", "Completed scheduled tweet posting")
                                else:
                                    logger.info("No scheduled tweets available for posting")
                                    await asyncio.sleep(300)  # Wait 5 minutes before checking again
                            except Exception as posting_error:
                                logger.error(f"Error checking scheduled tweets: {str(posting_error)}")
                                await asyncio.sleep(60)
                        else:
                            # Not time yet, just continue waiting (no OpenAI call)
                            time_remaining = posting_interval - time_since_last_posting
                            logger.info(f"Not time for posting yet, {time_remaining:.0f}s remaining...")
                            await asyncio.sleep(min(60, time_remaining))  # Wait up to 1 minute
                else:
                    logger.error("wait_for_mentions tool not found in coral tools")
                    await asyncio.sleep(10)
                    
            except Exception as tool_error:
                logger.error(f"Error calling wait_for_mentions: {str(tool_error)}")
                log_to_database("error", f"Error calling wait_for_mentions: {str(tool_error)}")
                await asyncio.sleep(5)
                
        except Exception as e:
            logger.error(f"Error in agent loop: {str(e)}")
            log_to_database("error", f"Error in agent loop: {str(e)}")
            await asyncio.sleep(5)

# Function to handle direct tweet posting (for API calls)
async def post_tweet_direct(tweet_id, is_thread=False):
    """
    Post a tweet directly without using the MCP server.
    This is used when the agent is called from the API.
    
    Args:
        tweet_id: ID of the tweet to post
        is_thread: Whether this is part of a thread
    """
    logger.info(f"Direct tweet posting mode. Tweet ID: {tweet_id}, Thread: {is_thread}")
    log_to_database("info", f"Direct tweet posting mode initiated", {"tweet_id": tweet_id, "is_thread": is_thread})
    
    try:
        # Get user context - CRITICAL for multiuser support
        user_id = amu.get_user_context()
        
        if not user_id:
            logger.error("No user context available for direct tweet posting")
            log_to_database("error", "No user context available for direct tweet posting")
            return 1
        
        # Check if user has Twitter credentials
        if not has_user_twitter_credentials(user_id):
            logger.error(f"User {user_id} has not configured Twitter credentials")
            log_to_database("error", f"User {user_id} has not configured Twitter credentials")
            return 1
        
        # Fetch the tweet from Supabase with user_id filtering
        result = supabase_client.table("potential_tweets").select("*").eq("id", tweet_id).eq("user_id", user_id).execute()
        
        if not result.data or len(result.data) == 0:
            logger.error(f"Tweet with ID {tweet_id} not found for user {user_id}")
            log_to_database("error", f"Tweet with ID {tweet_id} not found for user {user_id}")
            return 1
        
        tweet = result.data[0]
        logger.info(f"Found tweet: {tweet['content']}")
        
        if is_thread:
            # If this is a thread, get all tweets in the thread
            thread_tweets = []
            
            if tweet.get("blog_post_id") is not None:
                # Get all tweets in the thread with the same blog_post_id and user_id
                thread_result = supabase_client.table("potential_tweets").select("*").eq("blog_post_id", tweet["blog_post_id"]).eq("status", "posting").eq("user_id", user_id).order("position", desc=False).execute()
                
                if thread_result.data and len(thread_result.data) > 0:
                    thread_tweets = thread_result.data
                    logger.info(f"Found {len(thread_tweets)} tweets in thread for user {user_id}")
                    log_to_database("info", f"Found {len(thread_tweets)} tweets in thread for user {user_id}", {"blog_post_id": tweet["blog_post_id"]})
            
            if not thread_tweets:
                # If no thread tweets found, just post the single tweet
                thread_tweets = [tweet]
            
            # Post the thread
            result = post_tweet_thread(thread_tweets)
            
            if "error" in result:
                logger.error(f"Error posting thread: {result['error']}")
                log_to_database("error", f"Error posting thread: {result['error']}")
                return 1
            
            logger.info(f"Thread posted successfully: {result}")
            log_to_database("info", "Thread posted successfully", {"posted_count": len(result.get("posted_tweets", []))})
            return 0
        else:
            # Post a single tweet
            response = post_tweet(tweet["content"])
            
            if "error" in response:
                logger.error(f"Error posting tweet: {response['error']}")
                log_to_database("error", f"Error posting tweet: {response['error']}")
                return 1
            
            # Update the tweet status in Supabase with user_id filtering
            supabase_client.table("potential_tweets").update({
                "status": "posted",
                "posted_at": datetime.now().isoformat()
            }).eq("id", tweet_id).eq("user_id", user_id).execute()
            
            logger.info(f"Tweet posted successfully: {response}")
            log_to_database("info", "Tweet posted successfully", {"tweet_id": response.get("tweet_id")})
            return 0
    
    except Exception as e:
        logger.error(f"Error in post_tweet_direct: {str(e)}")
        log_to_database("error", f"Error in post_tweet_direct: {str(e)}")
        return 1

if __name__ == "__main__":
    # Mark agent as started (use both old and new for compatibility)
    asu.mark_agent_started(AGENT_NAME)
    amu.mark_agent_started_with_user(AGENT_NAME)
    log_to_database("info", "Twitter Posting Agent (Multi-User) started")
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Twitter Posting Agent (Multi-User)")
    parser.add_argument("--tweet_id", type=int, help="ID of the tweet to post")
    parser.add_argument("--thread", type=str, choices=["true", "false"], help="Whether this is a thread")
    args = parser.parse_args()
    
    try:
        # If tweet_id is provided, post the tweet directly
        if args.tweet_id:
            is_thread = args.thread == "true"
            asyncio.run(post_tweet_direct(args.tweet_id, is_thread))
        else:
            # Otherwise, run the agent
            logger.info("Twitter Posting Agent (Multi-User) started")
            log_to_database("info", "Twitter Posting Agent (Multi-User) started")
            asyncio.run(main())
    except Exception as e:
        # Report error in status (use both old and new for compatibility)
        asu.report_error(AGENT_NAME, f"Fatal error: {str(e)}")
        amu.report_error_with_user(AGENT_NAME, f"Fatal error: {str(e)}")
        
        # Re-raise the exception
        raise
    finally:
        # Mark agent as stopped (use both old and new for compatibility)
        asu.mark_agent_stopped(AGENT_NAME)
        amu.mark_agent_stopped_with_user(AGENT_NAME)
