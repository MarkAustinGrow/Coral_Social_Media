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

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Agent name for database logging
AGENT_NAME = "Hot Topic Agent"

# Load environment variables
load_dotenv()

# Use the same waitForAgents=2 as the World News Agent
base_url = "http://localhost:5555/devmode/exampleApplication/privkey/session1/sse"
params = {
    "waitForAgents": 2,  # Same as World News Agent
    "agentId": "hot_topic_agent",
    "agentDescription": "You are hot_topic_agent, responsible for analyzing tweets for engagement and identifying trending topics"
}
query_string = urllib.parse.urlencode(params)
MCP_SERVER_URL = f"{base_url}?{query_string}"

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
        
        log_to_database("info", f"Retrieved {len(tweets)} unprocessed tweets")
        return {
            "result": tweets,
            "count": len(tweets)
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
            log_to_database("warning", f"Skipped updating engagement metrics due to invalid topic: {main_topic}")
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
            
            log_to_database("info", f"Updated existing topic '{main_topic}' with new engagement score {new_score}")
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
            
            log_to_database("info", f"Inserted new topic '{main_topic}' with engagement score {engagement_score}")
            return {
                "result": f"Inserted new topic '{main_topic}' with engagement score {engagement_score}",
                "topic": main_topic,
                "engagement_score": engagement_score
            }
        
    except Exception as e:
        logger.error(f"Error updating engagement metrics: {str(e)}")
        log_to_database("error", f"Error updating engagement metrics: {str(e)}")
        return {
            "error": f"Failed to update engagement metrics: {str(e)}"
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
        log_to_database("info", f"Hot Topic Agent started and connected to MCP server")
        
        # Define agent-specific tools (simplified)
        agent_tools = [
            get_unprocessed_tweets,
            analyze_tweet_for_topics,
            update_engagement_metrics
        ]
        
        # Combine Coral tools with agent-specific tools
        tools = client.get_tools() + agent_tools
        
        # Create and run the agent
        agent_executor = await create_hot_topic_agent(client, tools, agent_tools)
        
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
    logger.info("Hot Topic Agent (Simple) started")
    log_to_database("info", "Hot Topic Agent (Simple) started")
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Hot Topic Agent stopped by user")
        log_to_database("info", "Hot Topic Agent stopped by user")
    except Exception as e:
        logger.error(f"Fatal error: {str(e)}")
        log_to_database("error", f"Fatal error: {str(e)}")
        raise
    finally:
        logger.info("Hot Topic Agent stopped")
        log_to_database("info", "Hot Topic Agent stopped")
