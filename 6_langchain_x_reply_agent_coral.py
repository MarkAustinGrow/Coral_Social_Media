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
from datetime import datetime, timedelta
import tweepy
from tweepy.errors import TweepyException

import signal
import sys
import atexit
import agent_status_updater as asu
import agent_multiuser_utils_simple as amu
from user_twitter_credentials import create_user_twitter_client, has_user_twitter_credentials, get_user_twitter_username

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Agent name for database logging
AGENT_NAME = "X Reply Agent (Multi-User)"

# Get user context for user-specific MCP server
user_id = amu.get_user_context()

# Use centralized multi-user Coral server
base_url = "http://coral.8interns.com/devmode/exampleApplication/privkey/session1/sse"
params = {
    "waitForAgents": 2,
    "agentId": f"x_reply_agent_{user_id}",
    "agentDescription": f"You are x_reply_agent for user {user_id}, responsible for generating and posting replies to tweets using knowledge from Qdrant based on instructions from other agents"
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
        api_key=os.getenv("QDRANT_API_KEY", "")
    )
    
    # Initialize OpenAI embeddings
    embeddings = OpenAIEmbeddings(
        api_key=os.getenv("OPENAI_API_KEY")
    )
    
    # Ensure tweet_replies table exists in Supabase
    try:
        # Check if table exists by attempting to select from it
        supabase_client.table("tweet_replies").select("id").limit(1).execute()
        logger.info("Supabase table 'tweet_replies' exists")
    except Exception as e:
        logger.error(f"Error checking tweet_replies table: {str(e)}")
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

def get_user_twitter_client():
    """Get user-specific Twitter client."""
    user_id = amu.get_user_context()
    
    if not user_id:
        logger.error("No user context available for Twitter client")
        return None
    
    if not has_user_twitter_credentials(user_id):
        logger.warning(f"User {user_id} has not configured Twitter credentials")
        return None
    
    try:
        return create_user_twitter_client(user_id)
    except Exception as e:
        logger.error(f"Failed to create Twitter client for user {user_id}: {str(e)}")
        return None

def get_tools_description(tools):
    return "\n".join(
        f"Tool: {tool.name}, Schema: {json.dumps(tool.args).replace('{', '{{').replace('}', '}}')}"
        for tool in tools
    )

@tool
def get_mentions_and_replies(limit: int = 10, since_hours: int = 24):
    """
    Get recent mentions and replies to your Twitter accounts using user-specific credentials.
    
    Args:
        limit: Maximum number of mentions to return (default: 10)
        since_hours: Only get mentions from the last X hours (default: 24)
        
    Returns:
        Dictionary containing mentions and replies
    """
    user_id = amu.get_user_context()
    
    if not user_id:
        logger.error("No user context available for getting mentions")
        log_to_database("error", "No user context available for getting mentions")
        return {
            "error": "No user context available",
            "result": [],
            "count": 0
        }
    
    # Get user-specific Twitter client
    twitter_client = get_user_twitter_client()
    
    if not twitter_client:
        logger.warning(f"User {user_id} needs to configure Twitter credentials")
        log_to_database("warning", f"User {user_id} needs to configure Twitter credentials")
        return {
            "error": "User needs to configure Twitter credentials in the setup wizard",
            "result": [],
            "count": 0,
            "message": "Please configure your Twitter credentials to enable reply functionality"
        }
    
    try:
        log_to_database("info", f"Fetching mentions and replies for user {user_id} (limit: {limit}, since_hours: {since_hours})")
        
        # Get accounts to monitor from Supabase for this user
        accounts_result = supabase_client.table("x_accounts").select("username").eq("user_id", user_id).execute()
        accounts = [account["username"] for account in accounts_result.data] if accounts_result.data else []
        
        if not accounts:
            log_to_database("warning", f"No accounts found to monitor for user {user_id}")
            return {
                "error": "No accounts found to monitor",
                "result": [],
                "count": 0,
                "message": "Please add Twitter accounts to monitor in the accounts section"
            }
        
        username = get_user_twitter_username(user_id)
        logger.info(f"Using Twitter credentials for user {user_id} (@{username})")
        
        # Get mentions for each account
        mentions = []
        for target_username in accounts:
            try:
                # Get user ID from username
                user = twitter_client.get_user(username=target_username)
                if not user.data:
                    logger.warning(f"User not found: {target_username}")
                    log_to_database("warning", f"User not found: {target_username}")
                    continue
                
                target_user_id = user.data.id
                
                # Get mentions
                since_time = datetime.now() - timedelta(hours=since_hours)
                
                # Get mentions using user-specific Twitter API v2 client
                mentions_response = twitter_client.get_users_mentions(
                    id=target_user_id,
                    max_results=min(limit, 100),  # Twitter API limit
                    start_time=since_time.isoformat(),
                    expansions=["author_id", "referenced_tweets.id", "in_reply_to_user_id"],
                    tweet_fields=["created_at", "public_metrics", "text", "conversation_id"],
                    user_fields=["username", "name", "profile_image_url"]
                )
                
                if mentions_response.data:
                    for mention in mentions_response.data:
                        # Check if we've already replied to this mention (with user context)
                        reply_check = supabase_client.table("tweet_replies").select("id").eq("reply_to_tweet_id", str(mention.id)).eq("user_id", user_id).execute()
                        
                        if reply_check.data and len(reply_check.data) > 0:
                            # We've already replied to this mention
                            continue
                        
                        # Get author info
                        author = None
                        if mentions_response.includes and "users" in mentions_response.includes:
                            for user_info in mentions_response.includes["users"]:
                                if user_info.id == mention.author_id:
                                    author = user_info
                                    break
                        
                        mention_data = {
                            "id": mention.id,
                            "text": mention.text,
                            "created_at": mention.created_at.isoformat() if hasattr(mention, "created_at") else None,
                            "author_id": mention.author_id,
                            "author_username": author.username if author else None,
                            "author_name": author.name if author else None,
                            "conversation_id": mention.conversation_id if hasattr(mention, "conversation_id") else None,
                            "metrics": mention.public_metrics if hasattr(mention, "public_metrics") else {},
                            "mentioned_account": target_username
                        }
                        mentions.append(mention_data)
            
            except TweepyException as e:
                logger.error(f"Twitter API error for {target_username} (user {user_id}): {str(e)}")
                log_to_database("error", f"Twitter API error for {target_username} (user {user_id}): {str(e)}")
                continue
        
        log_to_database("info", f"Retrieved {len(mentions)} mentions and replies for user {user_id} (@{username})", {
            "count": len(mentions),
            "twitter_username": username,
            "monitored_accounts": accounts
        })
        
        return {
            "result": mentions,
            "count": len(mentions),
            "user_id": user_id,
            "twitter_username": username
        }
        
    except Exception as e:
        logger.error(f"Error getting mentions and replies for user {user_id}: {str(e)}")
        log_to_database("error", f"Error getting mentions and replies for user {user_id}: {str(e)}")
        return {
            "error": f"Failed to get mentions and replies: {str(e)}",
            "result": [],
            "count": 0
        }

@tool
def search_knowledge_for_reply(query: str, limit: int = 5):
    """
    Search Qdrant for relevant knowledge to use in a reply for the current user.
    
    Args:
        query: Search query
        limit: Maximum number of results to return (default: 5)
        
    Returns:
        Dictionary containing search results
    """
    user_id = amu.get_user_context()
    
    if not user_id:
        logger.error("No user context available for knowledge search")
        log_to_database("error", "No user context available for knowledge search")
        return {
            "error": "No user context available",
            "count": 0
        }
    
    try:
        log_to_database("info", f"Searching knowledge for reply for user {user_id}: {query[:50]}..." + (f" (limit: {limit})" if limit != 5 else ""))
        
        # Generate embedding for the query
        query_embedding = embeddings.embed_query(query)
        
        # Search in Qdrant with user-specific filtering
        search_results = qdrant_client.search(
            collection_name="tweet_insights",
            query_vector=query_embedding,
            query_filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="user_id",
                        match=models.MatchValue(value=user_id)
                    )
                ]
            ),
            limit=limit
        )
        
        # Extract results
        results = []
        for result in search_results:
            results.append({
                "tweet_id": result.payload.get("tweet_id"),
                "tweet_text": result.payload.get("tweet_text"),
                "analysis": result.payload.get("analysis"),
                "score": result.score,
                "user_id": result.payload.get("user_id")
            })
        
        log_to_database("info", f"Found {len(results)} relevant knowledge items for reply for user {user_id}")
        return {
            "result": results,
            "count": len(results),
            "user_id": user_id
        }
        
    except Exception as e:
        logger.error(f"Error searching knowledge for user {user_id}: {str(e)}")
        log_to_database("error", f"Error searching knowledge for user {user_id}: {str(e)}")
        return {
            "error": f"Failed to search knowledge: {str(e)}",
            "count": 0
        }

@tool
def generate_and_post_reply(tweet_id: str, tweet_text: str, author_username: str):
    """
    Generate and post a reply to a tweet using user-specific credentials and knowledge from Qdrant.
    
    Args:
        tweet_id: ID of the tweet to reply to
        tweet_text: Text of the tweet to reply to
        author_username: Username of the tweet author
        
    Returns:
        Dictionary containing the result of the operation
    """
    user_id = amu.get_user_context()
    
    if not user_id:
        logger.error("No user context available for generating reply")
        log_to_database("error", "No user context available for generating reply")
        return {
            "error": "No user context available",
            "result": None
        }
    
    # Get user-specific Twitter client
    twitter_client = get_user_twitter_client()
    
    if not twitter_client:
        logger.warning(f"User {user_id} needs to configure Twitter credentials")
        log_to_database("warning", f"User {user_id} needs to configure Twitter credentials")
        return {
            "error": "User needs to configure Twitter credentials in the setup wizard",
            "result": None,
            "message": "Please configure your Twitter credentials to enable reply functionality"
        }
    
    try:
        username = get_user_twitter_username(user_id)
        log_to_database("info", f"Generating reply to tweet from @{author_username} for user {user_id} (@{username})", {"tweet_id": tweet_id})
        
        # Search for relevant knowledge
        knowledge_response = search_knowledge_for_reply(query=tweet_text, limit=5)
        knowledge = knowledge_response.get("result", [])
        
        # Use OpenAI to generate a reply
        model = init_chat_model(
            model="gpt-4o-mini",
            model_provider="openai",
            api_key=os.getenv("OPENAI_API_KEY"),
            temperature=0.7
        )
        
        # Format knowledge for the prompt
        knowledge_text = ""
        for i, item in enumerate(knowledge):
            knowledge_text += f"\n{i+1}. Tweet: \"{item.get('tweet_text', '')}\"\n"
            if item.get('analysis'):
                for question, answer in item.get('analysis').items():
                    knowledge_text += f"   - {question}: {answer}\n"
        
        prompt = f"""
        # Tweet Reply Generation Task
        
        ## Tweet to Reply To
        - Author: @{author_username}
        - Content: "{tweet_text}"
        
        ## Relevant Knowledge
        {knowledge_text}
        
        ## Instructions
        Generate a reply to the tweet that:
        
        1. Is helpful, informative, and engaging
        2. Incorporates relevant knowledge from the provided information
        3. Maintains a conversational and friendly tone
        4. Is contextually appropriate to the conversation
        5. Is concise and to the point
        6. Represents the user's voice and expertise
        
        ## Constraints
        - Maximum 280 characters
        - Do not use hashtags unless they're highly relevant
        - Do not include "RT" or other Twitter-specific formatting
        - Do not address the person by their full Twitter handle, use their name or first name if available
        - Make the reply personal and authentic
        
        ## Output Format
        Return only the text of the reply, with no additional formatting or explanation.
        """
        
        response = model.invoke(prompt)
        
        # Extract the reply text
        reply_text = response.content.strip()
        
        # Ensure the reply is within the character limit
        if len(reply_text) > 280:
            reply_text = reply_text[:277] + "..."
        
        # Post the reply using user-specific Twitter API v2 client
        post_response = twitter_client.create_tweet(
            text=reply_text,
            in_reply_to_tweet_id=tweet_id
        )
        
        if post_response.data:
            # Store the reply in Supabase with user context
            reply_data = {
                "tweet_id": post_response.data.get("id"),
                "reply_to_tweet_id": tweet_id,
                "reply_content": reply_text,
                "status": "posted",
                "posted_at": datetime.now().isoformat(),
                "user_id": user_id  # CRITICAL: Associate with user
            }
            
            supabase_client.table("tweet_replies").insert(reply_data).execute()
            
            log_to_database("info", f"Successfully posted reply to tweet {tweet_id} for user {user_id} (@{username})", {
                "reply_tweet_id": post_response.data.get("id"),
                "twitter_username": username
            })
            
            return {
                "result": "Reply posted successfully",
                "tweet_id": post_response.data.get("id"),
                "reply_text": reply_text,
                "user_id": user_id,
                "twitter_username": username
            }
        else:
            log_to_database("error", f"Failed to post reply to tweet for user {user_id}")
            return {
                "error": "Failed to post reply",
                "result": None
            }
        
    except Exception as e:
        logger.error(f"Error generating and posting reply for user {user_id}: {str(e)}")
        log_to_database("error", f"Error generating and posting reply for user {user_id}: {str(e)}")
        return {
            "error": f"Failed to generate and post reply: {str(e)}",
            "result": None
        }

async def create_x_reply_agent(client, tools, agent_tools):
    tools_description = get_tools_description(tools)
    agent_tools_description = get_tools_description(agent_tools)
    
    # Get user context for user-specific prompt
    user_id = amu.get_user_context()
    
    # Coral Protocol version - listens for mentions instead of autonomous execution
    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            f"""You are an X Reply Agent operating in CORAL PROTOCOL mode for user {user_id}.
            
            IMPORTANT: You are operating in MULTI-USER mode. Each user has their own Twitter account and credentials.
            You will only reply to mentions using the current user's Twitter account and their personal knowledge base.
            
            CORAL PROTOCOL BEHAVIOR:
            You listen for instructions from other agents and respond via the Coral Protocol.
            
            Follow these steps in order:
            1. Call `wait_for_mentions` from coral tools (timeoutMs: 30000) to receive mentions from other agents.
            2. When you receive a mention, keep the thread ID and the sender ID.
            3. Parse the instruction in the message content. Look for requests like:
               - "reply to mentions"
               - "check for new mentions"
               - "respond to Twitter mentions"
               - "generate replies to tweets"
               - "handle Twitter interactions"
            4. Based on the instruction, use your tools to:
               a. Get recent mentions using `get_mentions_and_replies`
               b. For each mention that hasn't been replied to:
                  - Search for relevant knowledge using `search_knowledge_for_reply`
                  - Generate and post a reply using `generate_and_post_reply`
            5. Prepare a response with the results (number of mentions processed, replies posted, etc.)
            6. Use `send_message` from coral tools to send your response back to the sender in the same thread.
            7. Always respond back to the sender agent, even if there's an error.
            8. Wait for 2 seconds and repeat the process from step 1.
            
            If no mentions are received (timeout), simply continue waiting - do NOT perform autonomous actions.
            
            RESPONSE FORMAT:
            Always format your responses clearly:
            - Success: "Processed X mentions. Posted Y replies using user's Twitter account (@username)."
            - Error: "Unable to process mentions: [reason]. Please check Twitter credentials or try again later."
            - No mentions: "No new mentions found to reply to. All mentions are up to date."
            - No credentials: "User needs to configure Twitter credentials in the setup wizard."
            
            TWITTER REPLY FOCUS:
            When processing mentions for the current user, focus on:
            - Using the user's own Twitter account and credentials
            - Searching the user's personal knowledge base for relevant information
            - Generating helpful, informative, and engaging replies
            - Maintaining a conversational and friendly tone
            - Ensuring replies are contextually appropriate
            - Keeping replies concise and under 280 characters
            - Making replies personal and authentic to the user's voice
            - Handling cases where credentials aren't configured gracefully
            
            MULTI-USER CONSIDERATIONS:
            - Always use the current user's Twitter credentials and knowledge base
            - Ensure all replies are posted from the user's own Twitter account
            - Respect user data isolation - only access the current user's data
            - Handle cases where users haven't configured Twitter credentials gracefully
            
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
    # Check if user has Twitter credentials before starting
    user_id = amu.get_user_context()
    
    if not user_id:
        logger.error("No user context available. Cannot start X Reply Agent.")
        log_to_database("error", "No user context available. Cannot start X Reply Agent.")
        return
    
    if not has_user_twitter_credentials(user_id):
        logger.warning(f"User {user_id} has not configured Twitter credentials. Agent will wait for credentials to be configured.")
        log_to_database("warning", f"User {user_id} has not configured Twitter credentials. Agent will wait for credentials to be configured.")
    
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
    log_to_database("info", f"X Reply Agent (Multi-User) connected to MCP server for user {user_id}")
    
    # Define agent-specific tools (simplified)
    agent_tools = [
        get_mentions_and_replies,
        search_knowledge_for_reply,
        generate_and_post_reply
    ]
    
    # Get Coral tools using the new pattern
    coral_tools = client.get_tools()
    
    # Combine Coral tools with agent-specific tools
    tools = coral_tools + agent_tools
    
    # Create the agent executor
    agent_executor = await create_x_reply_agent(client, tools, agent_tools)
    
    logger.info("Starting X Reply Agent (Coral Protocol) execution")
    log_to_database("info", "Starting X Reply Agent (Coral Protocol) execution")
    
    # Single execution like the Interface Agent - let the agent handle its own conversation flow
    await agent_executor.ainvoke({})
    
    logger.info("X Reply Agent (Coral Protocol) execution completed")
    log_to_database("info", "X Reply Agent (Coral Protocol) execution completed")

if __name__ == "__main__":
    # Mark agent as started (use both old and new for compatibility)
    asu.mark_agent_started(AGENT_NAME)
    amu.mark_agent_started_with_user(AGENT_NAME)
    log_to_database("info", "X Reply Agent (Multi-User) started")
    
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
