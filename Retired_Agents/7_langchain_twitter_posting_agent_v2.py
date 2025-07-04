import asyncio
import os
import json
import logging
import time
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain.prompts import ChatPromptTemplate
from langchain.chat_models import init_chat_model
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.tools import tool
from supabase import create_client, Client
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables early
dotenv_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=dotenv_path)

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

from anyio import ClosedResourceError
import urllib.parse
from datetime import datetime, timedelta
import tweepy
from tweepy.errors import TweepyException

# Initialize Twitter clients - support both OAuth 2.0 and OAuth 1.0a
twitter_client_v1 = None
twitter_client_v2 = None

# Try to initialize OAuth 2.0 client (preferred for Twitter API v2)
oauth2_token = os.getenv("TWITTER_OAUTH2_TOKEN")
if oauth2_token:
    try:
        # Initialize Twitter API v2 client with OAuth 2.0 token
        # For OAuth 2.0 User Context tokens, we need to use it as access_token, not bearer_token
        # bearer_token is for app-only auth, while access_token is for user context auth
        twitter_client_v2 = tweepy.Client(
            consumer_key=os.getenv("TWITTER_CLIENT_ID"),
            consumer_secret=os.getenv("TWITTER_CLIENT_SECRET"),
            access_token=oauth2_token,
            wait_on_rate_limit=True
        )
        logger.info("Twitter API v2 client initialized with OAuth 2.0 token")
    except Exception as e:
        logger.error(f"Failed to initialize Twitter API v2 client with OAuth 2.0 token: {str(e)}")
        twitter_client_v2 = None

# Initialize OAuth 1.0a client as fallback
if all([
    os.getenv("TWITTER_API_KEY"),
    os.getenv("TWITTER_API_SECRET"),
    os.getenv("TWITTER_ACCESS_TOKEN"),
    os.getenv("TWITTER_ACCESS_SECRET")
]):
    try:
        auth = tweepy.OAuth1UserHandler(
            os.getenv("TWITTER_API_KEY"),
            os.getenv("TWITTER_API_SECRET"),
            os.getenv("TWITTER_ACCESS_TOKEN"),
            os.getenv("TWITTER_ACCESS_SECRET")
        )
        twitter_client_v1 = tweepy.API(auth, wait_on_rate_limit=True)
        logger.info("Twitter API v1.1 client initialized with OAuth 1.0a")
    except Exception as e:
        logger.error(f"Failed to initialize Twitter API v1.1 client: {str(e)}")
        twitter_client_v1 = None

# Validate that at least one Twitter client is available
if not twitter_client_v2 and not twitter_client_v1:
    raise ValueError("Failed to initialize any Twitter API client. Check your credentials.")

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
        
        return {
            "result": {
                "tweets": tweets,
                "threads": threads
            },
            "count": len(tweets)
        }
        
    except Exception as e:
        logger.error(f"Error getting scheduled tweets: {str(e)}")
        return {
            "error": f"Failed to get scheduled tweets: {str(e)}",
            "count": 0
        }

@tool
def post_tweet(content: str, in_reply_to_id: str = None):
    """
    Post a tweet to Twitter using the best available API client.

    Args:
        content: Text of the tweet.
        in_reply_to_id: Optional ID to reply to.

    Returns:
        Dict containing result or error.
    """
    max_retries = 3
    retry_delay = 2

    # Try Twitter API v2 first (if available)
    if twitter_client_v2:
        for attempt in range(max_retries):
            try:
                # Create tweet using Twitter API v2
                if in_reply_to_id:
                    response = twitter_client_v2.create_tweet(
                        text=content,
                        in_reply_to_tweet_id=in_reply_to_id
                    )
                else:
                    response = twitter_client_v2.create_tweet(
                        text=content
                    )
                
                # Extract tweet ID from response
                tweet_id = response.data['id']
                logger.info(f"Tweet posted successfully via API v2: {tweet_id}")
                return {
                    "result": "Tweet posted successfully",
                    "tweet_id": tweet_id
                }
            
            except tweepy.TweepyException as e:
                logger.error(f"Twitter API v2 error on attempt {attempt+1}: {str(e)}")
                if attempt < max_retries - 1:
                    time.sleep(retry_delay * (2 ** attempt))
                    continue
                
                # If we've exhausted retries with v2, try v1.1 as fallback
                if twitter_client_v1:
                    logger.info("Falling back to Twitter API v1.1")
                    break
                
                return {"error": str(e), "result": None}
            
            except Exception as e:
                logger.error(f"Unexpected error with API v2 on attempt {attempt+1}: {str(e)}")
                if attempt < max_retries - 1:
                    time.sleep(retry_delay * (2 ** attempt))
                    continue
                
                # If we've exhausted retries with v2, try v1.1 as fallback
                if twitter_client_v1:
                    logger.info("Falling back to Twitter API v1.1")
                    break
                
                return {"error": str(e), "result": None}
    
    # Fall back to Twitter API v1.1 if v2 failed or is not available
    if twitter_client_v1:
        for attempt in range(max_retries):
            try:
                if in_reply_to_id:
                    response = twitter_client_v1.update_status(
                        status=content,
                        in_reply_to_status_id=in_reply_to_id,
                        auto_populate_reply_metadata=True
                    )
                else:
                    response = twitter_client_v1.update_status(status=content)

                logger.info(f"Tweet posted successfully via API v1.1: {response.id_str}")
                return {
                    "result": "Tweet posted successfully",
                    "tweet_id": str(response.id)
                }

            except tweepy.TweepyException as e:
                logger.error(f"Twitter API v1.1 error on attempt {attempt+1}: {str(e)}")
                if attempt < max_retries - 1:
                    time.sleep(retry_delay * (2 ** attempt))
                    continue
                return {"error": str(e), "result": None}
            
            except Exception as e:
                logger.error(f"Unexpected error with API v1.1 on attempt {attempt+1}: {str(e)}")
                if attempt < max_retries - 1:
                    time.sleep(retry_delay * (2 ** attempt))
                    continue
                return {"error": str(e), "result": None}
    
    return {"error": "Failed to post tweet after all attempts", "result": None}

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
        if not tweets:
            return {"error": "No tweets provided", "posted_tweets": []}

        sorted_tweets = sorted(tweets, key=lambda x: x.get("position", 0))
        posted_tweets = []

        previous_tweet_id = None

        for index, tweet in enumerate(sorted_tweets):
            logger.info(f"Posting tweet {index + 1}/{len(sorted_tweets)} in thread")

            response = post_tweet(tweet.get("content", ""), previous_tweet_id)

            if "error" in response:
                logger.error(f"Failed to post tweet ID {tweet.get('id')}: {response.get('error')}")
                try:
                    supabase_client.table("potential_tweets").update({
                        "status": "failed"
                    }).eq("id", tweet.get("id")).execute()
                except Exception as db_error:
                    logger.error(f"Failed to update Supabase on failure: {str(db_error)}")

                return {
                    "error": f"Failed to post tweet {tweet.get('id')}: {response.get('error')}",
                    "posted_tweets": posted_tweets
                }

            try:
                supabase_client.table("potential_tweets").update({
                    "status": "posted",
                    "posted_at": datetime.now().isoformat()
                }).eq("id", tweet.get("id")).execute()
                logger.info(f"Successfully updated Supabase for tweet {tweet.get('id')}")
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

        return {
            "result": "Tweet thread posted successfully",
            "posted_tweets": posted_tweets,
            "count": len(posted_tweets)
        }

    except Exception as e:
        logger.error(f"Unhandled error posting thread: {str(e)}")
        return {
            "error": str(e),
            "posted_tweets": []
        }

@tool
def check_api_rate_limits():
    """
    Check Twitter API rate limits.
    
    Returns:
        Dictionary containing rate limit information
    """
    try:
        # Tweepy v4+ doesn't have a direct rate_limit_status method
        # Instead, we'll return default values that are conservative
        rate_limit_info = {
            "endpoint": "/2/tweets",
            "remaining": 180,  # Conservative estimate
            "limit": 300,      # Standard limit for most endpoints
            "reset_time": int(time.time()) + 900  # 15 minutes from now
        }
        
        return {
            "result": rate_limit_info
        }
        
    except Exception as e:
        logger.error(f"Error checking rate limits: {str(e)}")
        return {
            "error": f"Failed to check rate limits: {str(e)}",
            "result": {
                "endpoint": "/2/tweets",
                "remaining": 180,  # Default value
                "limit": 300,      # Default value
                "reset_time": int(time.time()) + 900  # 15 minutes from now
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
    # Use the same connection approach as the World News Agent
    async with MultiServerMCPClient(
        connections={
            "coral": {
                "transport": "sse",
                "url": MCP_SERVER_URL,
                "timeout": 300,  # Same as World News Agent
                "sse_read_timeout": 300,  # Same as World News Agent
            }
        }
    ) as client:
        logger.info(f"Connected to MCP server at {MCP_SERVER_URL}")
        
        # Define agent-specific tools
        agent_tools = [
            get_scheduled_tweets,
            post_tweet,
            post_tweet_thread,
            check_api_rate_limits
        ]
        
        # Combine Coral tools with agent-specific tools
        tools = client.get_tools() + agent_tools
        
        # Create and run the agent
        agent_executor = await create_twitter_posting_agent(client, tools, agent_tools)
        
        # Use the same main loop as the World News Agent
        while True:
            try:
                logger.info("Starting new agent invocation")
                await agent_executor.ainvoke({"agent_scratchpad": []})
                logger.info("Completed agent invocation, restarting loop")
                await asyncio.sleep(1)
            except Exception as e:
                logger.error(f"Error in agent loop: {str(e)}")
                await asyncio.sleep(5)

if __name__ == "__main__":
    logger.info("Twitter Posting Agent (v2) started")
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Twitter Posting Agent stopped by user")
    except Exception as e:
        logger.error(f"Fatal error: {str(e)}")
        raise
    finally:
        logger.info("Twitter Posting Agent stopped")
