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
import agent_multiuser_utils_simple as amu

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Agent name for database logging
AGENT_NAME = "Hot Topic Agent"

# Load environment variables
load_dotenv()

# Get user context for user-specific MCP server
user_id = amu.get_user_context()

# Use centralized multi-user Coral server
base_url = "http://coral.8interns.com/devmode/exampleApplication/privkey/session1/sse"
params = {
    "waitForAgents": 2,
    "agentId": f"hot_topic_agent_{user_id}",
    "agentDescription": f"You are hot_topic_agent for user {user_id}, responsible for analyzing tweets for engagement and identifying trending topics"
}
query_string = urllib.parse.urlencode(params)
MCP_SERVER_URL = f"{base_url}?{query_string}"

print(f"🔗 Using centralized MCP server: {MCP_SERVER_URL}")

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

def get_tools_description(tools):
    return "\n".join(
        f"Tool: {tool.name}, Schema: {json.dumps(tool.args).replace('{', '{{').replace('}', '}}')}"
        for tool in tools
    )

@tool
def get_unprocessed_tweets(limit: int = 5):
    """
    Get unprocessed tweets from the tweets_cache table for the current user.
    
    Args:
        limit: Maximum number of tweets to retrieve (default: 5)
        
    Returns:
        Dictionary containing unprocessed tweets
    """
    try:
        # Get user context - CRITICAL for multiuser support
        user_id = amu.get_user_context()
        
        if not user_id:
            logger.error("No user context available for tweet processing")
            log_to_database("error", "No user context available for tweet processing")
            return {
                "error": "No user context available for tweet processing",
                "count": 0
            }
        
        # Query for unprocessed tweets with user_id filtering
        query = supabase_client.table("tweets_cache").select("*").eq("engagement_processed", False).eq("user_id", user_id)
        
        # Order by likes (we'll calculate the full engagement score after fetching)
        query = query.order("likes", desc=True).limit(limit)
        
        result = query.execute()
        tweets = result.data if result.data else []
        
        log_to_database("info", f"Retrieved {len(tweets)} unprocessed tweets for user {user_id}")
        return {
            "result": tweets,
            "count": len(tweets),
            "user_id": user_id
        }
        
    except Exception as e:
        logger.error(f"Error fetching unprocessed tweets: {str(e)}")
        log_to_database("error", f"Error fetching unprocessed tweets: {str(e)}")
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
        log_to_database("info", f"Analyzing tweet for topics: {tweet_text[:50]}...")
        
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
                log_to_database("info", f"Successfully extracted topic: {topic_data.get('main_topic')}", topic_data)
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
            log_to_database("error", f"Claude API error: {response.status_code}")
            return {
                "main_topic": "api_error",
                "topic_description": f"Error calling Claude API: {response.status_code}",
                "subtopics": [],
                "category": "error"
            }
            
    except Exception as e:
        logger.error(f"Error analyzing tweet for topics: {str(e)}")
        log_to_database("error", f"Error analyzing tweet for topics: {str(e)}")
        return {
            "main_topic": "error",
            "topic_description": f"Error: {str(e)}",
            "subtopics": [],
            "category": "error"
        }

@tool
def update_engagement_metrics(topic_data, engagement_score):
    """
    Update or insert topic in the engagement_metrics table with user context.
    
    Args:
        topic_data: Dictionary containing topic information
        engagement_score: Engagement score for the topic
        
    Returns:
        Dictionary containing operation result
    """
    try:
        # Get user context - CRITICAL for multiuser support
        user_id = amu.get_user_context()
        
        if not user_id:
            logger.error("No user context available for engagement metrics")
            log_to_database("error", "No user context available for engagement metrics")
            return {
                "error": "No user context available for engagement metrics"
            }
        
        main_topic = topic_data.get("main_topic", "").lower()
        
        if not main_topic or main_topic in ["unknown", "error", "api_error"]:
            log_to_database("warning", f"Skipped updating engagement metrics due to invalid topic: {main_topic}")
            return {
                "result": "Skipped updating engagement metrics due to invalid topic",
                "topic": main_topic,
                "user_id": user_id
            }
        
        # Check if topic already exists for this user
        existing = supabase_client.table("engagement_metrics").select("*").eq("topic", main_topic).eq("user_id", user_id).execute()
        
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
            }).eq("topic", main_topic).eq("user_id", user_id).execute()
            
            log_to_database("info", f"Updated existing topic '{main_topic}' with new engagement score {new_score} for user {user_id}")
            return {
                "result": f"Updated existing topic '{main_topic}' with new engagement score {new_score}",
                "topic": main_topic,
                "engagement_score": new_score,
                "user_id": user_id
            }
        else:
            # Insert new topic with user_id
            supabase_client.table("engagement_metrics").insert({
                "topic": main_topic,
                "topic_description": topic_data.get("topic_description"),
                "subtopics": topic_data.get("subtopics", []),
                "category": topic_data.get("category"),
                "engagement_score": engagement_score,
                "user_id": user_id,  # CRITICAL: Associate with user
                "last_updated": "now()"
            }).execute()
            
            log_to_database("info", f"Inserted new topic '{main_topic}' with engagement score {engagement_score} for user {user_id}")
            return {
                "result": f"Inserted new topic '{main_topic}' with engagement score {engagement_score}",
                "topic": main_topic,
                "engagement_score": engagement_score,
                "user_id": user_id
            }
        
    except Exception as e:
        logger.error(f"Error updating engagement metrics: {str(e)}")
        log_to_database("error", f"Error updating engagement metrics: {str(e)}")
        return {
            "error": f"Failed to update engagement metrics: {str(e)}"
        }

@tool
def mark_tweets_as_processed(tweet_ids: list):
    """
    Mark tweets as engagement processed in Supabase with user context.
    
    Args:
        tweet_ids: List of tweet IDs to mark as processed
        
    Returns:
        Dictionary containing operation result
    """
    try:
        # Get user context - CRITICAL for multiuser support
        user_id = amu.get_user_context()
        
        if not user_id:
            logger.error("No user context available for marking tweets as processed")
            log_to_database("error", "No user context available for marking tweets as processed")
            return {
                "error": "No user context available for marking tweets as processed",
                "count": 0
            }
        
        # Update tweets in Supabase with user_id filtering
        for tweet_id in tweet_ids:
            # Check if the ID is numeric (database ID) or a string (tweet_id)
            if isinstance(tweet_id, int) or (isinstance(tweet_id, str) and tweet_id.isdigit()):
                # It's a database ID, use the 'id' column
                supabase_client.table("tweets_cache").update(
                    {"engagement_processed": True}
                ).eq("id", tweet_id).eq("user_id", user_id).execute()
                logger.info(f"Marked tweet with database ID {tweet_id} as processed for user {user_id}")
            else:
                # It's a tweet_id, use the 'tweet_id' column
                supabase_client.table("tweets_cache").update(
                    {"engagement_processed": True}
                ).eq("tweet_id", tweet_id).eq("user_id", user_id).execute()
                logger.info(f"Marked tweet with tweet_id {tweet_id} as processed for user {user_id}")
        
        log_to_database("info", f"Marked {len(tweet_ids)} tweets as processed for user {user_id}", {"tweet_ids": tweet_ids})
        return {
            "result": f"Marked {len(tweet_ids)} tweets as processed for user {user_id}",
            "count": len(tweet_ids),
            "user_id": user_id
        }
        
    except Exception as e:
        logger.error(f"Error marking tweets as processed: {str(e)}")
        log_to_database("error", f"Error marking tweets as processed: {str(e)}")
        return {
            "error": f"Failed to mark tweets as processed: {str(e)}",
            "count": 0
        }

async def create_hot_topic_agent(client, tools, agent_tools):
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
            1. Get unprocessed tweets using get_unprocessed_tweets (limit=5)
            2. For each tweet:
               a. Calculate engagement score (likes + retweets*2 + replies)
               b. Analyze the tweet for topics using analyze_tweet_for_topics
               c. Update engagement metrics using update_engagement_metrics
               d. Mark the tweet as processed using mark_tweets_as_processed
            3. Wait for 10 minutes before processing the next batch
            
            Your goal is to identify trending topics and track engagement metrics for the current user's tweets.
            
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
                "headers": {"X-User-ID": user_id},  # CRITICAL: User isolation header
                "timeout": 300,
                "sse_read_timeout": 300,
            }
        }
    )
    
    logger.info(f"Connected to MCP server at {MCP_SERVER_URL}")
    log_to_database("info", f"Hot Topic Agent started and connected to MCP server")
    
    # Define agent-specific tools
    agent_tools = [
        get_unprocessed_tweets,
        analyze_tweet_for_topics,
        update_engagement_metrics,
        mark_tweets_as_processed
    ]
    
    # Get Coral tools using the new pattern
    coral_tools = client.get_tools()
    
    # Combine Coral tools with agent-specific tools
    tools = coral_tools + agent_tools
    
    # Create the agent executor (but don't invoke it continuously)
    agent_executor = await create_hot_topic_agent(client, tools, agent_tools)
    
    # OPTIMIZED MAIN LOOP - Only call OpenAI when there's actual work to do
    last_processing_time = 0
    processing_interval = 600  # 10 minutes between processing batches
    
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
                        # No mentions received, check if it's time for scheduled processing
                        logger.info("No mentions received, checking scheduled processing...")
                        
                        current_time = time.time()
                        time_since_last_processing = current_time - last_processing_time
                        
                        if time_since_last_processing >= processing_interval:
                            # Time for scheduled processing - check if we have unprocessed tweets
                            try:
                                tweets_result = get_unprocessed_tweets.invoke({"limit": 1})
                                if tweets_result.get("count", 0) > 0:
                                    # We have unprocessed tweets - NOW invoke OpenAI for processing
                                    logger.info("Time for scheduled tweet processing, processing with OpenAI...")
                                    log_to_database("info", "Time for scheduled tweet processing, invoking agent executor")
                                    
                                    await agent_executor.ainvoke({
                                        "agent_scratchpad": [],
                                        "scheduled_task": "tweet_processing"  # Indicate this is scheduled work
                                    })
                                    
                                    last_processing_time = current_time
                                    logger.info("Completed scheduled tweet processing")
                                    log_to_database("info", "Completed scheduled tweet processing")
                                else:
                                    logger.info("No unprocessed tweets available for processing")
                                    await asyncio.sleep(300)  # Wait 5 minutes before checking again
                            except Exception as processing_error:
                                logger.error(f"Error checking unprocessed tweets: {str(processing_error)}")
                                await asyncio.sleep(60)
                        else:
                            # Not time yet, just continue waiting (no OpenAI call)
                            time_remaining = processing_interval - time_since_last_processing
                            logger.info(f"Not time for processing yet, {time_remaining:.0f}s remaining...")
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

if __name__ == "__main__":
    # Mark agent as started (use both old and new for compatibility)
    asu.mark_agent_started(AGENT_NAME)
    amu.mark_agent_started_with_user(AGENT_NAME)
    log_to_database("info", "Hot Topic Agent started")
    
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
