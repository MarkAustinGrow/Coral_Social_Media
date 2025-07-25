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
from langchain_openai import OpenAIEmbeddings
from supabase import create_client, Client
from qdrant_client import QdrantClient
from qdrant_client.http import models
from dotenv import load_dotenv
from anyio import ClosedResourceError
import urllib.parse
import requests
from datetime import datetime

import signal
import sys
import atexit
import agent_status_updater as asu
import agent_multiuser_utils_simple as amu

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Agent name for database logging
AGENT_NAME = "Blog Writing Agent"

# Load environment variables
load_dotenv()

# Get user context for user-specific MCP server
user_id = amu.get_user_context()

# Use centralized multi-user Coral server
base_url = "http://coral.8interns.com/devmode/exampleApplication/privkey/session1/sse"
params = {
    "waitForAgents": 7,  # Total number of agents in the system
    "agentId": f"blog_writing_agent_{user_id}",
    "agentDescription": f"You are blog_writing_agent for user {user_id}, responsible for creating blog content based on research and insights from tweets based on instructions from other agents"
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
    
    # Qdrant client
    qdrant_client = QdrantClient(
        url=os.getenv("QDRANT_URL", "http://localhost:6333"),
        api_key=os.getenv("QDRANT_API_KEY", ""),
        https=False  # Set to True in production with proper certificates
    )
    
    # Initialize OpenAI embeddings
    embeddings = OpenAIEmbeddings(
        api_key=os.getenv("OPENAI_API_KEY")
    )
    
    # Ensure blog_posts table exists in Supabase
    try:
        # Check if table exists by attempting to select from it
        supabase_client.table("blog_posts").select("id").limit(1).execute()
        logger.info("Supabase table 'blog_posts' already exists")
    except Exception as e:
        logger.error(f"Error checking blog_posts table: {str(e)}")
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
def fetch_persona():
    """
    Fetch the current persona from Supabase for the current user.
    
    Returns:
        Dictionary containing persona details or default values if not found
    """
    try:
        # Get user context - CRITICAL for multiuser support
        user_id = amu.get_user_context()
        
        if not user_id:
            logger.warning("No user context available for persona fetching, using default")
            log_to_database("warning", "No user context available for persona fetching, using default")
            # Return default persona if no user context
            default_persona = {
                "name": "Content Creator",
                "description": "A creative and engaging content creator who produces high-quality blog posts with a focus on clarity and reader engagement.",
                "tone": 60,  # Balanced
                "humor": 40,  # Slightly serious
                "enthusiasm": 70,  # Enthusiastic
                "assertiveness": 70  # Confident
            }
            return {
                "result": default_persona
            }
        
        logger.info(f"Fetching persona from Supabase for user {user_id}")
        log_to_database("info", f"Fetching persona from Supabase for user {user_id}")
        
        # Fetch persona from Supabase with user_id filtering
        query = supabase_client.table("personas").select("*").eq("user_id", user_id).limit(1)
        
        result = query.execute()
        
        if result.data and len(result.data) > 0:
            persona = result.data[0]
            logger.info(f"Found persona: {persona.get('name')} for user {user_id}")
            log_to_database("info", f"Found persona: {persona.get('name')} for user {user_id}")
            return {
                "result": persona
            }
        else:
            # Return default persona values
            logger.info(f"No persona found for user {user_id}, using default values")
            log_to_database("info", f"No persona found for user {user_id}, using default values")
            default_persona = {
                "name": "Content Creator",
                "description": "A creative and engaging content creator who produces high-quality blog posts with a focus on clarity and reader engagement.",
                "tone": 60,  # Balanced
                "humor": 40,  # Slightly serious
                "enthusiasm": 70,  # Enthusiastic
                "assertiveness": 70  # Confident
            }
            return {
                "result": default_persona
            }
        
    except Exception as e:
        logger.error(f"Error fetching persona from Supabase: {str(e)}")
        log_to_database("error", f"Error fetching persona from Supabase: {str(e)}")
        # Return default persona values on error
        default_persona = {
            "name": "Content Creator",
            "description": "A creative and engaging content creator who produces high-quality blog posts with a focus on clarity and reader engagement.",
            "tone": 60,  # Balanced
            "humor": 40,  # Slightly serious
            "enthusiasm": 70,  # Enthusiastic
            "assertiveness": 70  # Confident
        }
        return {
            "error": f"Failed to fetch persona: {str(e)}",
            "result": default_persona
        }

@tool
def get_engagement_metrics(limit: int = 20):
    """
    Get engagement metrics from Supabase to determine popular topics for the current user.
    
    Args:
        limit: Maximum number of topics to return (default: 20)
        
    Returns:
        Dictionary containing engagement metrics for different topics
    """
    try:
        # Get user context - CRITICAL for multiuser support
        user_id = amu.get_user_context()
        
        if not user_id:
            logger.error("No user context available for engagement metrics")
            log_to_database("error", "No user context available for engagement metrics")
            return {
                "error": "No user context available for engagement metrics",
                "count": 0,
                "result": []
            }
        
        log_to_database("info", f"Fetching top {limit} engagement metrics for user {user_id}")
        
        # Query the engagement_metrics table in Supabase with user_id filtering
        result = supabase_client.table("engagement_metrics").select("*").eq("user_id", user_id).order("engagement_score", desc=True).limit(limit).execute()
        
        metrics = result.data if result.data else []
        
        log_to_database("info", f"Retrieved {len(metrics)} engagement metrics for user {user_id}")
        return {
            "result": metrics,
            "count": len(metrics),
            "user_id": user_id
        }
        
    except Exception as e:
        logger.error(f"Error fetching engagement metrics: {str(e)}")
        log_to_database("error", f"Error fetching engagement metrics: {str(e)}")
        return {
            "error": f"Failed to fetch engagement metrics: {str(e)}",
            "count": 0,
            "result": []
        }

@tool
def select_next_topic(limit: int = 20):
    """
    Select the next topic to write about using a rotation system for the current user.
    
    This function implements topic rotation by:
    1. Getting the top N topics by engagement score for the current user
    2. Ordering them by last_used_at (NULL first, then oldest to newest)
    3. Returning the topic with the oldest or NULL last_used_at
    
    Args:
        limit: Maximum number of top topics to consider (default: 20)
        
    Returns:
        Dictionary containing the selected topic
    """
    try:
        # Get user context - CRITICAL for multiuser support
        user_id = amu.get_user_context()
        
        if not user_id:
            logger.error("No user context available for topic selection")
            log_to_database("error", "No user context available for topic selection")
            return {
                "error": "No user context available for topic selection",
                "result": None
            }
        
        log_to_database("info", f"Selecting next topic from top {limit} topics for user {user_id}")
        
        # Get the top N topics by engagement score for the current user
        metrics_response = get_engagement_metrics.invoke({"limit": limit})
        top_topics = metrics_response.get("result", [])
        
        if not top_topics:
            logger.error(f"No topics found in engagement metrics for user {user_id}")
            return {
                "error": f"No topics found in engagement metrics for user {user_id}",
                "result": None
            }
        
        # Sort topics by last_used_at (NULL first, then oldest to newest)
        never_used_topics = [t for t in top_topics if t.get("last_used_at") is None]
        used_topics = [t for t in top_topics if t.get("last_used_at") is not None]
        
        # Sort used topics by last_used_at (oldest first)
        used_topics.sort(key=lambda t: t.get("last_used_at", ""))
        
        # Combine the lists (never used topics first, then oldest used topics)
        sorted_topics = never_used_topics + used_topics
        
        # Select the first topic (either never used or oldest used)
        selected_topic = sorted_topics[0] if sorted_topics else None
        
        if selected_topic:
            logger.info(f"Selected topic for rotation: {selected_topic.get('topic')} (Engagement: {selected_topic.get('engagement_score')}, Last used: {selected_topic.get('last_used_at')}) for user {user_id}")
            log_to_database("info", f"Selected topic for rotation: {selected_topic.get('topic')} for user {user_id}", {"topic": selected_topic.get('topic'), "engagement_score": selected_topic.get('engagement_score')})
            return {
                "result": selected_topic
            }
        else:
            logger.error(f"No topic selected from rotation for user {user_id}")
            log_to_database("error", f"No topic selected from rotation for user {user_id}")
            return {
                "error": f"No topic selected from rotation for user {user_id}",
                "result": None
            }
        
    except Exception as e:
        logger.error(f"Error selecting next topic: {str(e)}")
        log_to_database("error", f"Error selecting next topic: {str(e)}")
        return {
            "error": f"Failed to select next topic: {str(e)}",
            "result": None
        }

@tool
def update_topic_usage(topic: str):
    """
    Update the last_used_at timestamp for a topic for the current user.
    
    Args:
        topic: The topic name to update
        
    Returns:
        Dictionary containing the operation result
    """
    try:
        # Get user context - CRITICAL for multiuser support
        user_id = amu.get_user_context()
        
        if not user_id:
            logger.error("No user context available for topic usage update")
            log_to_database("error", "No user context available for topic usage update")
            return {
                "error": "No user context available for topic usage update",
                "topic": topic
            }
        
        log_to_database("info", f"Updating last_used_at for topic: {topic} for user {user_id}")
        
        # Get current timestamp
        current_time = datetime.now().isoformat()
        
        # Update the last_used_at timestamp for the topic with user_id filtering
        result = supabase_client.table("engagement_metrics").update({"last_used_at": current_time}).eq("topic", topic).eq("user_id", user_id).execute()
        
        if result.data and len(result.data) > 0:
            logger.info(f"Updated last_used_at for topic '{topic}' to {current_time} for user {user_id}")
            log_to_database("info", f"Updated last_used_at for topic '{topic}' for user {user_id}", {"topic": topic, "timestamp": current_time})
            return {
                "result": f"Updated last_used_at for topic '{topic}' for user {user_id}",
                "topic": topic,
                "timestamp": current_time,
                "user_id": user_id
            }
        else:
            logger.warning(f"No topic found with name '{topic}' for user {user_id} to update last_used_at")
            log_to_database("warning", f"No topic found with name '{topic}' for user {user_id} to update last_used_at")
            return {
                "warning": f"No topic found with name '{topic}' for user {user_id} to update last_used_at",
                "topic": topic,
                "user_id": user_id
            }
        
    except Exception as e:
        logger.error(f"Error updating topic usage: {str(e)}")
        log_to_database("error", f"Error updating topic usage: {str(e)}")
        return {
            "error": f"Failed to update topic usage: {str(e)}",
            "topic": topic
        }

@tool
def search_tweet_insights(query: str, limit: int = 10):
    """
    Search for tweet insights in Qdrant based on a query with user context.
    
    Args:
        query: Search query
        limit: Maximum number of results to return (default: 10)
        
    Returns:
        Dictionary containing search results
    """
    try:
        # Get user context - CRITICAL for multiuser support
        user_id = amu.get_user_context()
        
        if not user_id:
            logger.error("No user context available for tweet insights search")
            log_to_database("error", "No user context available for tweet insights search")
            return {
                "error": "No user context available for tweet insights search",
                "count": 0,
                "result": []
            }
        
        log_to_database("info", f"Searching tweet insights for: {query} for user {user_id}")
        
        # Generate embedding for the query
        query_embedding = embeddings.embed_query(query)
        
        # Create user-specific collection name (same as memory interface)
        import hashlib
        user_hash = hashlib.md5(user_id.encode()).hexdigest()[:8]
        user_collection_name = f"research_{user_hash}"
        
        # Search in user-specific Qdrant collection
        search_results = qdrant_client.search(
            collection_name=user_collection_name,
            query_vector=query_embedding,
            limit=limit
        )
        
        # Extract results
        results = []
        for result in search_results:
            results.append({
                "tweet_id": result.payload.get("tweet_id"),
                "tweet_text": result.payload.get("content", result.payload.get("tweet_text", "")),
                "analysis": result.payload.get("alignment_explanation", result.payload.get("analysis", "")),
                "score": result.score,
                "user_id": result.payload.get("user_id")
            })
        
        log_to_database("info", f"Found {len(results)} tweet insights for query: {query} for user {user_id}")
        return {
            "result": results,
            "count": len(results),
            "user_id": user_id
        }
        
    except Exception as e:
        logger.error(f"Error searching tweet insights: {str(e)}")
        log_to_database("error", f"Error searching tweet insights: {str(e)}")
        return {
            "error": f"Failed to search tweet insights: {str(e)}",
            "count": 0,
            "result": []
        }

@tool
def get_recent_blog_posts(limit: int = 5):
    """
    Get recent blog posts from Supabase for the current user.
    
    Args:
        limit: Maximum number of blog posts to return (default: 5)
        
    Returns:
        Dictionary containing recent blog posts
    """
    try:
        # Get user context - CRITICAL for multiuser support
        user_id = amu.get_user_context()
        
        if not user_id:
            logger.error("No user context available for blog posts")
            log_to_database("error", "No user context available for blog posts")
            return {
                "error": "No user context available for blog posts",
                "count": 0,
                "result": []
            }
        
        log_to_database("info", f"Fetching {limit} recent blog posts for user {user_id}")
        
        # Query the blog_posts table in Supabase with user_id filtering
        result = supabase_client.table("blog_posts").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
        
        posts = result.data if result.data else []
        
        log_to_database("info", f"Retrieved {len(posts)} recent blog posts for user {user_id}")
        return {
            "result": posts,
            "count": len(posts),
            "user_id": user_id
        }
        
    except Exception as e:
        logger.error(f"Error fetching recent blog posts: {str(e)}")
        log_to_database("error", f"Error fetching recent blog posts: {str(e)}")
        return {
            "error": f"Failed to fetch recent blog posts: {str(e)}",
            "count": 0,
            "result": []
        }

@tool
def save_blog_post(blog_post: dict, topic_name: str = None, status: str = "pending_fact_check"):
    """
    Save a blog post to Supabase with user context.
    
    Args:
        blog_post: Dictionary containing blog post details
        topic_name: The topic name this blog post is about (for updating last_used_at)
        status: Status of the blog post (draft, pending_fact_check, approved, rejected)
        
    Returns:
        Dictionary containing operation result
    """
    try:
        # Get user context - CRITICAL for multiuser support
        user_id = amu.get_user_context()
        
        if not user_id:
            logger.error("No user context available for saving blog post")
            log_to_database("error", "No user context available for saving blog post")
            return {
                "error": "No user context available for saving blog post"
            }
        
        log_to_database("info", f"Saving blog post: {blog_post.get('title')} for user {user_id}", {"status": status})
        
        # Prepare blog post data with user_id
        blog_data = {
            "title": blog_post.get("title", ""),
            "content": blog_post.get("content", ""),
            "word_count": blog_post.get("word_count", 0),
            "status": "draft",  # Use status field for consistency with API
            "review_status": status,  # Keep review_status for internal tracking
            "user_id": user_id,  # CRITICAL: Associate with user
            "created_at": blog_post.get("created_at", datetime.now().isoformat())
        }
        
        # Insert into Supabase
        result = supabase_client.table("blog_posts").insert(blog_data).execute()
        blog_id = result.data[0].get("id") if result.data else None
        
        # Update the last_used_at timestamp for the topic if provided
        if topic_name:
            update_result = update_topic_usage.invoke({"topic": topic_name})
            if "error" in update_result:
                logger.warning(f"Failed to update last_used_at for topic '{topic_name}': {update_result.get('error')}")
        
        log_to_database("info", f"Successfully saved blog post with ID: {blog_id} for user {user_id}")
        return {
            "result": f"Blog post saved successfully for user {user_id}",
            "blog_id": blog_id,
            "topic_updated": topic_name is not None,
            "user_id": user_id
        }
        
    except Exception as e:
        logger.error(f"Error saving blog post: {str(e)}")
        log_to_database("error", f"Error saving blog post: {str(e)}")
        return {
            "error": f"Failed to save blog post: {str(e)}"
        }

async def create_blog_writing_agent(client, tools, agent_tools):
    tools_description = get_tools_description(tools)
    agent_tools_description = get_tools_description(agent_tools)
    
    # Get user context for user-specific prompt
    user_id = amu.get_user_context()
    
    # Coral Protocol version - listens for mentions instead of autonomous execution
    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            f"""You are a Blog Writing Agent operating in CORAL PROTOCOL mode for user {user_id}.
            
            IMPORTANT: You are operating in MULTI-USER mode. Each user has their own blog posts and engagement data.
            You will only create blog content for the current user's data.
            
            CORAL PROTOCOL BEHAVIOR:
            You listen for instructions from other agents and respond via the Coral Protocol.
            
            Follow these steps in order:
            1. Call `wait_for_mentions` from coral tools (timeoutMs: 30000) to receive mentions from other agents.
            2. When you receive a mention, keep the thread ID and the sender ID.
            3. Parse the instruction in the message content. Look for requests like:
               - "write blog post"
               - "create blog content"
               - "generate blog about [topic]"
               - "write article on [subject]"
               - "create content for blog"
            4. Based on the instruction, use your tools to:
               a. Fetch the current persona using `fetch_persona`
               b. Get engagement metrics using `get_engagement_metrics`
               c. Select appropriate topic using `select_next_topic` (if no specific topic requested)
               d. Search for related tweet insights using `search_tweet_insights`
               e. Generate and write the blog post content
               f. Save the blog post using `save_blog_post` with status "pending_fact_check"
               g. Update the topic's usage timestamp using `update_topic_usage`
            5. Prepare a response with the results (blog title, word count, topic used, etc.)
            6. Use `send_message` from coral tools to send your response back to the sender in the same thread.
            7. Always respond back to the sender agent, even if there's an error.
            8. Wait for 2 seconds and repeat the process from step 1.
            
            If no mentions are received (timeout), simply continue waiting - do NOT perform autonomous actions.
            
            RESPONSE FORMAT:
            Always format your responses clearly:
            - Success: "Created blog post: '[Title]' (X words) on topic: [topic]. Saved for fact-checking."
            - Error: "Unable to create blog post: [reason]. Please check data availability or try again later."
            - No data: "No engagement metrics or topics available for blog creation. Please ensure data is available."
            
            BLOG WRITING FOCUS:
            When creating blog posts for the current user, focus on:
            - Creating engaging, informative content
            - Incorporating insights from tweet research for the current user
            - Optimizing for SEO and readability
            - Maintaining a consistent brand voice based on persona
            - Using the topic rotation system for diversity
            - Ensuring all content is user-specific and isolated
            - Writing comprehensive, well-structured articles
            - Including relevant examples and data points
            
            TOPIC ROTATION SYSTEM:
            - Use a topic rotation system to ensure diversity in blog content for the current user
            - The system selects from the top 20 topics by engagement score for the current user
            - Topics that have never been used are prioritized
            - After that, topics are selected based on how long ago they were last used (oldest first)
            - After writing a blog post, update the topic's last_used_at timestamp
            
            Always respect user data isolation and handle cases where no data is available gracefully.
            
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
    # Check if user has context before starting
    user_id = amu.get_user_context()
    
    if not user_id:
        logger.error("No user context available. Cannot start Blog Writing Agent.")
        log_to_database("error", "No user context available. Cannot start Blog Writing Agent.")
        return
    
    logger.info(f"Starting Blog Writing Agent (Coral Protocol) for user: {user_id}")
    log_to_database("info", f"Blog Writing Agent (Coral Protocol) starting for user: {user_id}")
    
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
        log_to_database("info", f"Blog Writing Agent started and connected to MCP server")
        
        # Define agent-specific tools
        agent_tools = [
            fetch_persona,
            get_engagement_metrics,
            select_next_topic,
            update_topic_usage,
            search_tweet_insights,
            get_recent_blog_posts,
            save_blog_post
        ]
        
        # Get Coral tools using the new pattern
        coral_tools = client.get_tools()
        logger.info(f"Available Coral tools: {[tool.name for tool in coral_tools]}")
        log_to_database("info", f"Available Coral tools: {[tool.name for tool in coral_tools]}")
        
        # Combine Coral tools with agent-specific tools
        tools = coral_tools + agent_tools
        
        # Create the agent executor
        agent_executor = await create_blog_writing_agent(client, tools, agent_tools)
        
        logger.info("Starting Blog Writing Agent (Coral Protocol) execution")
        log_to_database("info", "Starting Blog Writing Agent (Coral Protocol) execution")
        
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
    log_to_database("info", "Blog Writing Agent started")
    
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
