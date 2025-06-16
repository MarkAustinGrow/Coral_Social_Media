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
from anyio import ClosedResourceError
import urllib.parse
from datetime import datetime, timedelta
import tweepy
from tweepy.errors import TweepyException

import signal
import sys
import atexit
import agent_status_updater as asu


# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

base_url = "http://localhost:5555/devmode/exampleApplication/privkey/session1/sse"
params = {
    "waitForAgents": 7,  # Total number of agents in the system
    "agentId": "twitter_posting_agent",
    "agentDescription": "You are twitter_posting_agent, responsible for posting scheduled tweets to Twitter"
}
query_string = urllib.parse.urlencode(params)
MCP_SERVER_URL = f"{base_url}?{query_string}"

AGENT_NAME = "twitter_posting_agent"

# Initialize API clients
try:
    # Twitter API client
    twitter_client = tweepy.Client(
        bearer_token=os.getenv("TWITTER_BEARER_TOKEN"),
        consumer_key=os.getenv("TWITTER_API_KEY"),
        consumer_secret=os.getenv("TWITTER_API_SECRET"),
        access_token=os.getenv("TWITTER_ACCESS_TOKEN"),
        access_token_secret=os.getenv("TWITTER_ACCESS_SECRET")
    )
    
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
    logger.error(f"Error initializing API clients: {str(e)}")
    raise

# Validate API keys
if not os.getenv("OPENAI_API_KEY"):
    raise ValueError("OPENAI_API_KEY is not set in environment variables.")
if not os.getenv("TWITTER_BEARER_TOKEN"):
    raise ValueError("TWITTER_BEARER_TOKEN is not set in environment variables.")
if not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_KEY"):
    raise ValueError("SUPABASE_URL or SUPABASE_KEY is not set in environment variables.")

# Agent name for status updates - must match exactly what's in the database
AGENT_NAME = "Twitter Posting Agent"

# Register signal handlers for graceful shutdown
def signal_handler(sig, frame):
    """Handle Ctrl+C and other signals to gracefully shut down"""
    print("Shutting down gracefully...")
    asu.mark_agent_stopped(AGENT_NAME)
    sys.exit(0)

# Register signal handlers
signal.signal(signal.SIGINT, signal_handler)  # Ctrl+C
signal.signal(signal.SIGTERM, signal_handler)  # Termination signal

# Register function to mark agent as stopped when the script exits
atexit.register(lambda: asu.mark_agent_stopped(AGENT_NAME))

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
    Post a tweet to Twitter.
    
    Args:
        content: Content of the tweet
        in_reply_to_id: ID of the tweet to reply to (optional)
        
    Returns:
        Dictionary containing the result of the operation
    """
    try:
        # Post the tweet using Twitter API v2
        if in_reply_to_id:
            response = twitter_client.create_tweet(
                text=content,
                in_reply_to_tweet_id=in_reply_to_id
            )
        else:
            response = twitter_client.create_tweet(
                text=content
            )
        
        if response.data:
            return {
                "result": "Tweet posted successfully",
                "tweet_id": response.data.get("id")
            }
        else:
            return {
                "error": "Failed to post tweet",
                "result": None
            }
        
    except TweepyException as e:
        logger.error(f"Twitter API error: {str(e)}")
        return {
            "error": f"Failed to post tweet: {str(e)}",
            "result": None
        }
    except Exception as e:
        logger.error(f"Error posting tweet: {str(e)}")
        return {
            "error": f"Failed to post tweet: {str(e)}",
            "result": None
        }

@tool
def post_tweet_thread(tweets: list):
    """
    Post a thread of tweets to Twitter.
    
    Args:
        tweets: List of tweet objects to post
        
    Returns:
        Dictionary containing the result of the operation
    """
    try:
        # Sort tweets by position
        sorted_tweets = sorted(tweets, key=lambda x: x.get("position", 0))
        
        # Post the first tweet
        first_tweet = sorted_tweets[0]
        first_response = post_tweet(first_tweet.get("content", ""))
        
        if "error" in first_response:
            return first_response
        
        # Update the tweet status in Supabase
        supabase_client.table("potential_tweets").update({
            "status": "posted",
            "posted_at": datetime.now().isoformat()
        }).eq("id", first_tweet.get("id")).execute()
        
        # Post the rest of the tweets as replies
        previous_tweet_id = first_response.get("tweet_id")
        posted_tweets = [first_response]
        
        for tweet in sorted_tweets[1:]:
            # Post as reply to previous tweet
            response = post_tweet(tweet.get("content", ""), previous_tweet_id)
            
            if "error" in response:
                # Update the status of the failed tweet
                supabase_client.table("potential_tweets").update({
                    "status": "failed"
                }).eq("id", tweet.get("id")).execute()
                
                return {
                    "error": f"Failed to post tweet {tweet.get('position')}: {response.get('error')}",
                    "posted_tweets": posted_tweets
                }
            
            # Update the tweet status in Supabase
            supabase_client.table("potential_tweets").update({
                "status": "posted",
                "posted_at": datetime.now().isoformat()
            }).eq("id", tweet.get("id")).execute()
            
            # Update previous_tweet_id for next reply
            previous_tweet_id = response.get("tweet_id")
            posted_tweets.append(response)
            
            # Sleep to avoid rate limiting
            time.sleep(2)
        
        return {
            "result": "Tweet thread posted successfully",
            "posted_tweets": posted_tweets,
            "count": len(posted_tweets)
        }
        
    except Exception as e:
        logger.error(f"Error posting tweet thread: {str(e)}")
        return {
            "error": f"Failed to post tweet thread: {str(e)}",
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
        # Get rate limit status
        rate_limits = twitter_client.rate_limit_status()
        
        # Extract relevant rate limit info
        post_limits = rate_limits.get('resources', {}).get('statuses', {}).get('/statuses/update', {})
        
        rate_limit_info = {
            "endpoint": "/statuses/update",
            "remaining": post_limits.get('remaining', 0),
            "limit": post_limits.get('limit', 0),
            "reset_time": post_limits.get('reset', 0)
        }
        
        return {
            "result": rate_limit_info
        }
        
    except Exception as e:
        logger.error(f"Error checking rate limits: {str(e)}")
        return {
            "error": f"Failed to check rate limits: {str(e)}",
            "result": {
                "endpoint": "/statuses/update",
                "remaining": 300,  # Default value
                "limit": 300,      # Default value
                "reset_time": int(time.time()) + 900  # 15 minutes from now
            }
        }

async def create_twitter_posting_agent(client, tools, agent_tools):
    tools_description = get_tools_description(tools)
    agent_tools_description = get_tools_description(agent_tools)
    
    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            f"""You are twitter_posting_agent, responsible for posting scheduled tweets to Twitter.
            
            Follow these steps in order:
            1. Call wait_for_mentions from coral tools (timeoutMs: 8000) to receive instructions from other agents
            2. If you receive a mention:
               a. Process the instruction (e.g., post a specific tweet or thread)
               b. Execute the requested operation using your tools
               c. Send a response back to the sender with the results
            3. If no mentions are received (timeout):
               a. Check API rate limits using check_api_rate_limits
               b. If rate limits allow, get scheduled tweets using get_scheduled_tweets
               c. For each thread:
                  i. Post the thread using post_tweet_thread
                  ii. Wait a few seconds between threads to avoid rate limiting
            4. Wait for 2 seconds and repeat the process
            
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
    max_retries = 3
    for attempt in range(max_retries):
        try:
            async with MultiServerMCPClient(
                connections={
                    "coral": {
                        "transport": "sse",
                        "url": MCP_SERVER_URL,
                        "timeout": 300,
                        "sse_read_timeout": 300,
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
                
                while True:
                    try:
                        logger.info("Starting new agent invocation")
                        await agent_executor.ainvoke({"agent_scratchpad": []})
                        logger.info("Completed agent invocation, restarting loop")
                        await asyncio.sleep(1)
                    except Exception as e:
                        logger.error(f"Error in agent loop: {str(e)}")
                        await asyncio.sleep(5)
                        
        except ClosedResourceError as e:
            logger.error(f"ClosedResourceError on attempt {attempt + 1}: {e}")
            if attempt < max_retries - 1:
                logger.info("Retrying in 5 seconds...")
                await asyncio.sleep(5)
                continue
            else:
                logger.error("Max retries reached. Exiting.")
                raise
        except Exception as e:
            logger.error(f"Unexpected error on attempt {attempt + 1}: {e}")
            if attempt < max_retries - 1:
                logger.info("Retrying in 5 seconds...")
                await asyncio.sleep(5)
                continue
            else:
                logger.error("Max retries reached. Exiting.")
                raise

if __name__ == "__main__":
    # Mark agent as started
    asu.mark_agent_started(AGENT_NAME)
    
    try:
        asyncio.run(main())
    except Exception as e:
        # Report error in status
        asu.report_error(AGENT_NAME, f"Fatal error: {str(e)}")
        
        # Re-raise the exception
        raise
    finally:
        # Mark agent as stopped
        asu.mark_agent_stopped(AGENT_NAME)
