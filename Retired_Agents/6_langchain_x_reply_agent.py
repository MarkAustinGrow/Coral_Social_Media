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
from langchain_community.embeddings import OpenAIEmbeddings
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


# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

base_url = "http://localhost:5555/devmode/exampleApplication/privkey/session1/sse"
params = {
    "waitForAgents": 7,  # Total number of agents in the system
    "agentId": "x_reply_agent",
    "agentDescription": "You are x_reply_agent, responsible for generating and posting replies to tweets using knowledge from Qdrant"
}
query_string = urllib.parse.urlencode(params)
MCP_SERVER_URL = f"{base_url}?{query_string}"

# Connection retry settings
MAX_RETRIES = 5
INITIAL_RETRY_DELAY = 2  # seconds
MAX_RETRY_DELAY = 30  # seconds

# Internal agent name for MCP
MCP_AGENT_NAME = "x_reply_agent"

# Initialize API clients
try:
    # Twitter API client
    twitter_client = tweepy.Client(
        bearer_token=os.getenv("TWITTER_BEARER_TOKEN"),
        consumer_key=os.getenv("TWITTER_API_KEY"),
        consumer_secret=os.getenv("TWITTER_API_SECRET"),
        access_token=os.getenv("TWITTER_ACCESS_TOKEN"),
        access_token_secret=os.getenv("TWITTER_ACCESS_SECRET")
    )
    
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
if not os.getenv("TWITTER_BEARER_TOKEN"):
    raise ValueError("TWITTER_BEARER_TOKEN is not set in environment variables.")
if not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_KEY"):
    raise ValueError("SUPABASE_URL or SUPABASE_KEY is not set in environment variables.")

# Agent name for status updates - must match exactly what's in the database
AGENT_NAME = "X Reply Agent"

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
def get_mentions_and_replies(limit: int = 10, since_hours: int = 24):
    """
    Get recent mentions and replies to your Twitter accounts.
    
    Args:
        limit: Maximum number of mentions to return (default: 10)
        since_hours: Only get mentions from the last X hours (default: 24)
        
    Returns:
        Dictionary containing mentions and replies
    """
    try:
        # Get accounts to monitor from Supabase
        accounts_result = supabase_client.table("x_accounts").select("username").execute()
        accounts = [account["username"] for account in accounts_result.data] if accounts_result.data else []
        
        if not accounts:
            return {
                "error": "No accounts found to monitor",
                "result": [],
                "count": 0
            }
        
        # Get mentions for each account
        mentions = []
        for username in accounts:
            try:
                # Get user ID from username
                user = twitter_client.get_user(username=username)
                if not user.data:
                    logger.warning(f"User not found: {username}")
                    continue
                
                user_id = user.data.id
                
                # Get mentions
                since_time = datetime.now() - timedelta(hours=since_hours)
                
                # Get mentions using Twitter API v2
                mentions_response = twitter_client.get_users_mentions(
                    id=user_id,
                    max_results=limit,
                    start_time=since_time.isoformat(),
                    expansions=["author_id", "referenced_tweets.id", "in_reply_to_user_id"],
                    tweet_fields=["created_at", "public_metrics", "text", "conversation_id"],
                    user_fields=["username", "name", "profile_image_url"]
                )
                
                if mentions_response.data:
                    for mention in mentions_response.data:
                        # Check if we've already replied to this mention
                        reply_check = supabase_client.table("tweet_replies").select("id").eq("reply_to_tweet_id", str(mention.id)).execute()
                        
                        if reply_check.data and len(reply_check.data) > 0:
                            # We've already replied to this mention
                            continue
                        
                        # Get author info
                        author = None
                        if mentions_response.includes and "users" in mentions_response.includes:
                            for user in mentions_response.includes["users"]:
                                if user.id == mention.author_id:
                                    author = user
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
                            "mentioned_account": username
                        }
                        mentions.append(mention_data)
            
            except TweepyException as e:
                logger.error(f"Twitter API error for {username}: {str(e)}")
                continue
        
        return {
            "result": mentions,
            "count": len(mentions)
        }
        
    except Exception as e:
        logger.error(f"Error getting mentions and replies: {str(e)}")
        return {
            "error": f"Failed to get mentions and replies: {str(e)}",
            "result": [],
            "count": 0
        }

@tool
def get_conversation_context(tweet_id: str, limit: int = 5):
    """
    Get the conversation context for a tweet.
    
    Args:
        tweet_id: ID of the tweet to get context for
        limit: Maximum number of tweets to return in the conversation (default: 5)
        
    Returns:
        Dictionary containing the conversation context
    """
    try:
        # Get the conversation using Twitter API v2
        conversation = twitter_client.get_tweet(
            id=tweet_id,
            expansions=["author_id", "referenced_tweets.id", "in_reply_to_user_id"],
            tweet_fields=["created_at", "public_metrics", "text", "conversation_id"],
            user_fields=["username", "name", "profile_image_url"]
        )
        
        if not conversation.data:
            return {
                "error": f"Tweet with ID {tweet_id} not found",
                "result": None
            }
        
        # Get the conversation ID
        conversation_id = conversation.data.conversation_id if hasattr(conversation.data, "conversation_id") else None
        
        if not conversation_id:
            return {
                "result": {
                    "tweets": [
                        {
                            "id": conversation.data.id,
                            "text": conversation.data.text,
                            "created_at": conversation.data.created_at.isoformat() if hasattr(conversation.data, "created_at") else None,
                            "author_id": conversation.data.author_id,
                            "author_username": None,
                            "author_name": None
                        }
                    ],
                    "count": 1
                }
            }
        
        # Get the conversation thread
        thread_response = twitter_client.search_recent_tweets(
            query=f"conversation_id:{conversation_id}",
            max_results=limit,
            expansions=["author_id", "referenced_tweets.id", "in_reply_to_user_id"],
            tweet_fields=["created_at", "public_metrics", "text", "conversation_id"],
            user_fields=["username", "name", "profile_image_url"]
        )
        
        tweets = []
        
        # Add the original tweet
        tweets.append({
            "id": conversation.data.id,
            "text": conversation.data.text,
            "created_at": conversation.data.created_at.isoformat() if hasattr(conversation.data, "created_at") else None,
            "author_id": conversation.data.author_id,
            "author_username": None,
            "author_name": None,
            "is_original": True
        })
        
        # Add the thread tweets
        if thread_response.data:
            for tweet in thread_response.data:
                # Skip the original tweet
                if tweet.id == conversation.data.id:
                    continue
                
                # Get author info
                author = None
                if thread_response.includes and "users" in thread_response.includes:
                    for user in thread_response.includes["users"]:
                        if user.id == tweet.author_id:
                            author = user
                            break
                
                tweet_data = {
                    "id": tweet.id,
                    "text": tweet.text,
                    "created_at": tweet.created_at.isoformat() if hasattr(tweet, "created_at") else None,
                    "author_id": tweet.author_id,
                    "author_username": author.username if author else None,
                    "author_name": author.name if author else None,
                    "is_original": False
                }
                tweets.append(tweet_data)
        
        # Sort tweets by created_at
        tweets.sort(key=lambda x: x.get("created_at", ""))
        
        return {
            "result": {
                "tweets": tweets,
                "count": len(tweets)
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting conversation context: {str(e)}")
        return {
            "error": f"Failed to get conversation context: {str(e)}",
            "result": None
        }

@tool
def search_knowledge_for_reply(query: str, limit: int = 5):
    """
    Search Qdrant for relevant knowledge to use in a reply.
    
    Args:
        query: Search query
        limit: Maximum number of results to return (default: 5)
        
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
        logger.error(f"Error searching knowledge: {str(e)}")
        return {
            "error": f"Failed to search knowledge: {str(e)}",
            "count": 0
        }

@tool
def generate_reply(tweet: dict, conversation_context: dict, knowledge: list, max_length: int = 280):
    """
    Generate a reply to a tweet using knowledge from Qdrant.
    
    Args:
        tweet: Tweet to reply to
        conversation_context: Conversation context
        knowledge: Knowledge from Qdrant
        max_length: Maximum length of the reply (default: 280)
        
    Returns:
        Dictionary containing the generated reply
    """
    try:
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
        
        # Format conversation context for the prompt
        conversation_text = ""
        if conversation_context and "tweets" in conversation_context:
            for i, tweet_ctx in enumerate(conversation_context["tweets"]):
                prefix = "Original Tweet" if tweet_ctx.get("is_original") else f"Reply {i}"
                author = tweet_ctx.get("author_username", "Unknown")
                conversation_text += f"\n{prefix} by @{author}: \"{tweet_ctx.get('text', '')}\"\n"
        
        prompt = f"""
        # Tweet Reply Generation Task
        
        ## Tweet to Reply To
        - Author: @{tweet.get("author_username", "Unknown")}
        - Content: "{tweet.get("text", "")}"
        
        ## Conversation Context
        {conversation_text}
        
        ## Relevant Knowledge
        {knowledge_text}
        
        ## Instructions
        Generate a reply to the tweet that:
        
        1. Is helpful, informative, and engaging
        2. Incorporates relevant knowledge from the provided information
        3. Maintains a conversational and friendly tone
        4. Is contextually appropriate to the conversation
        5. Is concise and to the point
        
        ## Constraints
        - Maximum {max_length} characters
        - Do not use hashtags unless they're highly relevant
        - Do not include "RT" or other Twitter-specific formatting
        - Do not address the person by their full Twitter handle, use their name or first name if available
        
        ## Output Format
        Return only the text of the reply, with no additional formatting or explanation.
        """
        
        response = model.invoke(prompt)
        
        # Extract the reply text
        reply_text = response.content.strip()
        
        # Ensure the reply is within the character limit
        if len(reply_text) > max_length:
            reply_text = reply_text[:max_length-3] + "..."
        
        return {
            "result": reply_text,
            "length": len(reply_text)
        }
        
    except Exception as e:
        logger.error(f"Error generating reply: {str(e)}")
        return {
            "error": f"Failed to generate reply: {str(e)}",
            "result": None
        }

@tool
def post_reply(tweet_id: str, reply_text: str):
    """
    Post a reply to a tweet.
    
    Args:
        tweet_id: ID of the tweet to reply to
        reply_text: Text of the reply
        
    Returns:
        Dictionary containing the result of the operation
    """
    try:
        # Post the reply using Twitter API v2
        response = twitter_client.create_tweet(
            text=reply_text,
            in_reply_to_tweet_id=tweet_id
        )
        
        if response.data:
            # Store the reply in Supabase
            reply_data = {
                "tweet_id": response.data.get("id"),
                "reply_to_tweet_id": tweet_id,
                "reply_content": reply_text,
                "status": "posted",
                "posted_at": datetime.now().isoformat()
            }
            
            supabase_client.table("tweet_replies").insert(reply_data).execute()
            
            return {
                "result": "Reply posted successfully",
                "tweet_id": response.data.get("id")
            }
        else:
            return {
                "error": "Failed to post reply",
                "result": None
            }
        
    except Exception as e:
        logger.error(f"Error posting reply: {str(e)}")
        return {
            "error": f"Failed to post reply: {str(e)}",
            "result": None
        }

async def create_x_reply_agent(client, tools, agent_tools):
    tools_description = get_tools_description(tools)
    agent_tools_description = get_tools_description(agent_tools)
    
    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            f"""You are x_reply_agent, responsible for generating and posting replies to tweets using knowledge from Qdrant.
            
            Follow these steps in order:
            1. Call wait_for_mentions from coral tools (timeoutMs: 8000) to receive instructions from other agents
            2. If you receive a mention:
               a. Process the instruction (e.g., reply to a specific tweet)
               b. Execute the requested operation using your tools
               c. Send a response back to the sender with the results
            3. If no mentions are received (timeout):
               a. Check for new mentions and replies using get_mentions_and_replies
               b. For each mention:
                  i. Get the conversation context using get_conversation_context
                  ii. Search for relevant knowledge using search_knowledge_for_reply with the tweet text as the query
                  iii. Generate a reply using generate_reply
                  iv. Post the reply using post_reply
            4. Wait for 2 seconds and repeat the process
            
            When generating replies, focus on:
            - Being helpful and informative
            - Incorporating relevant knowledge from Qdrant
            - Maintaining a conversational and friendly tone
            - Being contextually appropriate to the conversation
            
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
                    get_mentions_and_replies,
                    get_conversation_context,
                    search_knowledge_for_reply,
                    generate_reply,
                    post_reply
                ]
                
                # Combine Coral tools with agent-specific tools
                tools = client.get_tools() + agent_tools
                
                # Create and run the agent
                agent_executor = await create_x_reply_agent(client, tools, agent_tools)
                
                # Inner loop for agent invocations
                while True:
                    try:
                        # Send heartbeat to indicate agent is still running
                        asu.send_heartbeat(AGENT_NAME)
                        
                        logger.info("Starting new agent invocation")
                        await agent_executor.ainvoke({"agent_scratchpad": []})
                        logger.info("Completed agent invocation, restarting loop")
                        
                        # Short sleep between invocations
                        await asyncio.sleep(1)
                        
                    except ClosedResourceError as e:
                        # Connection closed, break inner loop to reconnect
                        logger.error(f"Connection closed: {str(e)}")
                        asu.report_warning(AGENT_NAME, f"Connection closed: {str(e)}", 50)
                        break
                        
                    except Exception as e:
                        # Other errors, log and continue
                        logger.error(f"Error in agent loop: {str(e)}")
                        asu.report_warning(AGENT_NAME, f"Error in agent loop: {str(e)}", 75)
                        await asyncio.sleep(2)
                
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
