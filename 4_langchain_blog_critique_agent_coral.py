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
import agent_multiuser_utils_simple as amu

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Agent name for database logging
AGENT_NAME = "Blog Critique Agent"

# Load environment variables
load_dotenv()

# Get user context for user-specific MCP server
user_id = amu.get_user_context()

# Use centralized multi-user Coral server
base_url = "http://coral.8interns.com/devmode/exampleApplication/privkey/session1/sse"
params = {
    "waitForAgents": 7,  # Total number of agents in the system
    "agentId": f"blog_critique_agent_{user_id}",
    "agentDescription": f"You are blog_critique_agent for user {user_id}, responsible for fact-checking and reviewing blog posts for accuracy and quality based on instructions from other agents"
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
def fetch_pending_blogs(limit: int = 1):
    """
    Fetch blogs from Supabase that need fact-checking for the current user.
    
    Args:
        limit: Maximum number of blogs to fetch (default: 1)
        
    Returns:
        Dictionary containing fetched blogs
    """
    try:
        # Get user context - CRITICAL for multiuser support
        user_id = amu.get_user_context()
        
        if not user_id:
            logger.error("No user context available for blog fetching")
            log_to_database("error", "No user context available for blog fetching")
            return {
                "error": "No user context available for blog fetching",
                "count": 0
            }
        
        logger.info(f"Fetching {limit} blogs with review_status='pending_fact_check' for user {user_id}")
        log_to_database("info", f"Fetching {limit} blogs with review_status='pending_fact_check' for user {user_id}")
        
        # Fetch blogs from Supabase with user_id filtering
        query = supabase_client.table("blog_posts").select("*").eq("review_status", "pending_fact_check").eq("user_id", user_id)
        query = query.order("created_at", desc=True).limit(limit)
        
        result = query.execute()
        
        blogs = result.data if result.data else []
        
        log_to_database("info", f"Retrieved {len(blogs)} blogs pending fact-check for user {user_id}")
        return {
            "result": blogs,
            "count": len(blogs),
            "user_id": user_id
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
                            
                            # Extract decision (approve or reject)
                            decision = "reject"  # Default to reject
                            if "APPROVED" in critique.upper():
                                decision = "approve"
                            
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
                                    "decision": "reject"  # Default to reject on error
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
                                "decision": "reject"  # Default to reject on error
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
                            "decision": "reject"  # Default to reject on error
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
                        "decision": "reject"  # Default to reject on error
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
                        "decision": "reject"  # Default to reject on error
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
                    "decision": "reject"  # Default to reject on error
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
                    "decision": "reject"  # Default to reject on error
                }

@tool
def store_critique_report(blog_id: int, critique: str, decision: str):
    """
    Store the critique report in Supabase and update blog status with user context.
    
    Args:
        blog_id: ID of the blog post
        critique: Full critique text
        decision: Decision (approved or rejected)
        
    Returns:
        Dictionary containing operation result
    """
    try:
        # Get user context - CRITICAL for multiuser support
        user_id = amu.get_user_context()
        
        if not user_id:
            logger.error("No user context available for storing critique")
            log_to_database("error", "No user context available for storing critique")
            return {
                "error": "No user context available for storing critique"
            }
        
        logger.info(f"Storing critique report for blog {blog_id} with decision: {decision} for user {user_id}")
        log_to_database("info", f"Storing critique report for blog {blog_id} with decision: {decision} for user {user_id}")
        
        # Extract a summary from the critique (first 200 characters)
        summary = critique[:200] + "..." if len(critique) > 200 else critique
        
        # Insert into blog_critique table with user_id
        critique_data = {
            "blog_id": blog_id,
            "critique": critique,
            "summary": summary,
            "decision": decision,
            "user_id": user_id  # CRITICAL: Associate with user
        }
        
        critique_result = supabase_client.table("blog_critique").insert(critique_data).execute()
        
        # Update blog_posts table with user_id filtering
        blog_update_data = {
            "review_status": decision,  # approved or rejected
            "fact_checked_at": datetime.utcnow().isoformat()
        }
        
        blog_result = supabase_client.table("blog_posts").update(blog_update_data).eq("id", blog_id).eq("user_id", user_id).execute()
        
        log_to_database("info", f"Successfully stored critique for blog {blog_id} for user {user_id}", {"decision": decision})
        return {
            "result": f"Blog {blog_id} marked as {decision} for user {user_id}",
            "critique_id": critique_result.data[0].get("id") if critique_result.data else None,
            "user_id": user_id
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
    Get a summary of blog fact-checking status for the current user.
    
    Returns:
        Dictionary containing status summary
    """
    try:
        # Get user context - CRITICAL for multiuser support
        user_id = amu.get_user_context()
        
        if not user_id:
            logger.error("No user context available for status summary")
            log_to_database("error", "No user context available for status summary")
            return {
                "error": "No user context available for status summary",
                "result": {
                    "pending_count": 0,
                    "approved_count": 0,
                    "rejected_count": 0,
                    "total_reviewed": 0,
                    "recent_critiques": []
                }
            }
        
        log_to_database("info", f"Fetching fact-check status summary for user {user_id}")
        
        # Get counts for different statuses with user_id filtering
        pending_query = supabase_client.table("blog_posts").select("count").eq("review_status", "pending_fact_check").eq("user_id", user_id).execute()
        approved_query = supabase_client.table("blog_posts").select("count").eq("review_status", "approved").eq("user_id", user_id).execute()
        rejected_query = supabase_client.table("blog_posts").select("count").eq("review_status", "rejected").eq("user_id", user_id).execute()
        
        pending_count = pending_query.count if hasattr(pending_query, 'count') else 0
        approved_count = approved_query.count if hasattr(approved_query, 'count') else 0
        rejected_count = rejected_query.count if hasattr(rejected_query, 'count') else 0
        
        # Get recent critiques with user_id filtering
        recent_critiques_query = supabase_client.table("blog_critique").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(5).execute()
        recent_critiques = recent_critiques_query.data if recent_critiques_query.data else []
        
        status_summary = {
            "pending_count": pending_count,
            "approved_count": approved_count,
            "rejected_count": rejected_count,
            "total_reviewed": approved_count + rejected_count,
            "user_id": user_id
        }
        
        log_to_database("info", f"Retrieved fact-check status summary for user {user_id}", status_summary)
        return {
            "result": {
                "pending_count": pending_count,
                "approved_count": approved_count,
                "rejected_count": rejected_count,
                "total_reviewed": approved_count + rejected_count,
                "recent_critiques": recent_critiques,
                "user_id": user_id
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
    
    # Get user context for user-specific prompt
    user_id = amu.get_user_context()
    
    # Coral Protocol version - listens for mentions instead of autonomous execution
    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            f"""You are a Blog Critique Agent operating in CORAL PROTOCOL mode for user {user_id}.
            
            IMPORTANT: You are operating in MULTI-USER mode. Each user has their own blog posts and critique data.
            You will only fact-check and review blogs for the current user's data.
            
            CORAL PROTOCOL BEHAVIOR:
            You listen for instructions from other agents and respond via the Coral Protocol.
            
            Follow these steps in order:
            1. Call `wait_for_mentions` from coral tools (timeoutMs: 30000) to receive mentions from other agents.
            2. When you receive a mention, keep the thread ID and the sender ID.
            3. Parse the instruction in the message content. Look for requests like:
               - "fact-check blog posts"
               - "review blog for accuracy"
               - "critique blog content"
               - "verify blog claims"
               - "check blog quality"
            4. Based on the instruction, use your tools to:
               a. Fetch pending blogs using `fetch_pending_blogs`
               b. Fetch the current persona using `fetch_persona`
               c. Use Perplexity to fact-check the blog using `fact_check_blog_with_perplexity`
               d. Store the critique report using `store_critique_report`
            5. Prepare a response with the results (number of blogs reviewed, decisions made, etc.)
            6. Use `send_message` from coral tools to send your response back to the sender in the same thread.
            7. Always respond back to the sender agent, even if there's an error.
            8. Wait for 2 seconds and repeat the process from step 1.
            
            If no mentions are received (timeout), simply continue waiting - do NOT perform autonomous actions.
            
            RESPONSE FORMAT:
            Always format your responses clearly:
            - Success: "Reviewed X blogs. Approved: Y, Rejected: Z. All critiques stored for user review."
            - Error: "Unable to review blogs: [reason]. Please check data availability or try again later."
            - No blogs: "No pending blogs available for review. All blogs are up to date."
            
            FACT-CHECKING FOCUS:
            Your goal is to ensure all blog content is factually accurate and of high quality for the current user. Focus on:
            - Verifying factual claims with up-to-date data
            - Checking logical consistency and flow
            - Evaluating overall quality and readability
            - Making clear approval/rejection decisions
            - Providing detailed feedback for improvements
            
            Always respect user data isolation and handle cases where no blogs are available gracefully.
            
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
        logger.error("No user context available. Cannot start Blog Critique Agent.")
        log_to_database("error", "No user context available. Cannot start Blog Critique Agent.")
        return
    
    logger.info(f"Starting Blog Critique Agent (Coral Protocol) for user: {user_id}")
    log_to_database("info", f"Blog Critique Agent (Coral Protocol) starting for user: {user_id}")
    
    # Single persistent connection following working World News Agent pattern
    async with MultiServerMCPClient(
        connections={
            "coral": {
                "transport": "sse",
                "url": MCP_SERVER_URL,
                "headers": {"X-User-ID": user_id},  # CRITICAL: User isolation header
                "timeout": 300,           # 5 minute connection timeout
                "sse_read_timeout": 300,  # 5 minute read timeout
            }
        }
    ) as client:
        logger.info(f"Connected to MCP server at {MCP_SERVER_URL}")
        log_to_database("info", f"Blog Critique Agent (Coral Protocol) connected to MCP server for user {user_id}")
        
        # Define agent-specific tools
        agent_tools = [
            fetch_pending_blogs,
            fetch_persona,
            fact_check_blog_with_perplexity,
            store_critique_report,
            list_fact_check_status
        ]
        
        # Get Coral tools using the new pattern
        coral_tools = client.get_tools()
        logger.info(f"Available Coral tools: {[tool.name for tool in coral_tools]}")
        log_to_database("info", f"Available Coral tools: {[tool.name for tool in coral_tools]}")
        
        # Combine Coral tools with agent-specific tools
        tools = coral_tools + agent_tools
        
        logger.info("Starting Blog Critique Agent (Coral Protocol) execution")
        log_to_database("info", "Starting Blog Critique Agent (Coral Protocol) execution")
        
        # Create the agent executor
        agent_executor = await create_blog_critique_agent(client, tools, agent_tools)
        
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
    log_to_database("info", "Blog Critique Agent started")
    
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
