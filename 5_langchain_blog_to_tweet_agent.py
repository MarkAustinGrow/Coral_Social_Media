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

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

base_url = "http://localhost:5555/devmode/exampleApplication/privkey/session1/sse"
params = {
    "waitForAgents": 7,  # Total number of agents in the system
    "agentId": "blog_to_tweet_agent",
    "agentDescription": "You are blog_to_tweet_agent, responsible for converting blog posts into tweet threads"
}
query_string = urllib.parse.urlencode(params)
MCP_SERVER_URL = f"{base_url}?{query_string}"

AGENT_NAME = "blog_to_tweet_agent"

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

def get_tools_description(tools):
    return "\n".join(
        f"Tool: {tool.name}, Schema: {json.dumps(tool.args).replace('{', '{{').replace('}', '}}')}"
        for tool in tools
    )

@tool
def fetch_persona():
    """
    Fetch the current persona from Supabase.
    
    Returns:
        Dictionary containing persona details or default values if not found
    """
    logger.info("Fetching persona from Supabase")
    
    try:
        # Fetch persona from Supabase
        query = supabase_client.table("personas").select("*").limit(1)
        
        result = query.execute()
        
        if result.data and len(result.data) > 0:
            persona = result.data[0]
            logger.info(f"Found persona: {persona.get('name')}")
            return {
                "result": persona
            }
        else:
            # Return default persona values
            logger.info("No persona found, using default values")
            default_persona = {
                "name": "Content Reviewer",
                "description": "A meticulous and objective reviewer who prioritizes factual accuracy, logical consistency, and narrative flow in all content.",
                "tone": 70,  # More formal
                "humor": 30,  # More serious
                "enthusiasm": 60,  # Moderately enthusiastic
                "assertiveness": 80  # Quite confident
            }
            return {
                "result": default_persona
            }
        
    except Exception as e:
        logger.error(f"Error fetching persona from Supabase: {str(e)}")
        # Return default persona values on error
        default_persona = {
            "name": "Content Reviewer",
            "description": "A meticulous and objective reviewer who prioritizes factual accuracy, logical consistency, and narrative flow in all content.",
            "tone": 70,  # More formal
            "humor": 30,  # More serious
            "enthusiasm": 60,  # Moderately enthusiastic
            "assertiveness": 80  # Quite confident
        }
        return {
            "error": f"Failed to fetch persona: {str(e)}",
            "result": default_persona
        }

@tool
def get_unconverted_blog_posts(limit: int = 1):
    """
    Get blog posts that haven't been converted to tweets yet.
    
    Args:
        limit: Maximum number of blog posts to return (default: 1)
        
    Returns:
        Dictionary containing unconverted blog posts
    """
    try:
        # Query the blog_posts table in Supabase
        # Join with potential_tweets to find blog posts that don't have associated tweets
        query = """
        SELECT b.id, b.title, b.content, b.word_count, b.status, b.created_at
        FROM blog_posts b
        LEFT JOIN potential_tweets t ON b.id = t.blog_post_id
        WHERE t.id IS NULL
        AND b.review_status = 'approved'
        ORDER BY b.created_at DESC
        LIMIT $1
        """
        
        result = supabase_client.rpc('execute_sql', {'query': query, 'params': [limit]}).execute()
        
        # If the RPC method doesn't work, fall back to a simpler query
        if not result.data or 'error' in result.data:
            logger.warning("RPC query failed, falling back to simpler query")
            
            # First, get all blog_post_ids that already have tweets
            try:
                existing_tweets = supabase_client.table("potential_tweets").select("blog_post_id").execute()
                existing_blog_ids = [tweet.get("blog_post_id") for tweet in existing_tweets.data] if existing_tweets.data else []
                
                # Then exclude those blog posts from our query
                if existing_blog_ids:
                    result = supabase_client.table("blog_posts").select("*").eq("review_status", "approved").not_.in_("id", existing_blog_ids).order("created_at", desc=True).limit(limit).execute()
                else:
                    result = supabase_client.table("blog_posts").select("*").eq("review_status", "approved").order("created_at", desc=True).limit(limit).execute()
            except Exception as e:
                logger.error(f"Error in fallback query: {str(e)}")
                # If the above fails, use the original fallback query
                result = supabase_client.table("blog_posts").select("*").eq("review_status", "approved").order("created_at", desc=True).limit(limit).execute()
        
        posts = result.data if result.data else []
        
        return {
            "result": posts,
            "count": len(posts)
        }
        
    except Exception as e:
        logger.error(f"Error fetching unconverted blog posts: {str(e)}")
        return {
            "error": f"Failed to fetch unconverted blog posts: {str(e)}",
            "count": 0
        }

@tool
def get_blog_post_by_id(blog_post_id: int):
    """
    Get a specific blog post by ID.
    
    Args:
        blog_post_id: ID of the blog post to retrieve
        
    Returns:
        Dictionary containing the blog post
    """
    try:
        # Query the blog_posts table in Supabase
        result = supabase_client.table("blog_posts").select("*").eq("id", blog_post_id).execute()
        
        post = result.data[0] if result.data else None
        
        if not post:
            return {
                "error": f"Blog post with ID {blog_post_id} not found",
                "result": None
            }
        
        return {
            "result": post
        }
        
    except Exception as e:
        logger.error(f"Error fetching blog post: {str(e)}")
        return {
            "error": f"Failed to fetch blog post: {str(e)}",
            "result": None
        }

@tool
def convert_blog_to_tweets(blog_post: dict, max_tweets: int = 10, persona: dict = None):
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
        # Use default persona if none provided
        if not persona:
            persona_response = fetch_persona.invoke({})
            persona = persona_response.get("result", {})
            
        # If blog_post_id is not provided, try to find it by title
        blog_post_id = blog_post.get("id")
        if not blog_post_id:
            title = blog_post.get("title")
            if title:
                try:
                    result = supabase_client.table("blog_posts").select("id").eq("title", title).limit(1).execute()
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
            
            return {
                "result": tweets,
                "count": len(tweets),
                "blog_post_id": blog_post_id or blog_post.get("id")
            }
        except Exception as e:
            logger.error(f"Error parsing tweets: {str(e)}")
            return {
                "error": f"Failed to parse tweets: {str(e)}",
                "result": None
            }
        
    except Exception as e:
        logger.error(f"Error converting blog to tweets: {str(e)}")
        return {
            "error": f"Failed to convert blog to tweets: {str(e)}",
            "result": None
        }

@tool
def save_tweet_thread(tweets: list, blog_post_id: int, scheduled_for: str = None):
    """
    Save a tweet thread to Supabase.
    
    Args:
        tweets: List of tweet objects
        blog_post_id: ID of the associated blog post
        scheduled_for: When to schedule the tweets (ISO format datetime string, default: 24 hours from now)
        
    Returns:
        Dictionary containing operation result
    """
    try:
        # Set default scheduled time if not provided
        if not scheduled_for:
            scheduled_time = datetime.now() + timedelta(hours=24)
            scheduled_for = scheduled_time.isoformat()
        
        # Prepare tweet thread data
        thread_data = []
        for tweet in tweets:
            tweet_data = {
                "blog_post_id": blog_post_id,
                "content": tweet.get("text", ""),
                "position": tweet.get("position", 0),
                "status": "scheduled",
                "scheduled_for": scheduled_for,
                "created_at": datetime.now().isoformat()
            }
            thread_data.append(tweet_data)
        
        # Insert into Supabase
        result = supabase_client.table("potential_tweets").insert(thread_data).execute()
        
        return {
            "result": "Tweet thread saved successfully",
            "count": len(thread_data),
            "tweet_ids": [tweet.get("id") for tweet in result.data] if result.data else []
        }
        
    except Exception as e:
        logger.error(f"Error saving tweet thread: {str(e)}")
        return {
            "error": f"Failed to save tweet thread: {str(e)}"
        }

async def create_blog_to_tweet_agent(client, tools, agent_tools):
    tools_description = get_tools_description(tools)
    agent_tools_description = get_tools_description(agent_tools)
    
    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            f"""You are blog_to_tweet_agent, responsible for converting blog posts into tweet threads.
            
            Follow these steps in order:
            1. Call wait_for_mentions from coral tools (timeoutMs: 8000) to receive instructions from other agents
            2. If you receive a mention:
               a. Process the instruction (e.g., convert a specific blog post to tweets)
               b. Execute the requested operation using your tools
               c. Send a response back to the sender with the results
            3. If no mentions are received (timeout):
               a. Check for unconverted blog posts using get_unconverted_blog_posts
               b. For each unconverted blog post:
                  i. Get the full blog post using get_blog_post_by_id if needed
                  ii. Convert the blog post to tweets using convert_blog_to_tweets
                  iii. Save the tweet thread using save_tweet_thread
                  iv. Notify twitter_posting_agent about the new tweet thread
            4. Wait for 2 seconds and repeat the process
            
            When converting blog posts to tweets, focus on:
            - Capturing the key points of the blog post
            - Creating engaging, shareable content
            - Maintaining a consistent voice and tone
            - Including relevant hashtags
            - Ending with a call to action
            
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
                    fetch_persona,
                    get_unconverted_blog_posts,
                    get_blog_post_by_id,
                    convert_blog_to_tweets,
                    save_tweet_thread
                ]
                
                # Combine Coral tools with agent-specific tools
                tools = client.get_tools() + agent_tools
                
                # Create and run the agent
                agent_executor = await create_blog_to_tweet_agent(client, tools, agent_tools)
                
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
    asyncio.run(main())
