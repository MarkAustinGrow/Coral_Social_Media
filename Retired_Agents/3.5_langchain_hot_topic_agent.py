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
import requests
from datetime import datetime, timedelta

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
    "agentId": "hot_topic_agent",
    "agentDescription": "You are hot_topic_agent, responsible for analyzing tweets for engagement and identifying trending topics"
}
query_string = urllib.parse.urlencode(params)
MCP_SERVER_URL = f"{base_url}?{query_string}"

# Connection retry settings
MAX_RETRIES = 5
INITIAL_RETRY_DELAY = 2  # seconds
MAX_RETRY_DELAY = 30  # seconds

# Internal agent name for MCP
MCP_AGENT_NAME = "hot_topic_agent"

# Initialize API clients
try:
    # Supabase client
    supabase_client = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_KEY")
    )
    
    # Ensure engagement_metrics table exists in Supabase
    try:
        # Check if table exists by attempting to select from it
        supabase_client.table("engagement_metrics").select("id").limit(1).execute()
        logger.info("Supabase table 'engagement_metrics' already exists")
    except Exception as e:
        logger.error(f"Error checking engagement_metrics table: {str(e)}")
        logger.info("Make sure to run the SQL scripts in supabase_schema.sql")
        
except Exception as e:
    logger.error(f"Error initializing API clients: {str(e)}")
    raise

# Validate API keys
if not os.getenv("OPENAI_API_KEY"):
    raise ValueError("OPENAI_API_KEY is not set in environment variables.")
if not os.getenv("ANTHROPIC_API_KEY"):
    raise ValueError("ANTHROPIC_API_KEY is not set in environment variables.")
if not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_KEY"):
    raise ValueError("SUPABASE_URL or SUPABASE_KEY is not set in environment variables.")

# Agent name for status updates - must match exactly what's in the database
AGENT_NAME = "Hot Topic Agent"

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
def get_unprocessed_tweets(limit: int = 5):
    """
    Get unprocessed tweets from the tweets_cache table.
    
    Args:
        limit: Maximum number of tweets to retrieve (default: 5)
        
    Returns:
        Dictionary containing unprocessed tweets
    """
    try:
        # Query for unprocessed tweets, ordered by likes (simpler approach)
        query = supabase_client.table("tweets_cache").select("*").eq("engagement_processed", False)
        
        # Order by likes (we'll calculate the full engagement score after fetching)
        query = query.order("likes", desc=True).limit(limit)
        
        result = query.execute()
        tweets = result.data if result.data else []
        
        return {
            "result": tweets,
            "count": len(tweets)
        }
        
    except Exception as e:
        logger.error(f"Error fetching unprocessed tweets: {str(e)}")
        return {
            "error": f"Failed to fetch unprocessed tweets: {str(e)}",
            "count": 0
        }

@tool
def analyze_tweet_for_topics(tweet_text: str):
    """
    Use Claude to analyze a tweet and extract meaningful topic information.
    
    Args:
        tweet_text: The text of the tweet to analyze
        
    Returns:
        Dictionary containing topic analysis
    """
    try:
        # Use Anthropic's Claude API
        headers = {
            "x-api-key": os.getenv("ANTHROPIC_API_KEY"),
            "content-type": "application/json",
            "anthropic-version": "2023-06-01"
        }
        
        prompt = f"""
        Analyze this tweet and extract the main topic and subtopics.
        
        Tweet: "{tweet_text}"
        
        Provide your analysis in the following JSON format:
        {{
            "main_topic": "A concise phrase (2-4 words) describing the primary topic",
            "topic_description": "A brief 1-2 sentence description of what this topic is about",
            "subtopics": ["Related subtopic 1", "Related subtopic 2"],
            "category": "The general category this falls under (e.g., Politics, Finance, Technology, etc.)"
        }}
        
        Return ONLY the JSON with no additional text.
        """
        
        data = {
            "model": "claude-3-haiku-20240307",  # Using a smaller, faster model for this task
            "max_tokens": 1000,
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }
        
        response = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers=headers,
            json=data
        )
        
        if response.status_code == 200:
            response_data = response.json()
            content = response_data["content"][0]["text"]
            
            # Parse the JSON response
            try:
                topic_data = json.loads(content)
                return topic_data
            except json.JSONDecodeError:
                # If JSON parsing fails, try to extract JSON from the text
                import re
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    topic_data = json.loads(json_match.group(0))
                    return topic_data
                else:
                    logger.error("Could not parse JSON from Claude response")
                    return {
                        "main_topic": "unknown",
                        "topic_description": "Could not extract topic from tweet",
                        "subtopics": [],
                        "category": "uncategorized"
                    }
        else:
            logger.error(f"Claude API error: {response.status_code} - {response.text}")
            return {
                "main_topic": "api_error",
                "topic_description": f"Error calling Claude API: {response.status_code}",
                "subtopics": [],
                "category": "error"
            }
            
    except Exception as e:
        logger.error(f"Error analyzing tweet for topics: {str(e)}")
        return {
            "main_topic": "error",
            "topic_description": f"Error: {str(e)}",
            "subtopics": [],
            "category": "error"
        }

@tool
def calculate_engagement_score(tweet):
    """
    Calculate an engagement score for a tweet based on likes, retweets, and replies.
    
    Args:
        tweet: Tweet object with engagement metrics
        
    Returns:
        Dictionary containing the calculated engagement score
    """
    try:
        # Get engagement metrics
        likes = tweet.get("likes", 0)
        retweets = tweet.get("retweets", 0)
        replies = tweet.get("replies", 0)
        
        # Calculate weighted engagement score
        # Weights: likes=1, retweets=2, replies=3
        engagement_score = likes + (retweets * 2) + (replies * 3)
        
        return {
            "engagement_score": engagement_score,
            "metrics": {
                "likes": likes,
                "retweets": retweets,
                "replies": replies
            }
        }
        
    except Exception as e:
        logger.error(f"Error calculating engagement score: {str(e)}")
        return {
            "error": f"Failed to calculate engagement score: {str(e)}",
            "engagement_score": 0
        }

@tool
def update_engagement_metrics(topic_data, engagement_score):
    """
    Update or insert topic in the engagement_metrics table.
    
    Args:
        topic_data: Dictionary containing topic information
        engagement_score: Engagement score for the topic
        
    Returns:
        Dictionary containing operation result
    """
    try:
        main_topic = topic_data.get("main_topic", "").lower()
        
        if not main_topic or main_topic in ["unknown", "error", "api_error"]:
            return {
                "result": "Skipped updating engagement metrics due to invalid topic",
                "topic": main_topic
            }
        
        # Check if topic already exists
        existing = supabase_client.table("engagement_metrics").select("*").eq("topic", main_topic).execute()
        
        if existing.data and len(existing.data) > 0:
            # Update existing topic
            current_score = existing.data[0].get("engagement_score", 0)
            new_score = current_score + engagement_score
            
            # Update subtopics by merging existing and new
            current_subtopics = existing.data[0].get("subtopics", [])
            new_subtopics = topic_data.get("subtopics", [])
            
            # Combine and deduplicate subtopics
            all_subtopics = list(set(current_subtopics + new_subtopics))
            
            supabase_client.table("engagement_metrics").update({
                "engagement_score": new_score,
                "topic_description": topic_data.get("topic_description"),
                "subtopics": all_subtopics,
                "category": topic_data.get("category"),
                "last_updated": "now()"
            }).eq("topic", main_topic).execute()
            
            return {
                "result": f"Updated existing topic '{main_topic}' with new engagement score {new_score}",
                "topic": main_topic,
                "engagement_score": new_score
            }
        else:
            # Insert new topic
            supabase_client.table("engagement_metrics").insert({
                "topic": main_topic,
                "topic_description": topic_data.get("topic_description"),
                "subtopics": topic_data.get("subtopics", []),
                "category": topic_data.get("category"),
                "engagement_score": engagement_score,
                "last_updated": "now()"
            }).execute()
            
            return {
                "result": f"Inserted new topic '{main_topic}' with engagement score {engagement_score}",
                "topic": main_topic,
                "engagement_score": engagement_score
            }
        
    except Exception as e:
        logger.error(f"Error updating engagement metrics: {str(e)}")
        return {
            "error": f"Failed to update engagement metrics: {str(e)}"
        }

@tool
def mark_tweet_as_processed(tweet_id):
    """
    Mark a tweet as processed for engagement metrics.
    
    Args:
        tweet_id: ID of the tweet to mark as processed
        
    Returns:
        Dictionary containing operation result
    """
    try:
        # Update the tweet in Supabase
        supabase_client.table("tweets_cache").update({
            "engagement_processed": True
        }).eq("tweet_id", tweet_id).execute()
        
        return {
            "result": f"Marked tweet {tweet_id} as processed"
        }
        
    except Exception as e:
        logger.error(f"Error marking tweet as processed: {str(e)}")
        return {
            "error": f"Failed to mark tweet as processed: {str(e)}"
        }

@tool
def process_batch_of_tweets(batch_size: int = 5):
    """
    Process a batch of unprocessed tweets for engagement metrics.
    
    Args:
        batch_size: Number of tweets to process in this batch (default: 5)
        
    Returns:
        Dictionary containing operation results
    """
    try:
        # Get unprocessed tweets
        tweets_response = get_unprocessed_tweets.invoke({"limit": batch_size})
        
        if "error" in tweets_response:
            return tweets_response
            
        tweets = tweets_response.get("result", [])
        
        if not tweets:
            return {
                "result": "No unprocessed tweets found",
                "count": 0
            }
        
        # Process each tweet
        processed_count = 0
        topics_updated = []
        
        for tweet in tweets:
            tweet_id = tweet.get("tweet_id")
            tweet_text = tweet.get("text", "")
            
            # Skip empty tweets
            if not tweet_text:
                continue
                
            try:
                # Analyze tweet for topics
                topic_data = analyze_tweet_for_topics.invoke({"tweet_text": tweet_text})
                
                # Calculate engagement score
                engagement_result = calculate_engagement_score.invoke({"tweet": tweet})
                engagement_score = engagement_result.get("engagement_score", 0)
                
                # Update engagement metrics
                update_result = update_engagement_metrics.invoke({
                    "topic_data": topic_data, 
                    "engagement_score": engagement_score
                })
                
                # Mark tweet as processed
                mark_tweet_as_processed.invoke({"tweet_id": tweet_id})
                
                processed_count += 1
                topics_updated.append({
                    "tweet_id": tweet_id,
                    "main_topic": topic_data.get("main_topic"),
                    "engagement_score": engagement_score
                })
                
            except Exception as e:
                logger.error(f"Error processing tweet {tweet_id}: {str(e)}")
                # Continue with next tweet
        
        return {
            "result": f"Processed {processed_count} tweets",
            "count": processed_count,
            "topics_updated": topics_updated
        }
        
    except Exception as e:
        logger.error(f"Error processing batch of tweets: {str(e)}")
        return {
            "error": f"Failed to process batch of tweets: {str(e)}",
            "count": 0
        }

@tool
def get_top_topics(limit: int = 10, min_score: int = 0, category: str = None):
    """
    Get top topics by engagement score, optionally filtered by category.
    
    Args:
        limit: Maximum number of topics to return (default: 10)
        min_score: Minimum engagement score to include (default: 0)
        category: Optional category to filter by
        
    Returns:
        Dictionary containing top topics
    """
    try:
        # Build query
        query = supabase_client.table("engagement_metrics").select("*")
        
        if min_score > 0:
            query = query.gte("engagement_score", min_score)
            
        if category:
            query = query.eq("category", category)
            
        query = query.order("engagement_score", desc=True).limit(limit)
        
        result = query.execute()
        topics = result.data if result.data else []
        
        return {
            "result": topics,
            "count": len(topics)
        }
        
    except Exception as e:
        logger.error(f"Error fetching top topics: {str(e)}")
        return {
            "error": f"Failed to fetch top topics: {str(e)}",
            "count": 0
        }

@tool
def notify_blog_writing_agent(topic_data):
    """
    Notify the blog writing agent about a hot topic that might be worth writing about.
    
    Args:
        topic_data: Dictionary containing topic information
        
    Returns:
        Dictionary containing operation result
    """
    try:
        # This would use the Coral Protocol to send a message to the blog writing agent
        # For now, we'll just log the notification
        topic_name = topic_data.get('main_topic') if 'main_topic' in topic_data else topic_data.get('topic')
        logger.info(f"Would notify blog writing agent about hot topic: {topic_name}")
        
        return {
            "result": f"Notified blog writing agent about hot topic: {topic_name}"
        }
        
    except Exception as e:
        logger.error(f"Error notifying blog writing agent: {str(e)}")
        return {
            "error": f"Failed to notify blog writing agent: {str(e)}"
        }

async def create_hot_topic_agent(client, tools, agent_tools):
    tools_description = get_tools_description(tools)
    agent_tools_description = get_tools_description(agent_tools)
    
    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            f"""You are hot_topic_agent, responsible for analyzing tweets for engagement and identifying trending topics.
            
            Follow these steps in order:
            1. Call wait_for_mentions from coral tools (timeoutMs: 8000) to receive instructions from other agents
            2. If you receive a mention:
               a. Process the instruction (e.g., analyze specific tweets, get top topics)
               b. Execute the requested operation using your tools
               c. Send a response back to the sender with the results
            3. If no mentions are received (timeout):
               a. Process a batch of unprocessed tweets using process_batch_of_tweets
               b. Get the top topics using get_top_topics
               c. If there are any high-engagement topics (score > 1000), notify the blog writing agent
            4. Wait for 5 minutes before processing the next batch
            
            Your goal is to identify trending topics based on tweet engagement and maintain an up-to-date
            engagement_metrics table that other agents can use.
            
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
    attempt = 0
    while True:
        try:
            # Calculate exponential backoff delay if this is a retry
            if attempt > 0:
                delay = min(INITIAL_RETRY_DELAY * (2 ** (attempt - 1)), MAX_RETRY_DELAY)
                logger.info(f"Retry attempt {attempt} of {MAX_RETRIES}, waiting {delay} seconds...")
                await asyncio.sleep(delay)
                
            # Check if we've exceeded max retries
            if attempt >= MAX_RETRIES:
                logger.error(f"Maximum retry attempts ({MAX_RETRIES}) reached. Exiting.")
                asu.report_error(AGENT_NAME, f"Maximum retry attempts ({MAX_RETRIES}) reached")
                return
                
            # Increment attempt counter
            attempt += 1
            
            # Update agent status to show reconnection attempt
            if attempt > 1:
                asu.update_agent_status(
                    AGENT_NAME, 
                    "reconnecting", 
                    50, 
                    f"Reconnection attempt {attempt} of {MAX_RETRIES}"
                )
            
            # Connect to MCP server with reduced timeouts
            async with MultiServerMCPClient(
                connections={
                    "coral": {
                        "transport": "sse",
                        "url": MCP_SERVER_URL,
                        "timeout": 60,  # Reduced from 300
                        "sse_read_timeout": 60,  # Reduced from 300
                    }
                }
            ) as client:
                logger.info(f"Connected to MCP server at {MCP_SERVER_URL}")
                
                # Reset attempt counter on successful connection
                attempt = 0
                
                # Update agent status to show running
                asu.update_agent_status(AGENT_NAME, "running", 100, "Connected to MCP server")
                
                # Define agent-specific tools
                agent_tools = [
                    get_unprocessed_tweets,
                    analyze_tweet_for_topics,
                    calculate_engagement_score,
                    update_engagement_metrics,
                    mark_tweet_as_processed,
                    process_batch_of_tweets,
                    get_top_topics,
                    notify_blog_writing_agent
                ]
                
                # Combine Coral tools with agent-specific tools
                tools = client.get_tools() + agent_tools
                
                # Create and run the agent
                agent_executor = await create_hot_topic_agent(client, tools, agent_tools)
                
                # Inner loop for agent invocations
                while True:
                    try:
                        # Send heartbeat to indicate agent is still running
                        asu.send_heartbeat(AGENT_NAME)
                        
                        logger.info("Starting new agent invocation")
                        await agent_executor.ainvoke({"agent_scratchpad": []})
                        logger.info("Completed agent invocation, waiting 5 minutes before next batch")
                        
                        # Send heartbeat before long sleep
                        asu.send_heartbeat(AGENT_NAME)
                        asu.update_agent_status(AGENT_NAME, "waiting", 100, "Waiting for next batch processing cycle")
                        
                        # Wait 5 minutes between processing batches, with periodic heartbeats
                        for _ in range(30):  # 30 * 10 seconds = 5 minutes
                            await asyncio.sleep(10)
                            asu.send_heartbeat(AGENT_NAME)
                        
                        # Update status back to running
                        asu.update_agent_status(AGENT_NAME, "running", 100, "Processing next batch")
                        
                    except ClosedResourceError as e:
                        # Connection closed, break inner loop to reconnect
                        logger.error(f"Connection closed: {str(e)}")
                        asu.report_warning(AGENT_NAME, f"Connection closed: {str(e)}", 50)
                        break
                        
                    except Exception as e:
                        # Other errors, log and continue
                        logger.error(f"Error in agent loop: {str(e)}")
                        asu.report_warning(AGENT_NAME, f"Error in agent loop: {str(e)}", 75)
                        await asyncio.sleep(5)
                
        except ClosedResourceError as e:
            # Connection error, will retry with exponential backoff
            logger.error(f"ClosedResourceError on attempt {attempt}: {e}")
            asu.report_warning(AGENT_NAME, f"Connection error: {str(e)}", 25)
            
        except Exception as e:
            # Unexpected error, will retry with exponential backoff
            logger.error(f"Unexpected error on attempt {attempt}: {e}")
            asu.report_warning(AGENT_NAME, f"Unexpected error: {str(e)}", 25)

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
