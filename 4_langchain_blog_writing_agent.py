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
from langchain.embeddings import OpenAIEmbeddings
from supabase import create_client, Client
from qdrant_client import QdrantClient
from qdrant_client.http import models
from dotenv import load_dotenv
from anyio import ClosedResourceError
import urllib.parse
import requests
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

base_url = "http://localhost:5555/devmode/exampleApplication/privkey/session1/sse"
params = {
    "waitForAgents": 7,  # Total number of agents in the system
    "agentId": "blog_writing_agent",
    "agentDescription": "You are blog_writing_agent, responsible for creating blog content based on research and insights from tweets"
}
query_string = urllib.parse.urlencode(params)
MCP_SERVER_URL = f"{base_url}?{query_string}"

AGENT_NAME = "blog_writing_agent"

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
        api_key=os.getenv("QDRANT_API_KEY", "")
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

def get_tools_description(tools):
    return "\n".join(
        f"Tool: {tool.name}, Schema: {json.dumps(tool.args).replace('{', '{{').replace('}', '}}')}"
        for tool in tools
    )

@tool
def get_engagement_metrics():
    """
    Get engagement metrics from Supabase to determine popular topics.
    
    Returns:
        Dictionary containing engagement metrics for different topics
    """
    try:
        # Query the engagement_metrics table in Supabase
        result = supabase_client.table("engagement_metrics").select("*").order("engagement_score", desc=True).execute()
        
        metrics = result.data if result.data else []
        
        return {
            "result": metrics,
            "count": len(metrics)
        }
        
    except Exception as e:
        logger.error(f"Error fetching engagement metrics: {str(e)}")
        return {
            "error": f"Failed to fetch engagement metrics: {str(e)}",
            "count": 0,
            "result": [
                {"topic": "AI", "engagement_score": 95},
                {"topic": "Machine Learning", "engagement_score": 90},
                {"topic": "Data Science", "engagement_score": 85},
                {"topic": "Python", "engagement_score": 80},
                {"topic": "JavaScript", "engagement_score": 75}
            ]
        }

@tool
def search_tweet_insights(query: str, limit: int = 10):
    """
    Search for tweet insights in Qdrant based on a query.
    
    Args:
        query: Search query
        limit: Maximum number of results to return (default: 10)
        
    Returns:
        Dictionary containing search results
    """
    try:
        # Generate embedding for the query
        query_embedding = embeddings.embed_query(query)
        
        # Search in Qdrant
        search_results = qdrant_client.search(
            collection_name="tweet_insights",
            query_vector=query_embedding,
            limit=limit
        )
        
        # Extract results
        results = []
        for result in search_results:
            results.append({
                "tweet_id": result.payload.get("tweet_id"),
                "tweet_text": result.payload.get("tweet_text"),
                "analysis": result.payload.get("analysis"),
                "score": result.score
            })
        
        return {
            "result": results,
            "count": len(results)
        }
        
    except Exception as e:
        logger.error(f"Error searching tweet insights: {str(e)}")
        return {
            "error": f"Failed to search tweet insights: {str(e)}",
            "count": 0
        }

@tool
def get_recent_blog_posts(limit: int = 5):
    """
    Get recent blog posts from Supabase.
    
    Args:
        limit: Maximum number of blog posts to return (default: 5)
        
    Returns:
        Dictionary containing recent blog posts
    """
    try:
        # Query the blog_posts table in Supabase
        result = supabase_client.table("blog_posts").select("*").order("created_at", desc=True).limit(limit).execute()
        
        posts = result.data if result.data else []
        
        return {
            "result": posts,
            "count": len(posts)
        }
        
    except Exception as e:
        logger.error(f"Error fetching recent blog posts: {str(e)}")
        return {
            "error": f"Failed to fetch recent blog posts: {str(e)}",
            "count": 0
        }

@tool
def generate_blog_topic(topic_area: str = None):
    """
    Generate a blog topic based on engagement metrics and tweet insights.
    
    Args:
        topic_area: Optional specific topic area to focus on
        
    Returns:
        Dictionary containing generated blog topic
    """
    try:
        # Get engagement metrics
        metrics_response = get_engagement_metrics()
        metrics = metrics_response.get("result", [])
        
        # If topic area is specified, filter metrics
        if topic_area:
            metrics = [m for m in metrics if topic_area.lower() in m.get("topic", "").lower()]
        
        # Get top topics
        top_topics = [m.get("topic") for m in metrics[:3]]
        
        # Search for insights related to top topics
        insights = []
        for topic in top_topics:
            search_response = search_tweet_insights(topic, limit=3)
            insights.extend(search_response.get("result", []))
        
        # Use OpenAI to generate a blog topic
        model = init_chat_model(
            model="gpt-4o-mini",
            model_provider="openai",
            api_key=os.getenv("OPENAI_API_KEY"),
            temperature=0.7
        )
        
        prompt = f"""
        Based on the following engagement metrics and tweet insights, generate an engaging blog topic.
        
        Top Topics by Engagement:
        {json.dumps(top_topics, indent=2)}
        
        Related Tweet Insights:
        {json.dumps(insights, indent=2)}
        
        Generate a blog topic that:
        1. Is timely and relevant
        2. Addresses questions or pain points from the tweets
        3. Leverages the high-engagement topics
        4. Has potential for good SEO
        
        Return your response as a JSON object with the following structure:
        {{
            "title": "The blog post title",
            "description": "A brief description of what the blog post will cover",
            "key_points": ["Point 1", "Point 2", "Point 3"],
            "target_audience": "Who this blog post is for",
            "estimated_word_count": 1000
        }}
        """
        
        response = model.invoke(prompt)
        
        # Parse the response
        try:
            # Extract JSON from the response
            content = response.content
            
            # Find JSON in the text if it's not pure JSON
            if not content.strip().startswith('{'):
                import re
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    content = json_match.group(0)
            
            topic_data = json.loads(content)
            return {"result": topic_data}
        except Exception as e:
            logger.error(f"Error parsing blog topic: {str(e)}")
            return {
                "error": f"Failed to parse blog topic: {str(e)}",
                "result": {
                    "title": "The Future of AI in Everyday Applications",
                    "description": "An exploration of how AI is being integrated into common applications and changing the way we interact with technology",
                    "key_points": [
                        "Current state of AI in consumer applications",
                        "Emerging trends in AI integration",
                        "Predictions for the next 5 years"
                    ],
                    "target_audience": "Tech enthusiasts and professionals interested in AI developments",
                    "estimated_word_count": 1200
                }
            }
        
    except Exception as e:
        logger.error(f"Error generating blog topic: {str(e)}")
        return {
            "error": f"Failed to generate blog topic: {str(e)}",
            "result": {
                "title": "The Future of AI in Everyday Applications",
                "description": "An exploration of how AI is being integrated into common applications and changing the way we interact with technology",
                "key_points": [
                    "Current state of AI in consumer applications",
                    "Emerging trends in AI integration",
                    "Predictions for the next 5 years"
                ],
                "target_audience": "Tech enthusiasts and professionals interested in AI developments",
                "estimated_word_count": 1200
            }
        }

@tool
def write_blog_post(topic: dict, max_tokens: int = 4000):
    """
    Write a blog post using Claude from Anthropic.
    
    Args:
        topic: Dictionary containing blog topic details
        max_tokens: Maximum number of tokens for the blog post (default: 4000)
        
    Returns:
        Dictionary containing the written blog post
    """
    try:
        # Get related insights
        insights_response = search_tweet_insights(topic.get("title", ""), limit=10)
        insights = insights_response.get("result", [])
        
        # Prepare the prompt for Claude
        prompt = f"""
        # Blog Post Writing Task
        
        ## Topic Details
        - Title: {topic.get("title", "")}
        - Description: {topic.get("description", "")}
        - Key Points: {", ".join(topic.get("key_points", []))}
        - Target Audience: {topic.get("target_audience", "")}
        - Estimated Word Count: {topic.get("estimated_word_count", 1000)}
        
        ## Related Insights from Twitter
        {json.dumps(insights, indent=2)}
        
        ## Instructions
        Write a comprehensive, engaging blog post based on the topic details above. The blog post should:
        
        1. Have an attention-grabbing introduction
        2. Cover all the key points mentioned
        3. Include relevant information from the Twitter insights
        4. Have a clear structure with headings and subheadings
        5. End with a strong conclusion and call to action
        6. Be optimized for SEO
        7. Be written in a conversational yet professional tone
        
        ## Output Format
        Return the blog post in Markdown format, with proper headings, formatting, and structure.
        """
        
        # Use Anthropic's Claude API
        headers = {
            "x-api-key": os.getenv("ANTHROPIC_API_KEY"),
            "content-type": "application/json",
            "anthropic-version": "2023-06-01"
        }
        
        data = {
            "model": "claude-3-opus-20240229",
            "max_tokens": max_tokens,
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
            blog_content = response_data["content"][0]["text"]
            
            return {
                "result": {
                    "title": topic.get("title", ""),
                    "content": blog_content,
                    "word_count": len(blog_content.split()),
                    "created_at": datetime.now().isoformat()
                }
            }
        else:
            logger.error(f"Anthropic API error: {response.status_code} - {response.text}")
            return {
                "error": f"Failed to generate blog post: {response.status_code}",
                "result": None
            }
        
    except Exception as e:
        logger.error(f"Error writing blog post: {str(e)}")
        return {
            "error": f"Failed to write blog post: {str(e)}",
            "result": None
        }

@tool
def save_blog_post(blog_post: dict, status: str = "draft"):
    """
    Save a blog post to Supabase.
    
    Args:
        blog_post: Dictionary containing blog post details
        status: Status of the blog post (draft, review, published)
        
    Returns:
        Dictionary containing operation result
    """
    try:
        # Prepare blog post data
        blog_data = {
            "title": blog_post.get("title", ""),
            "content": blog_post.get("content", ""),
            "word_count": blog_post.get("word_count", 0),
            "status": status,
            "created_at": blog_post.get("created_at", datetime.now().isoformat())
        }
        
        # Insert into Supabase
        result = supabase_client.table("blog_posts").insert(blog_data).execute()
        
        return {
            "result": "Blog post saved successfully",
            "blog_id": result.data[0].get("id") if result.data else None
        }
        
    except Exception as e:
        logger.error(f"Error saving blog post: {str(e)}")
        return {
            "error": f"Failed to save blog post: {str(e)}"
        }

async def create_blog_writing_agent(client, tools, agent_tools):
    tools_description = get_tools_description(tools)
    agent_tools_description = get_tools_description(agent_tools)
    
    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            f"""You are blog_writing_agent, responsible for creating blog content based on research and insights from tweets.
            
            Follow these steps in order:
            1. Call wait_for_mentions from coral tools (timeoutMs: 8000) to receive instructions from other agents
            2. If you receive a mention:
               a. Process the instruction (e.g., write a blog post on a specific topic)
               b. Execute the requested operation using your tools
               c. Send a response back to the sender with the results
            3. If no mentions are received (timeout):
               a. Check if it's time to create a new blog post (once per day)
               b. If it is time:
                  i. Generate a blog topic using generate_blog_topic based on engagement metrics
                  ii. Write a blog post using write_blog_post
                  iii. Save the blog post using save_blog_post
                  iv. Notify blog_to_tweet_agent about the new blog post
            4. Wait for 2 seconds and repeat the process
            
            When writing blog posts, focus on:
            - Creating engaging, informative content
            - Incorporating insights from tweet research
            - Optimizing for SEO
            - Maintaining a consistent brand voice
            
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
                    get_engagement_metrics,
                    search_tweet_insights,
                    get_recent_blog_posts,
                    generate_blog_topic,
                    write_blog_post,
                    save_blog_post
                ]
                
                # Combine Coral tools with agent-specific tools
                tools = client.get_tools() + agent_tools
                
                # Create and run the agent
                agent_executor = await create_blog_writing_agent(client, tools, agent_tools)
                
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
