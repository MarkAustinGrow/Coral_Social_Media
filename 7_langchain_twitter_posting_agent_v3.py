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

# Load environment variables early
dotenv_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=dotenv_path)

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

from anyio import ClosedResourceError
import urllib.parse

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

# Twitter client using Twitter API v2 with OAuth 1.0a
class TwitterClient:
    """
    A Twitter API v2 client that uses requests-oauthlib to authenticate with OAuth 1.0a,
    similar to how the twitter-api-v2 library works in JavaScript/TypeScript.
    """
    
    def __init__(self, api_key, api_secret, access_token, access_token_secret):
        """
        Initialize the Twitter API v2 client with OAuth 1.0a credentials.
        
        Args:
            api_key: Twitter API key (consumer key)
            api_secret: Twitter API secret (consumer secret)
            access_token: Twitter access token
            access_token_secret: Twitter access token secret
        """
        self.api_key = api_key
        self.api_secret = api_secret
        self.access_token = access_token
        self.access_token_secret = access_token_secret
        
        # Create OAuth1 auth object
        self.auth = OAuth1(
            api_key,
            client_secret=api_secret,
            resource_owner_key=access_token,
            resource_owner_secret=access_token_secret
        )
        
        # Base URLs for Twitter API
        self.api_v2_base_url = "https://api.twitter.com/2"
        
        # Initialize rate limiter
        self.rate_limiter = SimpleRateLimiter()
        
        # Cache for username
        self.cached_username = None
        self.last_username_check = None
        
        logger.info("TwitterClient initialized with OAuth 1.0a for Twitter API v2")
    
    def create_tweet(self, text, in_reply_to_tweet_id=None):
        """
        Create a tweet using Twitter API v2.
        
        Args:
            text: The text of the tweet
            in_reply_to_tweet_id: Optional ID of a tweet to reply to
            
        Returns:
            Response from Twitter API
        """
        # Check rate limits
        if not self.rate_limiter.add_call():
            logger.warning("Rate limit would be exceeded. Waiting...")
            raise Exception("Rate limit would be exceeded. Try again later.")
        
        url = f"{self.api_v2_base_url}/tweets"
        
        # Prepare request payload
        payload = {"text": text}
        if in_reply_to_tweet_id:
            payload["reply"] = {"in_reply_to_tweet_id": in_reply_to_tweet_id}
        
        try:
            # Make the request
            response = requests.post(
                url,
                auth=self.auth,
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            # Check for errors
            if response.status_code != 201:
                logger.error(f"Error creating tweet: {response.status_code} - {response.text}")
                
                # Handle rate limiting
                if response.status_code == 429:
                    # Extract reset time if available
                    reset_time = None
                    if 'x-rate-limit-reset' in response.headers:
                        reset_time = int(response.headers['x-rate-limit-reset'])
                    
                    self.rate_limiter.set_rate_limited(reset_time)
                    raise Exception(f"Rate limit exceeded. Try again later. Error: {response.text}")
                
                raise Exception(f"Error creating tweet: {response.status_code} - {response.text}")
            
            # Parse response
            data = response.json()
            
            # Convert to format similar to v1.1 for compatibility
            return {
                'id': data['data']['id'],
                'id_str': data['data']['id'],
                'text': text,
                'created_at': datetime.now().isoformat()
            }
            
        except requests.RequestException as e:
            logger.error(f"Request error creating tweet: {str(e)}")
            raise Exception(f"Request error creating tweet: {str(e)}")
    
    def verify_credentials(self):
        """
        Verify the credentials by getting the authenticated user's account info.
        
        Returns:
            User information
        """
        # Check rate limits
        if not self.rate_limiter.add_call():
            logger.warning("Rate limit would be exceeded. Waiting...")
            raise Exception("Rate limit would be exceeded. Try again later.")
        
        url = f"{self.api_v2_base_url}/users/me"
        
        try:
            response = requests.get(
                url,
                auth=self.auth,
                params={"user.fields": "id,name,username"}
            )
            
            if response.status_code != 200:
                logger.error(f"Error verifying credentials: {response.status_code} - {response.text}")
                
                # Handle rate limiting
                if response.status_code == 429:
                    # Extract reset time if available
                    reset_time = None
                    if 'x-rate-limit-reset' in response.headers:
                        reset_time = int(response.headers['x-rate-limit-reset'])
                    
                    self.rate_limiter.set_rate_limited(reset_time)
                
                raise Exception(f"Error verifying credentials: {response.status_code} - {response.text}")
            
            # Cache the username
            data = response.json()
            self.cached_username = data['data']['username']
            self.last_username_check = time.time()
            
            return data
            
        except requests.RequestException as e:
            logger.error(f"Request error verifying credentials: {str(e)}")
            raise Exception(f"Request error verifying credentials: {str(e)}")
    
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
            "reset_time": int(time.time() + self.rate_limiter.window_seconds)
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
            # Verify credentials to get username
            user_info = self.verify_credentials()
            return user_info['data']['username']
        except Exception as e:
            logger.error(f"Error getting username: {str(e)}")
            # Return cached username if available, otherwise a default
            return self.cached_username or "unknown_user"

# Initialize Twitter client
twitter_client = None

# Check if OAuth 1.0a credentials are available
if all([
    os.getenv("TWITTER_API_KEY"),
    os.getenv("TWITTER_API_SECRET"),
    os.getenv("TWITTER_ACCESS_TOKEN"),
    os.getenv("TWITTER_ACCESS_TOKEN_SECRET")
]):
    try:
        # Initialize Twitter client with OAuth 1.0a for Twitter API v2
        twitter_client = TwitterClient(
            os.getenv("TWITTER_API_KEY"),
            os.getenv("TWITTER_API_SECRET"),
            os.getenv("TWITTER_ACCESS_TOKEN"),
            os.getenv("TWITTER_ACCESS_TOKEN_SECRET")
        )
        
        # Verify credentials
        user_info = twitter_client.verify_credentials()
        logger.info(f"Twitter client initialized with OAuth 1.0a for Twitter API v2. Connected as: {user_info['data']['username']}")
    except Exception as e:
        logger.error(f"Failed to initialize Twitter client: {str(e)}")
        twitter_client = None
else:
    logger.error("Twitter API credentials not found in environment variables")
    logger.error("Please ensure TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, and TWITTER_ACCESS_TOKEN_SECRET are set")

# Validate that Twitter client is available
if not twitter_client:
    raise ValueError("Failed to initialize Twitter API client. Check your credentials.")

# Use the same waitForAgents=2 as the World News Agent
base_url = "http://localhost:5555/devmode/exampleApplication/privkey/session1/sse"
params = {
    "waitForAgents": 2,  # Same as World News Agent
    "agentId": "twitter_posting_agent",
    "agentDescription": "You are twitter_posting_agent, responsible for posting scheduled tweets to Twitter"
}
query_string = urllib.parse.urlencode(params)
MCP_SERVER_URL = f"{base_url}?{query_string}"

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

# Agent name for database logging
AGENT_NAME = "Twitter Posting Agent"

def log_to_database(level, message, metadata=None):
    """
    Log agent activity to the agent_logs table in Supabase.
    
    Args:
        level: Log level ('info', 'warning', 'error')
        message: Log message
        metadata: Optional JSON metadata
    """
    try:
        # Insert log into agent_logs table
        supabase_client.table("agent_logs").insert({
            "timestamp": datetime.now().isoformat(),
            "level": level,
            "agent_name": AGENT_NAME,
            "message": message,
            "metadata": metadata
        }).execute()
    except Exception as e:
        logger.error(f"Failed to log to database: {str(e)}")

def get_tools_description(tools):
    return "\n".join(
        f"Tool: {tool.name}, Schema: {json.dumps(tool.args).replace('{', '{{').replace('}', '}}')}"
        for tool in tools
    )


@tool
def get_scheduled_tweets(limit: int = 10):
    """
    Get tweets scheduled for posting.
    
    Args:
        limit: Maximum number of tweets to return (default: 10)
        
    Returns:
        Dictionary containing scheduled tweets
    """
    try:
        log_to_database("info", f"Fetching scheduled tweets (limit: {limit})")
        # Get current time
        now = datetime.now()
        
        # Query the potential_tweets table in Supabase
        result = supabase_client.table("potential_tweets").select("*").eq("status", "scheduled").lte("scheduled_for", now.isoformat()).order("scheduled_for", desc=False).order("position", desc=False).limit(limit).execute()
        
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
        
        log_to_database("info", f"Retrieved {len(tweets)} scheduled tweets", {"thread_count": len(threads)})
        return {
            "result": {
                "tweets": tweets,
                "threads": threads
            },
            "count": len(tweets)
        }
        
    except Exception as e:
        logger.error(f"Error getting scheduled tweets: {str(e)}")
        log_to_database("error", f"Error getting scheduled tweets: {str(e)}")
        return {
            "error": f"Failed to get scheduled tweets: {str(e)}",
            "count": 0
        }

@tool
def post_tweet(content: str, in_reply_to_id: str = None):
    """
    Post a tweet to Twitter using the Twitter API client.

    Args:
        content: Text of the tweet.
        in_reply_to_id: Optional ID to reply to.

    Returns:
        Dict containing result or error.
    """
    log_to_database("info", f"Posting tweet: {content[:50]}..." + (f" (in reply to: {in_reply_to_id})" if in_reply_to_id else ""))
    max_retries = 3
    retry_delay = 2

    for attempt in range(max_retries):
        try:
            # Create tweet using Twitter API
            response = twitter_client.create_tweet(content, in_reply_to_id)
            
            # Extract tweet ID from response
            tweet_id = response['id_str']
            logger.info(f"Tweet posted successfully: {tweet_id}")
            log_to_database("info", f"Tweet posted successfully", {"tweet_id": tweet_id})
            return {
                "success": True,
                "result": "Tweet posted successfully",
                "tweet_id": tweet_id,
                "message": f"Tweet posted successfully with ID: {tweet_id}"
            }
        
        except Exception as e:
            logger.error(f"Error on attempt {attempt+1}: {str(e)}")
            
            # Check for specific error types
            error_message = str(e).lower()
            
            # Handle rate limiting
            if "rate limit" in error_message or "429" in error_message:
                logger.warning(f"Rate limit exceeded on attempt {attempt+1}. Waiting before retry.")
                log_to_database("warning", f"Rate limit exceeded on attempt {attempt+1}. Waiting before retry.")
                # Use exponential backoff for rate limits
                wait_time = retry_delay * (4 ** attempt)
                time.sleep(wait_time)
                continue
            
            # Handle authentication errors
            if "authentication" in error_message or "401" in error_message:
                log_to_database("error", "Authentication failed. Please check your Twitter API credentials.")
                return {
                    "success": False,
                    "error": str(e),
                    "result": None,
                    "message": "Authentication failed. Please check your Twitter API credentials."
                }
            
            # Handle permission errors
            if "permission" in error_message or "403" in error_message:
                log_to_database("error", "Permission denied. Your Twitter app may not have write permissions or the account may be restricted.")
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
            log_to_database("error", f"Failed to post tweet after {max_retries} attempts: {str(e)}")
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
    Post a thread of one or more tweets to Twitter, updating Supabase after each post.

    Args:
        tweets: List of tweet records (must include 'id' and 'content')

    Returns:
        Dictionary containing result or error
    """
    try:
        log_to_database("info", f"Posting tweet thread with {len(tweets)} tweets")
        if not tweets:
            return {"error": "No tweets provided", "posted_tweets": []}

        sorted_tweets = sorted(tweets, key=lambda x: x.get("position", 0))
        posted_tweets = []

        previous_tweet_id = None

        for index, tweet in enumerate(sorted_tweets):
            logger.info(f"Posting tweet {index + 1}/{len(sorted_tweets)} in thread")

            response = post_tweet(tweet.get("content", ""), previous_tweet_id)

            if not response.get("success", False) or "error" in response:
                logger.error(f"Failed to post tweet ID {tweet.get('id')}: {response.get('error') or response.get('message')}")
                log_to_database("error", f"Failed to post tweet ID {tweet.get('id')} in thread", {"error": response.get('error')})
                try:
                    supabase_client.table("potential_tweets").update({
                        "status": "failed"
                    }).eq("id", tweet.get("id")).execute()
                except Exception as db_error:
                    logger.error(f"Failed to update Supabase on failure: {str(db_error)}")

                return {
                    "success": False,
                    "error": f"Failed to post tweet {tweet.get('id')}: {response.get('error') or response.get('message')}",
                    "posted_tweets": posted_tweets
                }

            try:
                supabase_client.table("potential_tweets").update({
                    "status": "posted",
                    "posted_at": datetime.now().isoformat()
                }).eq("id", tweet.get("id")).execute()
                logger.info(f"Successfully updated Supabase for tweet {tweet.get('id')}")
                log_to_database("info", f"Successfully updated tweet {tweet.get('id')} status to 'posted'")
            except Exception as db_error:
                logger.error(f"Failed to update tweet {tweet.get('id')} in Supabase: {str(db_error)}")

            previous_tweet_id = response.get("tweet_id")
            posted_tweets.append({
                "tweet_id": previous_tweet_id,
                "content": tweet.get("content"),
                "local_id": tweet.get("id")
            })

            # Avoid rate limit issues
            time.sleep(3)

        log_to_database("info", f"Successfully posted thread of {len(posted_tweets)} tweets")
        return {
            "success": True,
            "result": "Tweet thread posted successfully",
            "posted_tweets": posted_tweets,
            "count": len(posted_tweets),
            "message": f"Successfully posted thread of {len(posted_tweets)} tweets"
        }

    except Exception as e:
        logger.error(f"Unhandled error posting thread: {str(e)}")
        log_to_database("error", f"Unhandled error posting thread: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "posted_tweets": [],
            "message": f"Failed to post thread: {str(e)}"
        }

@tool
def check_api_rate_limits():
    """
    Check Twitter API rate limits.
    
    Returns:
        Dictionary containing rate limit information
    """
    try:
        log_to_database("info", "Checking Twitter API rate limits")
        # Get rate limits from Twitter client
        rate_limit_info = twitter_client.get_rate_limits()
        
        # Calculate percentage used
        remaining = rate_limit_info.get("remaining", 0)
        limit = rate_limit_info.get("limit", 1)  # Avoid division by zero
        percentage_used = ((limit - remaining) / limit) * 100
        
        # Format reset time
        reset_time = rate_limit_info.get("reset_time", 0)
        reset_time_str = datetime.fromtimestamp(reset_time).strftime('%Y-%m-%d %H:%M:%S')
        
        rate_limit_result = {
            "success": True,
            "result": {
                **rate_limit_info,
                "percentage_used": round(percentage_used, 2),
                "reset_time_formatted": reset_time_str
            }
        }
        
        log_to_database("info", f"API rate limits: {remaining}/{limit} remaining ({round(percentage_used, 2)}% used)", 
                       {"remaining": remaining, "limit": limit, "reset_time": reset_time_str})
        
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
    
    # Use a simpler prompt similar to the World News Agent
    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            f"""You are an agent interacting with the tools from Coral Server and having your own tools. Your task is to perform any instructions coming from any agent.
            
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
            2. If rate limits allow, get scheduled tweets using get_scheduled_tweets
            3. For each thread:
               a. Post the thread using post_tweet_thread
               b. Wait a few seconds between threads to avoid rate limiting
            
            When posting tweets, focus on:
            - Respecting Twitter API rate limits
            - Posting threads in the correct order
            - Handling errors gracefully
            - Updating the status of tweets in Supabase
            
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
    # Use the new MCP client pattern (langchain-mcp-adapters 0.1.0+)
    client = MultiServerMCPClient(
        connections={
            "coral": {
                "transport": "sse",
                "url": MCP_SERVER_URL,
                "timeout": 300,  # Same as World News Agent
                "sse_read_timeout": 300,  # Same as World News Agent
            }
        }
    )
    
    logger.info(f"Connected to MCP server at {MCP_SERVER_URL}")
    log_to_database("info", "Twitter Posting Agent connected to MCP server")
    
    # Define agent-specific tools
    agent_tools = [
        get_scheduled_tweets,
        post_tweet,
        post_tweet_thread,
        check_api_rate_limits
    ]
    
    # Get Coral tools using the new pattern
    coral_tools = await client.get_tools()
    
    # Combine Coral tools with agent-specific tools
    tools = coral_tools + agent_tools
    
    # Create and run the agent
    agent_executor = await create_twitter_posting_agent(client, tools, agent_tools)
    
    # Use the same main loop as the World News Agent
    while True:
        try:
            logger.info("Starting new agent invocation")
            log_to_database("info", "Starting new agent invocation cycle")
            await agent_executor.ainvoke({"agent_scratchpad": []})
            logger.info("Completed agent invocation, restarting loop")
            log_to_database("info", "Completed agent invocation cycle")
            await asyncio.sleep(1)
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
        # Fetch the tweet from Supabase
        result = supabase_client.table("potential_tweets").select("*").eq("id", tweet_id).execute()
        
        if not result.data or len(result.data) == 0:
            logger.error(f"Tweet with ID {tweet_id} not found")
            log_to_database("error", f"Tweet with ID {tweet_id} not found")
            return 1
        
        tweet = result.data[0]
        logger.info(f"Found tweet: {tweet['content']}")
        
        if is_thread:
            # If this is a thread, get all tweets in the thread
            thread_tweets = []
            
            if tweet.get("blog_post_id") is not None:
                # Get all tweets in the thread with the same blog_post_id
                thread_result = supabase_client.table("potential_tweets").select("*").eq("blog_post_id", tweet["blog_post_id"]).eq("status", "posting").order("position", desc=False).execute()
                
                if thread_result.data and len(thread_result.data) > 0:
                    thread_tweets = thread_result.data
                    logger.info(f"Found {len(thread_tweets)} tweets in thread")
                    log_to_database("info", f"Found {len(thread_tweets)} tweets in thread", {"blog_post_id": tweet["blog_post_id"]})
            
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
            
            # Update the tweet status in Supabase
            supabase_client.table("potential_tweets").update({
                "status": "posted",
                "posted_at": datetime.now().isoformat()
            }).eq("id", tweet_id).execute()
            
            logger.info(f"Tweet posted successfully: {response}")
            log_to_database("info", "Tweet posted successfully", {"tweet_id": response.get("tweet_id")})
            return 0
    
    except Exception as e:
        logger.error(f"Error in post_tweet_direct: {str(e)}")
        log_to_database("error", f"Error in post_tweet_direct: {str(e)}")
        return 1

if __name__ == "__main__":
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Twitter Posting Agent")
    parser.add_argument("--tweet_id", type=int, help="ID of the tweet to post")
    parser.add_argument("--thread", type=str, choices=["true", "false"], help="Whether this is a thread")
    args = parser.parse_args()
    
    # If tweet_id is provided, post the tweet directly
    if args.tweet_id:
        is_thread = args.thread == "true"
        asyncio.run(post_tweet_direct(args.tweet_id, is_thread))
    else:
        # Otherwise, run the agent
        logger.info("Twitter Posting Agent (v3) started")
        log_to_database("info", "Twitter Posting Agent started")
        asyncio.run(main())
