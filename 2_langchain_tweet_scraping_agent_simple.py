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

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Agent name for database logging
AGENT_NAME = "Tweet Scraping Agent"

# Load environment variables
load_dotenv()

# Use the same waitForAgents=2 as the World News Agent
base_url = "http://localhost:5555/devmode/exampleApplication/privkey/session1/sse"
params = {
    "waitForAgents": 2,  # Same as World News Agent
    "agentId": "tweet_scraping_agent",
    "agentDescription": "You are tweet_scraping_agent, responsible for monitoring Twitter accounts and collecting tweets based on priorities"
}
query_string = urllib.parse.urlencode(params)
MCP_SERVER_URL = f"{base_url}?{query_string}"

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

# Rate limiting variables
last_execution_time = 0
current_interval = 1800  # 30 minutes default

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
            "timestamp": datetime.datetime.now().isoformat(),
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
def fetch_tweets(
    usernames: list,
    count_per_user: int = 10,
    include_replies: bool = False,
    include_retweets: bool = False
):
    """
    Fetch recent tweets from specified Twitter usernames.
    
    Args:
        usernames: List of Twitter usernames to fetch tweets from
        count_per_user: Number of tweets to fetch per user (default: 10)
        include_replies: Whether to include replies (default: False)
        include_retweets: Whether to include retweets (default: False)
        
    Returns:
        Dictionary containing fetched tweets and rate limit information
    """
    logger.info(f"Fetching tweets for users: {usernames}")
    log_to_database("info", f"Fetching tweets for users: {usernames}")
    results = []
    rate_limit_info = {"remaining": None, "reset_time": None}
    
    try:
        for username in usernames:
            logger.info(f"Fetching tweets for user: {username}")
            log_to_database("info", f"Fetching tweets for user: {username}")
            
            # Get user ID from username
            user = twitter_client.get_user(username=username)
            if not user.data:
                logger.warning(f"User not found: {username}")
                log_to_database("warning", f"User not found: {username}")
                continue
            
            user_id = user.data.id
            
            # Fetch tweets
            tweets = twitter_client.get_users_tweets(
                id=user_id,
                max_results=count_per_user,
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
                        "author": username,
                        "metrics": metrics,
                        "conversation_id": tweet.conversation_id if hasattr(tweet, 'conversation_id') else None
                    }
                    results.append(tweet_data)
        
        return {
            "result": results,
            "rate_limit_info": rate_limit_info,
            "count": len(results)
        }
        
    except TweepyException as e:
        logger.error(f"Twitter API error: {str(e)}")
        log_to_database("error", f"Twitter API error: {str(e)}")
        return {
            "error": f"Failed to fetch tweets: {str(e)}",
            "rate_limit_info": rate_limit_info,
            "count": 0
        }
    except Exception as e:
        logger.error(f"Unexpected error in fetch_tweets: {str(e)}")
        log_to_database("error", f"Unexpected error in fetch_tweets: {str(e)}")
        return {
            "error": f"Unexpected error: {str(e)}",
            "count": 0
        }

@tool
def get_api_usage():
    """
    Get current X API usage and rate limits.
    
    Returns:
        Dictionary containing rate limit information
    """
    try:
        # Tweepy doesn't provide direct access to rate limit status in newer versions
        # So we'll return default values
        rate_limit_info = {
            "remaining": 180,  # Default to 180 if not found
            "reset_time": int(time.time()) + 900,  # Default to 15 minutes from now
            "limit": 300
        }
        
        log_to_database("info", "Retrieved API usage information", rate_limit_info)
        return {
            "result": rate_limit_info
        }
        
    except TweepyException as e:
        logger.error(f"Error getting rate limits: {str(e)}")
        log_to_database("error", f"Error getting rate limits: {str(e)}")
        return {
            "error": f"Failed to get rate limits: {str(e)}",
            "rate_limit_info": {"remaining": 180, "reset_time": int(time.time()) + 900, "limit": 300}
        }
    except Exception as e:
        logger.error(f"Unexpected error in get_api_usage: {str(e)}")
        log_to_database("error", f"Unexpected error in get_api_usage: {str(e)}")
        return {
            "error": f"Unexpected error: {str(e)}",
            "rate_limit_info": {"remaining": 180, "reset_time": int(time.time()) + 900, "limit": 300}
        }

@tool
def store_tweets(tweets: list):
    """
    Store tweets in Supabase.
    
    Args:
        tweets: List of tweet objects to store
        
    Returns:
        Dictionary containing operation result
    """
    try:
        # Prepare tweets for insertion
        tweets_to_insert = []
        for tweet in tweets:
            # Convert tweet to format matching your Supabase schema
            tweet_record = {
                "tweet_id": tweet["id"],
                "text": tweet["text"],
                "created_at": tweet["created_at"],
                "author": tweet["author"],
                "likes": tweet.get("metrics", {}).get("like_count", 0),
                "retweets": tweet.get("metrics", {}).get("retweet_count", 0),
                "replies": tweet.get("metrics", {}).get("reply_count", 0),
                "conversation_id": tweet.get("conversation_id"),
                "analyzed": False,  # Mark as not analyzed yet
                "inserted_at": "now()"
            }
            tweets_to_insert.append(tweet_record)
        
        # Insert tweets into Supabase
        if tweets_to_insert:
            result = supabase_client.table("tweets_cache").upsert(
                tweets_to_insert, 
                on_conflict="tweet_id"  # Upsert based on tweet_id
            ).execute()
            
            log_to_database("info", f"Successfully stored {len(tweets_to_insert)} tweets", {"count": len(tweets_to_insert)})
            return {
                "result": f"Successfully stored {len(tweets_to_insert)} tweets",
                "count": len(tweets_to_insert)
            }
        else:
            return {
                "result": "No tweets to store",
                "count": 0
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
    Get list of Twitter accounts to monitor from Supabase.
    
    Returns:
        Dictionary containing list of accounts and their priorities
    """
    try:
        # Fetch accounts from Supabase
        result = supabase_client.table("x_accounts").select(
            "username, priority, last_fetched_at"
        ).order("priority", desc=True).execute()
        
        accounts = result.data if result.data else []
        
        log_to_database("info", f"Retrieved {len(accounts)} accounts to monitor")
        return {
            "result": accounts,
            "count": len(accounts)
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
    Update last_fetched_at timestamp for accounts.
    
    Args:
        usernames: List of usernames to update
        
    Returns:
        Dictionary containing operation result
    """
    try:
        # Update last_fetched_at for each username
        for username in usernames:
            supabase_client.table("x_accounts").update(
                {"last_fetched_at": "now()"}
            ).eq("username", username).execute()
        
        log_to_database("info", f"Updated fetch time for {len(usernames)} accounts", {"usernames": usernames})
        return {
            "result": f"Updated fetch time for {len(usernames)} accounts",
            "count": len(usernames)
        }
        
    except Exception as e:
        logger.error(f"Error updating account fetch times: {str(e)}")
        log_to_database("error", f"Error updating account fetch times: {str(e)}")
        return {
            "error": f"Failed to update account fetch times: {str(e)}",
            "count": 0
        }

@tool
def adjust_scrape_frequency(frequency_minutes: int):
    """
    Adjust the scraping frequency based on API usage.
    
    Args:
        frequency_minutes: New frequency in minutes
        
    Returns:
        Dictionary containing operation result
    """
    global current_interval
    
    try:
        # Convert minutes to seconds
        new_interval = frequency_minutes * 60
        
        # Update the interval
        current_interval = new_interval
        
        log_to_database("info", f"Scraping frequency adjusted to {frequency_minutes} minutes", {"new_interval": current_interval})
        return {
            "result": f"Scraping frequency adjusted to {frequency_minutes} minutes",
            "new_interval": current_interval
        }
        
    except Exception as e:
        logger.error(f"Error adjusting scrape frequency: {str(e)}")
        log_to_database("error", f"Error adjusting scrape frequency: {str(e)}")
        return {
            "error": f"Failed to adjust scrape frequency: {str(e)}",
            "current_interval": current_interval
        }

@tool
def should_execute_now():
    """
    Check if enough time has passed since the last execution.
    
    Returns:
        Dictionary indicating whether execution should proceed
    """
    global last_execution_time, current_interval
    
    current_time = time.time()
    time_since_last = current_time - last_execution_time
    
    if time_since_last >= current_interval:
        last_execution_time = current_time
        log_to_database("info", f"Time to execute tweet scraping (last execution was {time_since_last:.0f} seconds ago)")
        
        return {
            "result": True,
            "message": f"Time to execute (last execution was {time_since_last:.0f} seconds ago)",
            "current_interval": current_interval
        }
    else:
        return {
            "result": False,
            "message": f"Not time to execute yet (last execution was {time_since_last:.0f} seconds ago)",
            "time_remaining": current_interval - time_since_last,
            "current_interval": current_interval
        }

async def create_tweet_scraping_agent(client, tools, agent_tools):
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
            1. Check if it's time to perform scheduled scraping using should_execute_now
            2. If it is time, perform the scraping operation:
               a. Get accounts to monitor using get_accounts_to_monitor
               b. Check API usage using get_api_usage
               c. Based on API usage, decide which accounts to fetch (prioritize high priority accounts)
               d. Fetch tweets from selected accounts using fetch_tweets
               e. Store the fetched tweets using store_tweets
               f. Update the last_fetched_at timestamp for processed accounts using update_account_fetch_time
            3. If new tweets were found, create a thread with tweet_research_agent and notify them
            
            Always respect rate limits and prioritize accounts based on their priority setting.
            If API usage is low, consider adjusting the scrape frequency using adjust_scrape_frequency.
            
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
        log_to_database("info", f"Tweet Scraping Agent started and connected to MCP server")
        
        # Define agent-specific tools
        agent_tools = [
            fetch_tweets,
            get_api_usage,
            store_tweets,
            get_accounts_to_monitor,
            update_account_fetch_time,
            adjust_scrape_frequency,
            should_execute_now
        ]
        
        # Combine Coral tools with agent-specific tools
        tools = client.get_tools() + agent_tools
        
        # Create and run the agent
        agent_executor = await create_tweet_scraping_agent(client, tools, agent_tools)
        
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

if __name__ == "__main__":
    logger.info("Tweet Scraping Agent (Simple) started")
    log_to_database("info", "Tweet Scraping Agent (Simple) started")
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Tweet Scraping Agent stopped by user")
        log_to_database("info", "Tweet Scraping Agent stopped by user")
    except Exception as e:
        logger.error(f"Fatal error: {str(e)}")
        log_to_database("error", f"Fatal error: {str(e)}")
        raise
    finally:
        logger.info("Tweet Scraping Agent stopped")
        log_to_database("info", "Tweet Scraping Agent stopped")
