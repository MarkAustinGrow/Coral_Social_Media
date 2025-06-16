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

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Use the same waitForAgents=2 as the World News Agent
base_url = "http://localhost:5555/devmode/exampleApplication/privkey/session1/sse"
params = {
    "waitForAgents": 2,  # Same as World News Agent
    "agentId": "x_reply_agent",
    "agentDescription": "You are x_reply_agent, responsible for generating and posting replies to tweets using knowledge from Qdrant"
}
query_string = urllib.parse.urlencode(params)
MCP_SERVER_URL = f"{base_url}?{query_string}"

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
def generate_and_post_reply(tweet_id: str, tweet_text: str, author_username: str):
    """
    Generate and post a reply to a tweet using knowledge from Qdrant.
    
    Args:
        tweet_id: ID of the tweet to reply to
        tweet_text: Text of the tweet to reply to
        author_username: Username of the tweet author
        
    Returns:
        Dictionary containing the result of the operation
    """
    try:
        # Search for relevant knowledge
        knowledge_response = search_knowledge_for_reply.invoke({"query": tweet_text})
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
        
        ## Constraints
        - Maximum 280 characters
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
        if len(reply_text) > 280:
            reply_text = reply_text[:277] + "..."
        
        # Post the reply using Twitter API v2
        post_response = twitter_client.create_tweet(
            text=reply_text,
            in_reply_to_tweet_id=tweet_id
        )
        
        if post_response.data:
            # Store the reply in Supabase
            reply_data = {
                "tweet_id": post_response.data.get("id"),
                "reply_to_tweet_id": tweet_id,
                "reply_content": reply_text,
                "status": "posted",
                "posted_at": datetime.now().isoformat()
            }
            
            supabase_client.table("tweet_replies").insert(reply_data).execute()
            
            return {
                "result": "Reply posted successfully",
                "tweet_id": post_response.data.get("id"),
                "reply_text": reply_text
            }
        else:
            return {
                "error": "Failed to post reply",
                "result": None
            }
        
    except Exception as e:
        logger.error(f"Error generating and posting reply: {str(e)}")
        return {
            "error": f"Failed to generate and post reply: {str(e)}",
            "result": None
        }

async def create_x_reply_agent(client, tools, agent_tools):
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
        
        # Define agent-specific tools (simplified)
        agent_tools = [
            get_mentions_and_replies,
            search_knowledge_for_reply,
            generate_and_post_reply
        ]
        
        # Combine Coral tools with agent-specific tools
        tools = client.get_tools() + agent_tools
        
        # Create and run the agent
        agent_executor = await create_x_reply_agent(client, tools, agent_tools)
        
        # Use the same main loop as the World News Agent
        while True:
            try:
                logger.info("Starting new agent invocation")
                await agent_executor.ainvoke({"agent_scratchpad": []})
                logger.info("Completed agent invocation, restarting loop")
                await asyncio.sleep(1)
            except Exception as e:
                logger.error(f"Error in agent loop: {str(e)}")
                await asyncio.sleep(5)

if __name__ == "__main__":
    logger.info("X Reply Agent (Simple) started")
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("X Reply Agent stopped by user")
    except Exception as e:
        logger.error(f"Fatal error: {str(e)}")
        raise
    finally:
        logger.info("X Reply Agent stopped")
