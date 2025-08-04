import asyncio
import os
import json
import logging
import time
import datetime
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain.prompts import ChatPromptTemplate
from langchain.chat_models import init_chat_model
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.tools import tool
import tweepy
from tweepy.errors import TweepyException
from supabase import create_client, Client
from dotenv import load_dotenv
from anyio import ClosedResourceError
import urllib.parse

import signal
import sys
import atexit
import agent_status_updater as asu
import agent_multiuser_utils_simple as amu
from user_twitter_credentials import create_user_twitter_client, has_user_twitter_credentials, get_user_twitter_username

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Agent name for database logging
AGENT_NAME = "Tweet Scraping Agent"

# Load environment variables
load_dotenv()

# Get user context for user-specific MCP server
user_id = amu.get_user_context()

# Use centralized multi-user Coral server
base_url = "https://coral.8interns.com/devmode/exampleApplication/privkey/session1/sse"
params = {
    "waitForAgents": 2,
    "agentId": f"tweet_scraping_agent_{user_id}",
    "agentDescription": f"You are tweet_scraping_agent for user {user_id}, responsible for monitoring Twitter accounts and collecting tweets based on instructions from other agents"
}
query_string = urllib.parse.urlencode(params)
MCP_SERVER_URL = f"{base_url}?{query_string}"

print(f"🔗 Using centralized MCP server: {MCP_SERVER_URL}")

# Initialize Supabase client
try:
    supabase_client = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_KEY")
    )
except Exception as e:
    logger.error(f"Error initializing Supabase client: {str(e)}")
    raise

# Validate API keys
if not os.getenv("OPENAI_API_KEY"):
    raise ValueError("OPENAI_API_KEY is not set in environment variables.")
if not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_KEY"):
    raise ValueError("SUPABASE_URL or SUPABASE_KEY is not set in environment variables.")

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

def get_user_twitter_client():
    """Get user-specific Twitter client using API v2 with Bearer Token (premium access)."""
    user_id = amu.get_user_context()
    
    if not user_id:
        logger.error("No user context available for Twitter client")
        return None
    
    if not has_user_twitter_credentials(user_id):
        logger.warning(f"User {user_id} has not configured Twitter credentials")
        return None
    
    try:
        # Get user credentials from database
        from user_twitter_credentials import get_user_twitter_credentials
        credentials = get_user_twitter_credentials(user_id)
        
        if not credentials:
            logger.error(f"No Twitter credentials found for user {user_id}")
            return None
        
        # Create Twitter API v2 client with user-specific Bearer Token (premium access method)
        twitter_client = tweepy.Client(
            bearer_token=credentials.get('bearer_token'),  # Use user-specific bearer token from database
            consumer_key=credentials['api_key'],
            consumer_secret=credentials['api_secret'],
            access_token=credentials['access_token'],
            access_token_secret=credentials['access_token_secret'],
            wait_on_rate_limit=True
        )
        
        return twitter_client
        
    except Exception as e:
        logger.error(f"Failed to create Twitter client for user {user_id}: {str(e)}")
        return None

def get_tools_description(tools):
    return "\n".join(
        f"Tool: {tool.name}, Schema: {json.dumps(tool.args).replace('{', '{{').replace('}', '}}')}"
        for tool in tools
    )

@tool
def fetch_tweets(
    usernames: list,
    count_per_user: int = 10,
    include_replies: bool = False,
    include_retweets: bool = False
):
    """
    Fetch recent tweets from specified Twitter usernames using user-specific credentials.
    
    Args:
        usernames: List of Twitter usernames to fetch tweets from
        count_per_user: Number of tweets to fetch per user (default: 10)
        include_replies: Whether to include replies (default: False)
        include_retweets: Whether to include retweets (default: False)
        
    Returns:
        Dictionary containing fetched tweets and rate limit information
    """
    user_id = amu.get_user_context()
    
    if not user_id:
        logger.error("No user context available for fetching tweets")
        log_to_database("error", "No user context available for fetching tweets")
        return {
            "error": "No user context available",
            "count": 0
        }
    
    logger.info(f"Fetching tweets for user {user_id}, usernames: {usernames}")
    log_to_database("info", f"Fetching tweets for user {user_id}, usernames: {usernames}")
    
    # Get user-specific Twitter client
    twitter_client = get_user_twitter_client()
    
    if not twitter_client:
        logger.warning(f"User {user_id} needs to configure Twitter credentials")
        log_to_database("warning", f"User {user_id} needs to configure Twitter credentials")
        return {
            "error": "User needs to configure Twitter credentials in the setup wizard",
            "count": 0,
            "message": "Please configure your Twitter credentials to enable tweet scraping"
        }
    
    results = []
    rate_limit_info = {"remaining": None, "reset_time": None}
    
    try:
        username = get_user_twitter_username(user_id)
        logger.info(f"Using Twitter credentials for user {user_id} (@{username})")
        
        for target_username in usernames:
            logger.info(f"Fetching tweets for target user: {target_username}")
            log_to_database("info", f"Fetching tweets for target user: {target_username}")
            
            # Get user ID from username (API v2 method)
            user = twitter_client.get_user(username=target_username)
            if not user.data:
                logger.warning(f"User not found: {target_username}")
                log_to_database("warning", f"User not found: {target_username}")
                continue
            
            user_id_twitter = user.data.id
            
            # Fetch tweets using API v2 (premium access method)
            tweets = twitter_client.get_users_tweets(
                id=user_id_twitter,
                max_results=min(count_per_user, 100),  # API v2 limit
                exclude=['retweets'] if not include_retweets else None,
                expansions=['author_id', 'referenced_tweets.id'],
                tweet_fields=['created_at', 'public_metrics', 'text', 'conversation_id'],
                user_fields=['username', 'name', 'profile_image_url']
            )
            
            # Process tweets
            if tweets.data:
                for tweet in tweets.data:
                    # Skip replies if not requested
                    if not include_replies and getattr(tweet, 'referenced_tweets', None):
                        continue
                        
                    # Extract metrics
                    metrics = {}
                    if hasattr(tweet, 'public_metrics'):
                        metrics = tweet.public_metrics
                    
                    tweet_data = {
                        "id": tweet.id,
                        "text": tweet.text,
                        "created_at": tweet.created_at.isoformat() if hasattr(tweet, 'created_at') else None,
                        "author": target_username,
                        "metrics": metrics,
                        "conversation_id": tweet.conversation_id if hasattr(tweet, 'conversation_id') else None
                    }
                    results.append(tweet_data)
        
        log_to_database("info", f"Successfully fetched {len(results)} tweets for user {user_id}", {
            "count": len(results),
            "twitter_username": username,
            "target_usernames": usernames
        })
        
        return {
            "result": results,
            "rate_limit_info": rate_limit_info,
            "count": len(results),
            "user_id": user_id,
            "twitter_username": username
        }
        
    except TweepyException as e:
        logger.error(f"Twitter API error for user {user_id}: {str(e)}")
        log_to_database("error", f"Twitter API error for user {user_id}: {str(e)}")
        return {
            "error": f"Failed to fetch tweets: {str(e)}",
            "rate_limit_info": rate_limit_info,
            "count": 0,
            "message": "Twitter API error - check your credentials or rate limits"
        }
    except Exception as e:
        logger.error(f"Unexpected error in fetch_tweets for user {user_id}: {str(e)}")
        log_to_database("error", f"Unexpected error in fetch_tweets for user {user_id}: {str(e)}")
        return {
            "error": f"Unexpected error: {str(e)}",
            "count": 0
        }

@tool
def get_api_usage():
    """
    Get current X API usage and rate limits for the current user.
    
    Returns:
        Dictionary containing rate limit information
    """
    user_id = amu.get_user_context()
    
    if not user_id:
        logger.error("No user context available for API usage check")
        log_to_database("error", "No user context available for API usage check")
        return {
            "error": "No user context available",
            "rate_limit_info": {"remaining": 180, "reset_time": int(time.time()) + 900, "limit": 300}
        }
    
    # Get user-specific Twitter client
    twitter_client = get_user_twitter_client()
    
    if not twitter_client:
        logger.warning(f"User {user_id} needs to configure Twitter credentials")
        log_to_database("warning", f"User {user_id} needs to configure Twitter credentials")
        return {
            "error": "User needs to configure Twitter credentials",
            "rate_limit_info": {"remaining": 0, "reset_time": int(time.time()) + 900, "limit": 300}
        }
    
    try:
        # For user-specific rate limits, we'll return default values
        # In a real implementation, you could track usage per user
        rate_limit_info = {
            "remaining": 180,  # Default to 180 if not found
            "reset_time": int(time.time()) + 900,  # Default to 15 minutes from now
            "limit": 300,
            "user_id": user_id
        }
        
        username = get_user_twitter_username(user_id)
        
        log_to_database("info", f"Retrieved API usage information for user {user_id} (@{username})", rate_limit_info)
        return {
            "result": rate_limit_info,
            "user_id": user_id,
            "twitter_username": username
        }
        
    except Exception as e:
        logger.error(f"Unexpected error in get_api_usage for user {user_id}: {str(e)}")
        log_to_database("error", f"Unexpected error in get_api_usage for user {user_id}: {str(e)}")
        return {
            "error": f"Unexpected error: {str(e)}",
            "rate_limit_info": {"remaining": 180, "reset_time": int(time.time()) + 900, "limit": 300}
        }

@tool
def store_tweets(tweets: list):
    """
    Store tweets in Supabase with proper user context.
    
    Args:
        tweets: List of tweet objects to store
        
    Returns:
        Dictionary containing operation result
    """
    try:
        # Get user context - CRITICAL for multiuser support
        user_id = amu.get_user_context()
        
        if not user_id:
            logger.error("No user context available for tweet storage")
            log_to_database("error", "No user context available for tweet storage")
            return {
                "error": "No user context available for tweet storage",
                "count": 0
            }
        
        logger.info(f"Storing tweets for user: {user_id}")
        log_to_database("info", f"Storing tweets for user: {user_id}")
        
        # Prepare tweets for insertion with user_id
        tweets_to_insert = []
        for tweet in tweets:
            # Convert tweet to format matching the exact Supabase schema
            tweet_record = {
                "tweet_id": str(tweet["id"]),  # Ensure string format
                "text": tweet["text"],
                "created_at": tweet["created_at"],
                "author": tweet["author"],
                "likes": tweet.get("metrics", {}).get("like_count", 0),
                "retweets": tweet.get("metrics", {}).get("retweet_count", 0),
                "replies": tweet.get("metrics", {}).get("reply_count", 0),
                "conversation_id": tweet.get("conversation_id"),
                "analyzed": False,  # Mark as not analyzed yet
                "engagement_processed": False,  # Mark as not processed
                "user_id": user_id,  # CRITICAL: Associate with user
                # Note: inserted_at has default now() in database
            }
            tweets_to_insert.append(tweet_record)
        
        # Insert tweets into Supabase with user context
        if tweets_to_insert:
            logger.info(f"Inserting {len(tweets_to_insert)} tweets for user {user_id}")
            
            result = supabase_client.table("tweets_cache").upsert(
                tweets_to_insert, 
                on_conflict="tweet_id"  # Upsert based on tweet_id
            ).execute()
            
            log_to_database("info", f"Successfully stored {len(tweets_to_insert)} tweets for user {user_id}", {
                "count": len(tweets_to_insert),
                "user_id": user_id
            })
            return {
                "result": f"Successfully stored {len(tweets_to_insert)} tweets for user {user_id}",
                "count": len(tweets_to_insert),
                "user_id": user_id
            }
        else:
            return {
                "result": "No tweets to store",
                "count": 0,
                "user_id": user_id
            }
            
    except Exception as e:
        logger.error(f"Supabase error: {str(e)}")
        log_to_database("error", f"Failed to store tweets: {str(e)}")
        return {
            "error": f"Failed to store tweets: {str(e)}",
            "count": 0
        }

@tool
def get_accounts_to_monitor():
    """
    Get list of Twitter accounts to monitor from Supabase for the current user.
    
    Returns:
        Dictionary containing list of accounts and their priorities
    """
    try:
        # Get user context from environment
        user_id = amu.get_user_context()
        
        if not user_id:
            logger.warning("No user context available for account monitoring")
            log_to_database("warning", "No user context available for account monitoring")
            return {
                "result": [],
                "count": 0,
                "message": "No user context available"
            }
        
        logger.info(f"Fetching accounts for user: {user_id}")
        log_to_database("info", f"Fetching accounts for user: {user_id}")
        
        # Fetch accounts from Supabase filtered by user_id
        result = supabase_client.table("x_accounts").select(
            "username, priority, last_fetched_at"
        ).eq("user_id", user_id).order("priority", desc=True).execute()
        
        accounts = result.data if result.data else []
        
        log_to_database("info", f"Retrieved {len(accounts)} accounts to monitor for user {user_id}")
        return {
            "result": accounts,
            "count": len(accounts),
            "user_id": user_id
        }
        
    except Exception as e:
        logger.error(f"Error fetching accounts: {str(e)}")
        log_to_database("error", f"Error fetching accounts: {str(e)}")
        return {
            "error": f"Failed to fetch accounts: {str(e)}",
            "count": 0
        }

@tool
def update_account_fetch_time(usernames: list):
    """
    Update last_fetched_at timestamp for accounts for the current user.
    
    Args:
        usernames: List of usernames to update
        
    Returns:
        Dictionary containing operation result
    """
    try:
        user_id = amu.get_user_context()
        
        if not user_id:
            logger.error("No user context available for updating account fetch time")
            log_to_database("error", "No user context available for updating account fetch time")
            return {
                "error": "No user context available",
                "count": 0
            }
        
        # Update last_fetched_at for each username with user_id filtering
        updated_count = 0
        for username in usernames:
            result = supabase_client.table("x_accounts").update(
                {"last_fetched_at": "now()"}
            ).eq("username", username).eq("user_id", user_id).execute()
            
            if result.data:
                updated_count += len(result.data)
        
        log_to_database("info", f"Updated fetch time for {updated_count} accounts for user {user_id}", {
            "usernames": usernames,
            "user_id": user_id
        })
        return {
            "result": f"Updated fetch time for {updated_count} accounts for user {user_id}",
            "count": updated_count,
            "user_id": user_id
        }
        
    except Exception as e:
        logger.error(f"Error updating account fetch times: {str(e)}")
        log_to_database("error", f"Error updating account fetch times: {str(e)}")
        return {
            "error": f"Failed to update account fetch times: {str(e)}",
            "count": 0
        }

async def create_tweet_scraping_agent(client, tools, agent_tools):
    tools_description = get_tools_description(tools)
    agent_tools_description = get_tools_description(agent_tools)
    
    # Coral Protocol version - listens for mentions instead of autonomous execution
    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            f"""You are a Tweet Scraping Agent operating in CORAL PROTOCOL mode for user {user_id}.
            
            IMPORTANT: You are operating in MULTI-USER mode. Each user has their own Twitter account and credentials.
            You will only scrape tweets using the current user's Twitter API credentials and rate limits.
            
            CORAL PROTOCOL BEHAVIOR:
            You listen for instructions from other agents and respond via the Coral Protocol.
            
            Follow these steps in order:
            1. Call `wait_for_mentions` from coral tools (timeoutMs: 30000) to receive mentions from other agents.
            2. When you receive a mention, keep the thread ID and the sender ID.
            3. Parse the instruction in the message content. Look for requests like:
               - "scrape tweets from [usernames]"
               - "fetch recent tweets"
               - "get tweets from followed accounts"
               - "collect tweets for analysis"
            4. Based on the instruction, use your tools to:
               a. Get accounts to monitor using `get_accounts_to_monitor` (if no specific usernames provided)
               b. Check API usage using `get_api_usage`
               c. Fetch tweets from requested accounts using `fetch_tweets`
               d. Store the fetched tweets using `store_tweets`
               e. Update the last_fetched_at timestamp using `update_account_fetch_time`
            5. Prepare a response with the results (number of tweets fetched, accounts processed, etc.)
            6. Use `send_message` from coral tools to send your response back to the sender in the same thread.
            7. Always respond back to the sender agent, even if there's an error.
            8. Wait for 2 seconds and repeat the process from step 1.
            
            If no mentions are received (timeout), simply continue waiting - do NOT perform autonomous actions.
            
            RESPONSE FORMAT:
            Always format your responses clearly:
            - Success: "Fetched X tweets from Y accounts: [account1, account2]. Stored in database for analysis."
            - Error: "Unable to fetch tweets: [reason]. Please check Twitter credentials or try again later."
            - No accounts: "No accounts configured for monitoring. Please add accounts in the dashboard."
            
            Always respect rate limits and prioritize accounts based on their priority setting.
            Handle cases where users haven't configured Twitter credentials gracefully.
            
            Available Coral tools: {tools_description}
            Available agent tools: {agent_tools_description}"""
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
    """Main agent execution loop following working World News Agent pattern"""
    # Check if user has Twitter credentials before starting
    user_id = amu.get_user_context()
    
    if not user_id:
        logger.error("No user context available. Cannot start Tweet Scraping Agent.")
        log_to_database("error", "No user context available. Cannot start Tweet Scraping Agent.")
        return
    
    logger.info(f"Starting Tweet Scraping Agent (Coral Protocol) for user: {user_id}")
    log_to_database("info", f"Tweet Scraping Agent (Coral Protocol) starting for user: {user_id}")
    
    # Single persistent connection following working World News Agent pattern
    async with MultiServerMCPClient(
        connections={
            "coral": {
                "transport": "sse",
                "url": MCP_SERVER_URL,
                "headers": {"X-User-ID": user_id},  # CRITICAL: User isolation header
                "timeout": 300,
                "sse_read_timeout": 300,
            }
        }
    ) as client:
        logger.info(f"Connected to MCP server at {MCP_SERVER_URL}")
        log_to_database("info", f"Tweet Scraping Agent (Coral Protocol) connected to MCP server for user {user_id}")
        
        # Define agent-specific tools
        agent_tools = [
            fetch_tweets,
            get_api_usage,
            store_tweets,
            get_accounts_to_monitor,
            update_account_fetch_time
        ]
        
        # Get Coral tools using the new pattern
        coral_tools = client.get_tools()
        logger.info(f"Available Coral tools: {[tool.name for tool in coral_tools]}")
        log_to_database("info", f"Available Coral tools: {[tool.name for tool in coral_tools]}")
        
        # Combine Coral tools with agent-specific tools
        tools = coral_tools + agent_tools
        
        # Create the agent executor
        agent_executor = await create_tweet_scraping_agent(client, tools, agent_tools)
        
        logger.info("Starting Tweet Scraping Agent (Coral Protocol) execution")
        log_to_database("info", "Starting Tweet Scraping Agent (Coral Protocol) execution")
        
        # Infinite loop with persistent connection following working World News Agent pattern
        while True:
            try:
                logger.info("Starting new agent invocation")
                await agent_executor.ainvoke({})
                logger.info("Completed agent invocation, restarting loop")
                await asyncio.sleep(1)
            except Exception as e:
                logger.error(f"Error in agent loop: {str(e)}")
                log_to_database("error", f"Error in agent loop: {str(e)}")
                await asyncio.sleep(5)

if __name__ == "__main__":
    # Mark agent as started (use both old and new for compatibility)
    asu.mark_agent_started(AGENT_NAME)
    amu.mark_agent_started_with_user(AGENT_NAME)
    log_to_database("info", "Tweet Scraping Agent (Coral Protocol) started")
    
    try:
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
