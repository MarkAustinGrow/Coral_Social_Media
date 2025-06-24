import asyncio
import os
import json
import logging
import time
from datetime import datetime
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
    "agentId": "blog_critique_agent",
    "agentDescription": "You are blog_critique_agent, responsible for fact-checking and reviewing blog posts for accuracy and quality"
}
query_string = urllib.parse.urlencode(params)
MCP_SERVER_URL = f"{base_url}?{query_string}"

AGENT_NAME = "blog_critique_agent"

# Initialize API clients
try:
    # Supabase client
    supabase_client = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_KEY")
    )
    
    # Ensure blog_critique table exists in Supabase
    try:
        # Check if table exists by attempting to select from it
        supabase_client.table("blog_critique").select("id").limit(1).execute()
        logger.info("Supabase table 'blog_critique' already exists")
    except Exception as e:
        logger.error(f"Error checking blog_critique table: {str(e)}")
        logger.info("Make sure to run the SQL scripts to create the blog_critique table")
        
except Exception as e:
    logger.error(f"Error initializing API clients: {str(e)}")
    raise

# Validate API keys
if not os.getenv("OPENAI_API_KEY"):
    raise ValueError("OPENAI_API_KEY is not set in environment variables.")
if not os.getenv("PERPLEXITY_API_KEY"):
    raise ValueError("PERPLEXITY_API_KEY is not set in environment variables.")
if not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_KEY"):
    raise ValueError("SUPABASE_URL or SUPABASE_KEY is not set in environment variables.")

# Agent name for status updates - must match exactly what's in the database
AGENT_NAME = "Blog Critique Agent"

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
def fetch_pending_blogs(limit: int = 1):
    """
    Fetch blogs from Supabase that need fact-checking.
    
    Args:
        limit: Maximum number of blogs to fetch (default: 1)
        
    Returns:
        Dictionary containing fetched blogs
    """
    logger.info(f"Fetching {limit} blogs with review_status='pending_fact_check'")
    log_to_database("info", f"Fetching {limit} blogs with review_status='pending_fact_check'")
    
    try:
        # Fetch blogs from Supabase
        query = supabase_client.table("blog_posts").select("*").eq("review_status", "pending_fact_check")
        query = query.order("created_at", desc=True).limit(limit)
        
        result = query.execute()
        
        blogs = result.data if result.data else []
        
        log_to_database("info", f"Retrieved {len(blogs)} blogs pending fact-check")
        return {
            "result": blogs,
            "count": len(blogs)
        }
        
    except Exception as e:
        logger.error(f"Error fetching blogs from Supabase: {str(e)}")
        log_to_database("error", f"Error fetching blogs from Supabase: {str(e)}")
        return {
            "error": f"Failed to fetch blogs: {str(e)}",
            "count": 0
        }

@tool
def fetch_persona():
    """
    Fetch the current persona from Supabase.
    
    Returns:
        Dictionary containing persona details or default values if not found
    """
    logger.info("Fetching persona from Supabase")
    log_to_database("info", "Fetching persona from Supabase")
    
    try:
        # Fetch persona from Supabase
        query = supabase_client.table("personas").select("*").limit(1)
        
        result = query.execute()
        
        if result.data and len(result.data) > 0:
            persona = result.data[0]
            logger.info(f"Found persona: {persona.get('name')}")
            log_to_database("info", f"Found persona: {persona.get('name')}")
            return {
                "result": persona
            }
        else:
            # Return default persona values
            logger.info("No persona found, using default values")
            log_to_database("info", "No persona found, using default values")
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
        log_to_database("error", f"Error fetching persona from Supabase: {str(e)}")
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
def fact_check_blog_with_perplexity(blog_id: int, blog_title: str, blog_content: str, persona: dict = None):
    """
    Use Perplexity to fact-check and review a blog post.
    
    Args:
        blog_id: ID of the blog post
        blog_title: Title of the blog post
        blog_content: Content of the blog post
        persona: Optional persona details to customize the review
        
    Returns:
        Dictionary containing the fact-check results
    """
    logger.info(f"Fact-checking blog ID {blog_id}: {blog_title}")
    log_to_database("info", f"Fact-checking blog ID {blog_id}: {blog_title}")
    
    # Use default persona if none provided
    if not persona:
        persona_response = fetch_persona.invoke({})
        persona = persona_response.get("result", {})
    
    # Customize prompt based on persona
    tone_descriptor = "formal" if persona.get("tone", 50) > 70 else "conversational" if persona.get("tone", 50) < 30 else "balanced"
    humor_descriptor = "serious" if persona.get("humor", 50) < 30 else "light-hearted" if persona.get("humor", 50) > 70 else "occasionally humorous"
    assertiveness_descriptor = "confident and direct" if persona.get("assertiveness", 50) > 70 else "tentative and nuanced" if persona.get("assertiveness", 50) < 30 else "balanced"
    
    # Construct the prompt for Perplexity
    prompt = f"""
Fact Check and Review the following blog post.

BLOG TITLE: {blog_title}

BLOG CONTENT:
\"\"\"
{blog_content}
\"\"\"

Instructions:
- Validate all claims using up-to-date (2025) data.
- Identify if any statements are misleading, exaggerated, or unsupported.
- Check whether referenced tweets or sources are integrated meaningfully.
- Provide a structured report including:
  1. Introduction & framing analysis
  2. Fact check by section
  3. Continuity and logical flow comments
  4. Final verdict (explicitly state "APPROVED" or "REJECTED")
  5. Summary table comparing blog claims vs. verified evidence

TONE INSTRUCTIONS:
- Use a {tone_descriptor} tone
- Be {humor_descriptor} in your analysis
- Present your findings in a {assertiveness_descriptor} manner
- Maintain the voice of a {persona.get("description", "technology expert")}

IMPORTANT: Your final verdict must explicitly state either "APPROVED" or "REJECTED" based on your fact-checking.
"""

    # Call Perplexity API with retry logic
    max_retries = 3
    retry_delay = 2  # Initial delay in seconds
    
    for attempt in range(max_retries):
        try:
            api_key = os.getenv("PERPLEXITY_API_KEY")
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            
            data = {
                "model": "sonar",  # Using Perplexity's Sonar model
                "messages": [
                    {"role": "system", "content": "You are an expert fact-checker and content reviewer with deep knowledge across multiple domains. Your job is to thoroughly analyze blog posts for factual accuracy, logical consistency, and overall quality."},
                    {"role": "user", "content": prompt}
                ]
            }
            
            response = requests.post(
                "https://api.perplexity.ai/chat/completions",
                headers=headers,
                json=data,
                timeout=60  # 60-second timeout
            )
            
            if response.status_code == 200:
                try:
                    response_data = response.json()
                    
                    # Log the full response for debugging
                    logger.debug(f"Perplexity API response: {json.dumps(response_data)}")
                    
                    # Extract the content from the response
                    if "choices" in response_data and len(response_data["choices"]) > 0:
                        if "message" in response_data["choices"][0] and "content" in response_data["choices"][0]["message"]:
                            critique = response_data["choices"][0]["message"]["content"]
                            
                            # Extract decision (approved or rejected)
                            decision = "rejected"  # Default to rejected
                            if "APPROVED" in critique.upper():
                                decision = "approved"
                            
                            # Log the critique result
                            logger.info(f"Critique result for blog {blog_id}: {decision}")
                            logger.info(f"Critique excerpt: {critique[:200]}...")
                            log_to_database("info", f"Completed fact-check for blog {blog_id}: {decision}", {"decision": decision})
                            
                            return {
                                "blog_id": blog_id,
                                "critique": critique,
                                "decision": decision
                            }
                        else:
                            logger.error(f"Unexpected response structure - missing message.content: {response_data}")
                            log_to_database("error", f"Perplexity API error: Unexpected response structure for blog {blog_id}")
                            if attempt < max_retries - 1:
                                logger.info(f"Retrying in {retry_delay} seconds...")
                                time.sleep(retry_delay)
                                retry_delay *= 2  # Exponential backoff
                                continue
                            else:
                                return {
                                    "blog_id": blog_id,
                                    "error": "Unexpected response structure - missing message.content",
                                    "critique": "Error: Unable to generate critique due to API response format issues.",
                                    "decision": "rejected"  # Default to rejected on error
                                }
                    else:
                        logger.error(f"Unexpected response structure - missing choices: {response_data}")
                        log_to_database("error", f"Perplexity API error: Missing choices in response for blog {blog_id}")
                        if attempt < max_retries - 1:
                            logger.info(f"Retrying in {retry_delay} seconds...")
                            time.sleep(retry_delay)
                            retry_delay *= 2  # Exponential backoff
                            continue
                        else:
                            return {
                                "blog_id": blog_id,
                                "error": "Unexpected response structure - missing choices",
                                "critique": "Error: Unable to generate critique due to API response format issues.",
                                "decision": "rejected"  # Default to rejected on error
                            }
                except Exception as e:
                    logger.error(f"Error parsing Perplexity API response: {str(e)}")
                    log_to_database("error", f"Error parsing Perplexity API response for blog {blog_id}: {str(e)}")
                    logger.error(f"Response text: {response.text}")
                    if attempt < max_retries - 1:
                        logger.info(f"Retrying in {retry_delay} seconds...")
                        time.sleep(retry_delay)
                        retry_delay *= 2  # Exponential backoff
                        continue
                    else:
                        return {
                            "blog_id": blog_id,
                            "error": f"Error parsing response: {str(e)}",
                            "critique": "Error: Unable to generate critique due to parsing issues.",
                            "decision": "rejected"  # Default to rejected on error
                        }
            elif response.status_code == 429:  # Rate limit error
                logger.warning(f"Perplexity API rate limit reached: {response.status_code} - {response.text}")
                log_to_database("warning", f"Perplexity API rate limit reached for blog {blog_id}")
                if attempt < max_retries - 1:
                    logger.info(f"Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                    continue
                else:
                    return {
                        "blog_id": blog_id,
                        "error": f"Rate limit error: {response.status_code}",
                        "critique": "Error: Unable to generate critique due to API rate limits.",
                        "decision": "rejected"  # Default to rejected on error
                    }
            else:
                logger.error(f"Perplexity API error: {response.status_code} - {response.text}")
                log_to_database("error", f"Perplexity API error for blog {blog_id}: {response.status_code}")
                if attempt < max_retries - 1:
                    logger.info(f"Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                    continue
                else:
                    return {
                        "blog_id": blog_id,
                        "error": f"API error: {response.status_code}",
                        "critique": "Error: Unable to generate critique due to API errors.",
                        "decision": "rejected"  # Default to rejected on error
                    }
                
        except requests.exceptions.Timeout:
            logger.error("Perplexity API request timed out")
            log_to_database("error", f"Perplexity API request timed out for blog {blog_id}")
            if attempt < max_retries - 1:
                logger.info(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
                continue
            else:
                return {
                    "blog_id": blog_id,
                    "error": "API request timed out",
                    "critique": "Error: Unable to generate critique due to API timeout.",
                    "decision": "rejected"  # Default to rejected on error
                }
        except Exception as e:
            logger.error(f"Error calling Perplexity API: {str(e)}")
            log_to_database("error", f"Error calling Perplexity API for blog {blog_id}: {str(e)}")
            if attempt < max_retries - 1:
                logger.info(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
                continue
            else:
                return {
                    "blog_id": blog_id,
                    "error": f"Error: {str(e)}",
                    "critique": "Error: Unable to generate critique due to unexpected errors.",
                    "decision": "rejected"  # Default to rejected on error
                }

@tool
def store_critique_report(blog_id: int, critique: str, decision: str):
    """
    Store the critique report in Supabase and update blog status.
    
    Args:
        blog_id: ID of the blog post
        critique: Full critique text
        decision: Decision (approved or rejected)
        
    Returns:
        Dictionary containing operation result
    """
    logger.info(f"Storing critique report for blog {blog_id} with decision: {decision}")
    log_to_database("info", f"Storing critique report for blog {blog_id} with decision: {decision}")
    
    try:
        # Extract a summary from the critique (first 200 characters)
        summary = critique[:200] + "..." if len(critique) > 200 else critique
        
        # Insert into blog_critique table
        critique_data = {
            "blog_id": blog_id,
            "critique": critique,
            "summary": summary,
            "decision": decision
        }
        
        critique_result = supabase_client.table("blog_critique").insert(critique_data).execute()
        
        # Update blog_posts table
        blog_update_data = {
            "review_status": decision,  # approved or rejected
            "fact_checked_at": datetime.utcnow().isoformat()
        }
        
        blog_result = supabase_client.table("blog_posts").update(blog_update_data).eq("id", blog_id).execute()
        
        log_to_database("info", f"Successfully stored critique for blog {blog_id}", {"decision": decision})
        return {
            "result": f"Blog {blog_id} marked as {decision}",
            "critique_id": critique_result.data[0].get("id") if critique_result.data else None
        }
        
    except Exception as e:
        logger.error(f"Error storing critique report: {str(e)}")
        log_to_database("error", f"Error storing critique report for blog {blog_id}: {str(e)}")
        return {
            "error": f"Failed to store critique report: {str(e)}"
        }

@tool
def list_fact_check_status():
    """
    Get a summary of blog fact-checking status.
    
    Returns:
        Dictionary containing status summary
    """
    try:
        log_to_database("info", "Fetching fact-check status summary")
        # Get counts for different statuses
        pending_query = supabase_client.table("blog_posts").select("count").eq("review_status", "pending_fact_check").execute()
        approved_query = supabase_client.table("blog_posts").select("count").eq("review_status", "approved").execute()
        rejected_query = supabase_client.table("blog_posts").select("count").eq("review_status", "rejected").execute()
        
        pending_count = pending_query.count if hasattr(pending_query, 'count') else 0
        approved_count = approved_query.count if hasattr(approved_query, 'count') else 0
        rejected_count = rejected_query.count if hasattr(rejected_query, 'count') else 0
        
        # Get recent critiques
        recent_critiques_query = supabase_client.table("blog_critique").select("*").order("created_at", desc=True).limit(5).execute()
        recent_critiques = recent_critiques_query.data if recent_critiques_query.data else []
        
        status_summary = {
            "pending_count": pending_count,
            "approved_count": approved_count,
            "rejected_count": rejected_count,
            "total_reviewed": approved_count + rejected_count
        }
        
        log_to_database("info", "Retrieved fact-check status summary", status_summary)
        return {
            "result": {
                "pending_count": pending_count,
                "approved_count": approved_count,
                "rejected_count": rejected_count,
                "total_reviewed": approved_count + rejected_count,
                "recent_critiques": recent_critiques
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting fact-check status: {str(e)}")
        log_to_database("error", f"Error getting fact-check status: {str(e)}")
        return {
            "error": f"Failed to get fact-check status: {str(e)}",
            "result": {
                "pending_count": 0,
                "approved_count": 0,
                "rejected_count": 0,
                "total_reviewed": 0,
                "recent_critiques": []
            }
        }

async def create_blog_critique_agent(client, tools, agent_tools):
    tools_description = get_tools_description(tools)
    agent_tools_description = get_tools_description(agent_tools)
    
    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            f"""You are blog_critique_agent, responsible for fact-checking and reviewing blog posts for accuracy and quality.
            
            Follow these steps in order:
            1. Call wait_for_mentions from coral tools (timeoutMs: 8000) to receive instructions from other agents
            2. If you receive a mention:
               a. Process the instruction (e.g., check specific blogs, provide status)
               b. Execute the requested operation using your tools
               c. Send a response back to the sender with the results
            3. If no mentions are received (timeout):
               a. Fetch ONE blog with review_status='pending_fact_check' using fetch_pending_blogs (limit=1)
               b. If a blog is found:
                  i. Fetch the current persona using fetch_persona
                  ii. Use Perplexity to fact-check the blog using fact_check_blog_with_perplexity
                  iii. Store the critique report using store_critique_report
               c. Wait for 5 minutes before processing the next blog (to avoid API rate limits)
            
            Your goal is to ensure all blog content is factually accurate and of high quality. Focus on:
            - Verifying factual claims
            - Checking logical consistency
            - Evaluating overall quality
            - Making clear approval/rejection decisions
            
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
            # Use the new MCP client pattern (langchain-mcp-adapters 0.1.0+)
            client = MultiServerMCPClient(
                connections={
                    "coral": {
                        "transport": "sse",
                        "url": MCP_SERVER_URL,
                        "timeout": 300,
                        "sse_read_timeout": 300,
                    }
                }
            )
            
            logger.info(f"Connected to MCP server at {MCP_SERVER_URL}")
            log_to_database("info", "Blog Critique Agent connected to MCP server")
            
            # Define agent-specific tools
            agent_tools = [
                fetch_pending_blogs,
                fetch_persona,
                fact_check_blog_with_perplexity,
                store_critique_report,
                list_fact_check_status
            ]
            
            # Get Coral tools using the new pattern
            coral_tools = await client.get_tools()
            
            # Combine Coral tools with agent-specific tools
            tools = coral_tools + agent_tools
            
            # Create and run the agent
            agent_executor = await create_blog_critique_agent(client, tools, agent_tools)
            
            while True:
                try:
                    logger.info("Starting new agent invocation")
                    log_to_database("info", "Starting new agent invocation cycle")
                    await agent_executor.ainvoke({"agent_scratchpad": []})
                    logger.info("Completed agent invocation, waiting 5 minutes before next blog")
                    log_to_database("info", "Completed agent invocation cycle, waiting 5 minutes before next blog")
                    await asyncio.sleep(300)  # Wait 5 minutes between processing blogs
                except Exception as e:
                    logger.error(f"Error in agent loop: {str(e)}")
                    log_to_database("error", f"Error in agent loop: {str(e)}")
                    await asyncio.sleep(5)
                    
        except ClosedResourceError as e:
            logger.error(f"ClosedResourceError on attempt {attempt + 1}: {e}")
            log_to_database("error", f"ClosedResourceError on attempt {attempt + 1}: {e}")
            if attempt < max_retries - 1:
                logger.info("Retrying in 5 seconds...")
                await asyncio.sleep(5)
                continue
            else:
                logger.error("Max retries reached. Exiting.")
                raise
        except Exception as e:
            logger.error(f"Unexpected error on attempt {attempt + 1}: {e}")
            log_to_database("error", f"Unexpected error on attempt {attempt + 1}: {e}")
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
    log_to_database("info", "Blog Critique Agent started")
    
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
