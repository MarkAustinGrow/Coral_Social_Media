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
from typing import Optional
from supabase import create_client, Client
from dotenv import load_dotenv
from anyio import ClosedResourceError
import urllib.parse
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
AGENT_NAME = "Blog to Tweet Agent"

# Load environment variables
load_dotenv()

# Get user context for user-specific MCP server
user_id = amu.get_user_context()

# Use centralized multi-user Coral server
base_url = "http://coral.8interns.com/devmode/exampleApplication/privkey/session1/sse"
params = {
    "waitForAgents": 7,  # Total number of agents in the system
    "agentId": f"blog_to_tweet_agent_{user_id}",
    "agentDescription": f"You are blog_to_tweet_agent for user {user_id}, responsible for converting blog posts into tweet threads"
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
    
    # Ensure tables exist in Supabase
    try:
        # Check if tables exist by attempting to select from them
        supabase_client.table("blog_posts").select("id").limit(1).execute()
        logger.info("Supabase table 'blog_posts' exists")
        
        supabase_client.table("potential_tweets").select("id").limit(1).execute()
        logger.info("Supabase table 'potential_tweets' exists")
    except Exception as e:
        logger.error(f"Error checking Supabase tables: {str(e)}")
        logger.info("Make sure to run the SQL scripts in supabase_schema.sql")
        
except Exception as e:
    logger.error(f"Error initializing API clients: {str(e)}")
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
                "description": "A creative and engaging content creator who produces high-quality social media content with a focus on engagement and community building.",
                "tone": 60,  # Balanced
                "humor": 50,  # Balanced
                "enthusiasm": 75,  # Enthusiastic
                "assertiveness": 65  # Confident but approachable
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
                "description": "A creative and engaging content creator who produces high-quality social media content with a focus on engagement and community building.",
                "tone": 60,  # Balanced
                "humor": 50,  # Balanced
                "enthusiasm": 75,  # Enthusiastic
                "assertiveness": 65  # Confident but approachable
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
            "description": "A creative and engaging content creator who produces high-quality social media content with a focus on engagement and community building.",
            "tone": 60,  # Balanced
            "humor": 50,  # Balanced
            "enthusiasm": 75,  # Enthusiastic
            "assertiveness": 65  # Confident but approachable
        }
        return {
            "error": f"Failed to fetch persona: {str(e)}",
            "result": default_persona
        }

@tool
def get_unconverted_blog_posts(limit: int = 1):
    """
    Get blog posts that haven't been converted to tweets yet for the current user.
    
    Args:
        limit: Maximum number of blog posts to return (default: 1)
        
    Returns:
        Dictionary containing unconverted blog posts
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
        
        log_to_database("info", f"Fetching up to {limit} unconverted blog posts for user {user_id}")
        
        # Get all blog_post_ids that already have tweets for this user
        try:
            existing_tweets = supabase_client.table("potential_tweets").select("blog_post_id").eq("user_id", user_id).execute()
            existing_blog_ids = [tweet.get("blog_post_id") for tweet in existing_tweets.data] if existing_tweets.data else []
            
            # Then exclude those blog posts from our query and filter by user_id
            if existing_blog_ids:
                result = supabase_client.table("blog_posts").select("*").eq("review_status", "approve").eq("user_id", user_id).not_.in_("id", existing_blog_ids).order("created_at", desc=True).limit(limit).execute()
            else:
                result = supabase_client.table("blog_posts").select("*").eq("review_status", "approve").eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
        except Exception as e:
            logger.error(f"Error in blog posts query: {str(e)}")
            # Fallback query with just user_id filtering
            result = supabase_client.table("blog_posts").select("*").eq("review_status", "approve").eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
        
        posts = result.data if result.data else []
        
        log_to_database("info", f"Retrieved {len(posts)} unconverted blog posts for user {user_id}")
        return {
            "result": posts,
            "count": len(posts),
            "user_id": user_id
        }
        
    except Exception as e:
        logger.error(f"Error fetching unconverted blog posts: {str(e)}")
        log_to_database("error", f"Error fetching unconverted blog posts: {str(e)}")
        return {
            "error": f"Failed to fetch unconverted blog posts: {str(e)}",
            "count": 0,
            "result": []
        }

@tool
def get_blog_post_by_id(blog_post_id: int):
    """
    Get a specific blog post by ID for the current user.
    
    Args:
        blog_post_id: ID of the blog post to retrieve
        
    Returns:
        Dictionary containing the blog post
    """
    try:
        # Get user context - CRITICAL for multiuser support
        user_id = amu.get_user_context()
        
        if not user_id:
            logger.error("No user context available for blog post retrieval")
            log_to_database("error", "No user context available for blog post retrieval")
            return {
                "error": "No user context available for blog post retrieval",
                "result": None
            }
        
        log_to_database("info", f"Fetching blog post with ID: {blog_post_id} for user {user_id}")
        
        # Query the blog_posts table in Supabase with user_id filtering
        result = supabase_client.table("blog_posts").select("*").eq("id", blog_post_id).eq("user_id", user_id).execute()
        
        post = result.data[0] if result.data else None
        
        if not post:
            log_to_database("warning", f"Blog post with ID {blog_post_id} not found for user {user_id}")
            return {
                "error": f"Blog post with ID {blog_post_id} not found for user {user_id}",
                "result": None
            }
        
        log_to_database("info", f"Retrieved blog post: {post.get('title')} for user {user_id}")
        return {
            "result": post
        }
        
    except Exception as e:
        logger.error(f"Error fetching blog post: {str(e)}")
        log_to_database("error", f"Error fetching blog post with ID {blog_post_id}: {str(e)}")
        return {
            "error": f"Failed to fetch blog post: {str(e)}",
            "result": None
        }

@tool
def convert_blog_to_tweets(blog_post: dict, max_tweets: int = 10, persona: Optional[dict] = None):
    """
    Convert a blog post into a tweet thread.
    
    Args:
        blog_post: Dictionary containing blog post details
        max_tweets: Maximum number of tweets to generate (default: 10)
        persona: Optional persona details to customize the writing style
        
    Returns:
        Dictionary containing the generated tweet thread
    """
    try:
        log_to_database("info", f"Converting blog post to tweets: {blog_post.get('title')}")
        
        # Use default persona if none provided
        if not persona:
            persona_response = fetch_persona.invoke({})
            persona = persona_response.get("result", {})
            
        # Get blog_post_id
        blog_post_id = blog_post.get("id")
        if not blog_post_id:
            title = blog_post.get("title")
            if title:
                try:
                    # Get user context for filtering
                    user_id = amu.get_user_context()
                    if user_id:
                        result = supabase_client.table("blog_posts").select("id").eq("title", title).eq("user_id", user_id).limit(1).execute()
                        if result.data and len(result.data) > 0:
                            blog_post_id = result.data[0].get("id")
                            logger.info(f"Found blog post ID {blog_post_id} for title: {title}")
                except Exception as e:
                    logger.error(f"Error finding blog post by title: {str(e)}")
        
        # Customize prompt based on persona
        tone_descriptor = "formal" if persona.get("tone", 50) > 70 else "conversational" if persona.get("tone", 50) < 30 else "balanced"
        humor_descriptor = "serious" if persona.get("humor", 50) < 30 else "light-hearted" if persona.get("humor", 50) > 70 else "occasionally humorous"
        enthusiasm_descriptor = "enthusiastic" if persona.get("enthusiasm", 50) > 70 else "reserved" if persona.get("enthusiasm", 50) < 30 else "moderately enthusiastic"
        assertiveness_descriptor = "confident and direct" if persona.get("assertiveness", 50) > 70 else "tentative and nuanced" if persona.get("assertiveness", 50) < 30 else "balanced"
        
        # Use OpenAI to convert the blog post to tweets
        model = init_chat_model(
            model="gpt-4o-mini",
            model_provider="openai",
            api_key=os.getenv("OPENAI_API_KEY"),
            temperature=0.7
        )
        
        prompt = f"""
        # Blog to Tweet Thread Conversion Task
        
        ## Blog Post Details
        - Title: {blog_post.get("title", "")}
        - Content: {blog_post.get("content", "")}
        
        ## Writing Style Instructions
        Write in the voice of {persona.get("name", "Content Creator")}, who is {persona.get("description", "a professional content creator")}.
        - Use a {tone_descriptor} tone
        - Be {humor_descriptor} in your writing
        - Maintain a {enthusiasm_descriptor} energy level
        - Present information in a {assertiveness_descriptor} manner
        
        ## Content Instructions
        Convert this blog post into an engaging tweet thread that captures the key points and encourages engagement. The tweet thread should:
        
        1. Start with a hook that grabs attention
        2. Break down the main points of the blog post into digestible tweets
        3. Include relevant hashtags where appropriate
        4. End with a thought-provoking question or insight that encourages discussion and engagement, rather than a direct promotion of the blog post
        5. Maintain a consistent voice and tone throughout the thread
        
        ## Constraints
        - Maximum {max_tweets} tweets in the thread
        - Each tweet must be 280 characters or less
        - Number each tweet (e.g., 1/7, 2/7, etc.)
        - Ensure the thread flows logically and maintains context
        
        ## Special Instructions for Final Tweet
        For the final tweet in the thread, avoid promotional language like "read my blog" or "link in bio." Instead, end with an insightful conclusion, a thought-provoking question, or an invitation for followers to share their own experiences or perspectives. The goal is to build a community through valuable conversation, not to push content.
        
        ## Output Format
        Return a JSON array where each element is a tweet in the thread. Each tweet should be an object with:
        - "text": The content of the tweet
        - "position": The position in the thread (e.g., 1, 2, 3)
        
        Example:
        [
            {{"text": "1/5 Just published a new blog post on AI trends in 2025! Here's what you need to know about the future of artificial intelligence and how it will impact your business. #AI #FutureTech", "position": 1}},
            {{"text": "2/5 Key Trend #1: Multimodal AI is becoming mainstream. Systems that can process text, images, and audio simultaneously are revolutionizing how we interact with technology.", "position": 2}},
            ...
        ]
        """
        
        response = model.invoke(prompt)
        
        # Parse the response to extract tweets
        try:
            # Extract JSON from the response
            content = response.content
            
            # Find JSON array in the text if it's not pure JSON
            if not content.strip().startswith('['):
                import re
                json_match = re.search(r'\[.*\]', content, re.DOTALL)
                if json_match:
                    content = json_match.group(0)
            
            tweets = json.loads(content)
            
            # Validate tweets
            for tweet in tweets:
                if len(tweet.get("text", "")) > 280:
                    tweet["text"] = tweet["text"][:277] + "..."
            
            log_to_database("info", f"Successfully converted blog post to {len(tweets)} tweets")
            return {
                "result": tweets,
                "count": len(tweets),
                "blog_post_id": blog_post_id or blog_post.get("id")
            }
        except Exception as e:
            logger.error(f"Error parsing tweets: {str(e)}")
            log_to_database("error", f"Error parsing tweets: {str(e)}")
            return {
                "error": f"Failed to parse tweets: {str(e)}",
                "result": None
            }
        
    except Exception as e:
        logger.error(f"Error converting blog to tweets: {str(e)}")
        log_to_database("error", f"Error converting blog to tweets: {str(e)}")
        return {
            "error": f"Failed to convert blog to tweets: {str(e)}",
            "result": None
        }

@tool
def save_tweet_thread(tweets: list, blog_post_id: int, scheduled_for: str = None):
    """
    Save a tweet thread to Supabase with user context.
    
    Args:
        tweets: List of tweet objects
        blog_post_id: ID of the associated blog post
        scheduled_for: When to schedule the tweets (ISO format datetime string, default: 24 hours from now)
        
    Returns:
        Dictionary containing operation result
    """
    try:
        # Get user context - CRITICAL for multiuser support
        user_id = amu.get_user_context()
        
        if not user_id:
            logger.error("No user context available for saving tweet thread")
            log_to_database("error", "No user context available for saving tweet thread")
            return {
                "error": "No user context available for saving tweet thread"
            }
        
        log_to_database("info", f"Saving tweet thread for blog post ID: {blog_post_id} for user {user_id}", {"tweet_count": len(tweets)})
        
        # Set default scheduled time if not provided
        if not scheduled_for:
            scheduled_time = datetime.now() + timedelta(hours=24)
            scheduled_for = scheduled_time.isoformat()
        
        # Prepare tweet thread data with user_id
        thread_data = []
        for tweet in tweets:
            tweet_data = {
                "blog_post_id": blog_post_id,
                "content": tweet.get("text", ""),
                "position": tweet.get("position", 0),
                "status": "scheduled",
                "scheduled_for": scheduled_for,
                "user_id": user_id,  # CRITICAL: Associate with user
                "created_at": datetime.now().isoformat()
            }
            thread_data.append(tweet_data)
        
        # Insert into Supabase
        result = supabase_client.table("potential_tweets").insert(thread_data).execute()
        
        tweet_ids = [tweet.get("id") for tweet in result.data] if result.data else []
        log_to_database("info", f"Successfully saved {len(thread_data)} tweets for user {user_id}", {"tweet_ids": tweet_ids})
        return {
            "result": f"Tweet thread saved successfully for user {user_id}",
            "count": len(thread_data),
            "tweet_ids": tweet_ids,
            "user_id": user_id
        }
        
    except Exception as e:
        logger.error(f"Error saving tweet thread: {str(e)}")
        log_to_database("error", f"Error saving tweet thread: {str(e)}")
        return {
            "error": f"Failed to save tweet thread: {str(e)}"
        }

async def create_blog_to_tweet_agent(client, tools, agent_tools):
    tools_description = get_tools_description(tools)
    agent_tools_description = get_tools_description(agent_tools)
    
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
            1. Check for unconverted blog posts using get_unconverted_blog_posts for the current user
            2. For each unconverted blog post:
               a. Get the full blog post using get_blog_post_by_id if needed
               b. Convert the blog post to tweets using convert_blog_to_tweets
               c. Save the tweet thread using save_tweet_thread
            3. Wait for 15 minutes before processing the next batch
            
            When converting blog posts to tweets, focus on:
            - Capturing the key points of the blog post
            - Creating engaging, shareable content for the current user
            - Maintaining a consistent voice and tone
            - Including relevant hashtags
            - Ending with engagement-focused content rather than promotion
            - Ensuring all content is user-specific and isolated
            
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
    log_to_database("info", f"Blog to Tweet Agent started and connected to MCP server")
    
    # Define agent-specific tools
    agent_tools = [
        fetch_persona,
        get_unconverted_blog_posts,
        get_blog_post_by_id,
        convert_blog_to_tweets,
        save_tweet_thread
    ]
    
    # Get Coral tools using the new pattern
    coral_tools = client.get_tools()
    
    # Combine Coral tools with agent-specific tools
    tools = coral_tools + agent_tools
    
    # Create the agent executor (but don't invoke it continuously)
    agent_executor = await create_blog_to_tweet_agent(client, tools, agent_tools)
    
    # OPTIMIZED MAIN LOOP - Only call OpenAI when there's actual work to do
    last_conversion_time = 0
    conversion_interval = 900  # 15 minutes between conversion batches
    
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
                        # No mentions received, check if it's time for scheduled conversion
                        logger.info("No mentions received, checking scheduled conversion...")
                        
                        current_time = time.time()
                        time_since_last_conversion = current_time - last_conversion_time
                        
                        if time_since_last_conversion >= conversion_interval:
                            # Time for scheduled conversion - check if we have unconverted blogs
                            try:
                                blogs_result = get_unconverted_blog_posts.invoke({"limit": 1})
                                if blogs_result.get("count", 0) > 0:
                                    # We have unconverted blogs - NOW invoke OpenAI for conversion
                                    logger.info("Time for scheduled blog conversion, processing with OpenAI...")
                                    log_to_database("info", "Time for scheduled blog conversion, invoking agent executor")
                                    
                                    await agent_executor.ainvoke({
                                        "agent_scratchpad": [],
                                        "scheduled_task": "blog_conversion"  # Indicate this is scheduled work
                                    })
                                    
                                    last_conversion_time = current_time
                                    logger.info("Completed scheduled blog conversion")
                                    log_to_database("info", "Completed scheduled blog conversion")
                                else:
                                    logger.info("No unconverted blogs available for conversion")
                                    await asyncio.sleep(900)  # Wait 15 minutes before checking again
                            except Exception as conversion_error:
                                logger.error(f"Error checking unconverted blogs: {str(conversion_error)}")
                                await asyncio.sleep(60)
                        else:
                            # Not time yet, just continue waiting (no OpenAI call)
                            time_remaining = conversion_interval - time_since_last_conversion
                            logger.info(f"Not time for conversion yet, {time_remaining:.0f}s remaining...")
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
    log_to_database("info", "Blog to Tweet Agent started")
    
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
