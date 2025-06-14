import asyncio
import os
import json
import logging
import time
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_core.prompts import ChatPromptTemplate
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
    "agentId": "tweet_research_agent",
    "agentDescription": "You are tweet_research_agent, responsible for analyzing tweets, extracting insights, and storing them for future reference"
}
query_string = urllib.parse.urlencode(params)
MCP_SERVER_URL = f"{base_url}?{query_string}"

AGENT_NAME = "tweet_research_agent"

# Initialize API clients
try:
    # Supabase client
    supabase_client = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_KEY")
    )
    
    # Qdrant client
    # Note: Using HTTP for development environment. In production, use HTTPS with proper certificates.
    qdrant_client = QdrantClient(
        url=os.getenv("QDRANT_URL", "http://localhost:6333"),
        api_key=os.getenv("QDRANT_API_KEY", ""),
        https=False  # Set to True in production with proper certificates
    )
    
    # Initialize OpenAI embeddings
    embeddings = OpenAIEmbeddings(
        api_key=os.getenv("OPENAI_API_KEY")
    )
    
    # Ensure Qdrant collection exists
    try:
        qdrant_client.get_collection("tweet_insights")
        logger.info("Qdrant collection 'tweet_insights' already exists")
    except Exception:
        logger.info("Creating Qdrant collection 'tweet_insights'")
        qdrant_client.create_collection(
            collection_name="tweet_insights",
            vectors_config=models.VectorParams(
                size=1536,  # OpenAI embeddings dimension
                distance=models.Distance.COSINE
            )
        )
except Exception as e:
    logger.error(f"Error initializing API clients: {str(e)}")
    raise

# Validate API keys
if not os.getenv("OPENAI_API_KEY"):
    raise ValueError("OPENAI_API_KEY is not set in environment variables.")
if not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_KEY"):
    raise ValueError("SUPABASE_URL or SUPABASE_KEY is not set in environment variables.")
if not os.getenv("PERPLEXITY_API_KEY"):
    raise ValueError("PERPLEXITY_API_KEY is not set in environment variables.")

# Agent name for status updates - must match exactly what's in the database
AGENT_NAME = "Tweet Research Agent"

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
def fetch_tweets_from_supabase(limit: int = 1, analyzed: bool = False):
    """
    Fetch tweets from Supabase that need analysis.
    
    Args:
        limit: Maximum number of tweets to fetch (default: 20)
        analyzed: Whether to fetch already analyzed tweets (default: False)
        
    Returns:
        Dictionary containing fetched tweets
    """
    logger.info(f"Fetching {limit} tweets with analyzed={analyzed}")
    
    try:
        # Fetch tweets from Supabase
        query = supabase_client.table("tweets_cache").select("*")
        
        if not analyzed:
            query = query.eq("analyzed", False)
            
        query = query.order("inserted_at", desc=True).limit(limit)
        
        result = query.execute()
        
        tweets = result.data if result.data else []
        
        return {
            "result": tweets,
            "count": len(tweets)
        }
        
    except Exception as e:
        logger.error(f"Error fetching tweets from Supabase: {str(e)}")
        return {
            "error": f"Failed to fetch tweets: {str(e)}",
            "count": 0
        }

@tool
def mark_tweet_as_analyzed(tweet_ids: list):
    """
    Mark tweets as analyzed in Supabase.
    
    Args:
        tweet_ids: List of tweet IDs to mark as analyzed
        
    Returns:
        Dictionary containing operation result
    """
    try:
        # Update tweets in Supabase
        for tweet_id in tweet_ids:
            supabase_client.table("tweets_cache").update(
                {"analyzed": True}
            ).eq("tweet_id", tweet_id).execute()
        
        return {
            "result": f"Marked {len(tweet_ids)} tweets as analyzed",
            "count": len(tweet_ids)
        }
        
    except Exception as e:
        logger.error(f"Error marking tweets as analyzed: {str(e)}")
        return {
            "error": f"Failed to mark tweets as analyzed: {str(e)}",
            "count": 0
        }

@tool
def analyze_tweet_perplexity(tweet_text: str, question: str, persona: dict = None):
    """
    Use Perplexity to analyze tweet content with a single focused question.
    
    Args:
        tweet_text: The text of the tweet to analyze
        question: The research question to ask about the tweet
        persona: Optional persona details to customize the analysis style
        
    Returns:
        Dictionary containing analysis result
    """
    logger.info(f"Analyzing tweet with Perplexity: {tweet_text[:50]}...")
    logger.info(f"Research question: {question}")
    
    try:
        # Use default persona if none provided
        if not persona:
            persona_response = fetch_persona.invoke({})
            persona = persona_response.get("result", {})
        
        # Customize prompt based on persona
        tone_descriptor = "formal" if persona.get("tone", 50) > 70 else "conversational" if persona.get("tone", 50) < 30 else "balanced"
        humor_descriptor = "serious" if persona.get("humor", 50) < 30 else "light-hearted" if persona.get("humor", 50) > 70 else "occasionally humorous"
        enthusiasm_descriptor = "enthusiastic" if persona.get("enthusiasm", 50) > 70 else "reserved" if persona.get("enthusiasm", 50) < 30 else "moderately enthusiastic"
        assertiveness_descriptor = "confident and direct" if persona.get("assertiveness", 50) > 70 else "tentative and nuanced" if persona.get("assertiveness", 50) < 30 else "balanced"
        
        api_key = os.getenv("PERPLEXITY_API_KEY")
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Use a default question if none provided
        if not question or len(question.strip()) == 0:
            question = "What is the author of this tweet truly trying to communicate?"
            logger.warning("No question provided, using default question")
        
        prompt = f"Tweet: \"{tweet_text}\"\n\nQuestion: {question}\n\nPlease analyze this tweet in a {tone_descriptor} tone, with a {humor_descriptor} approach, maintaining a {enthusiasm_descriptor} energy level, and presenting your analysis in a {assertiveness_descriptor} manner."
        
        system_prompt = f"You are {persona.get('name', 'Content Reviewer')}, {persona.get('description', 'a meticulous and objective reviewer who prioritizes factual accuracy, logical consistency, and narrative flow in all content.')} Provide a thoughtful, insightful response that helps understand the author's true intent and the broader context of this tweet."
        
        data = {
            "model": "sonar",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ]
        }
        
        response = requests.post(
            "https://api.perplexity.ai/chat/completions",
            headers=headers,
            json=data
        )
        
        if response.status_code == 200:
            try:
                response_data = response.json()
                
                # Log the full response for debugging
                logger.debug(f"Perplexity API response: {json.dumps(response_data)}")
                
                # Correctly extract the content from the response
                if "choices" in response_data and len(response_data["choices"]) > 0:
                    if "message" in response_data["choices"][0] and "content" in response_data["choices"][0]["message"]:
                        answer = response_data["choices"][0]["message"]["content"]
                        
                        # Log the analysis result
                        logger.info(f"Analysis result: {answer[:200]}...")
                        
                        return {
                            "question": question,
                            "answer": answer
                        }
                    else:
                        logger.error(f"Unexpected response structure - missing message.content: {response_data}")
                        return {
                            "question": question,
                            "answer": "Error: Unexpected response structure"
                        }
                else:
                    logger.error(f"Unexpected response structure - missing choices: {response_data}")
                    return {
                        "question": question,
                        "answer": "Error: Unexpected response structure"
                    }
            except Exception as e:
                logger.error(f"Error parsing Perplexity API response: {str(e)}")
                logger.error(f"Response text: {response.text}")
                return {
                    "question": question,
                    "answer": f"Error parsing response: {str(e)}"
                }
        else:
            logger.error(f"Perplexity API error: {response.status_code} - {response.text}")
            return {
                "question": question,
                "answer": f"Error: {response.status_code}"
            }
        
    except Exception as e:
        logger.error(f"Error analyzing tweet with Perplexity: {str(e)}")
        return {
            "error": f"Failed to analyze tweet: {str(e)}",
            "question": question,
            "answer": "Error occurred during analysis"
        }

@tool
def store_analysis_qdrant(tweet_id: str, tweet_text: str, question: str, analysis_result: str, metadata: dict = None):
    """
    Store tweet analysis in Qdrant vector database with enhanced metadata for better searchability.
    
    Args:
        tweet_id: ID of the tweet
        tweet_text: Text of the tweet
        question: The research question that was asked
        analysis_result: The answer from Perplexity
        metadata: Additional metadata to store (optional)
        
    Returns:
        Dictionary containing operation result
    """
    try:
        # Prepare the text for embedding
        analysis_text = f"{tweet_text}\n\nQuestion: {question}\n\nAnswer: {analysis_result}"
        
        # Generate embedding
        embedding = embeddings.embed_query(analysis_text)
        
        # Extract author from metadata if available
        author = None
        if metadata and "author" in metadata:
            author = metadata.get("author")
        
        # Extract topics and sentiment from analysis
        topics = []
        sentiment = "neutral"
        
        # Try to extract topics from analysis
        try:
            # Extract topics from the analysis result
            topic_words = ["finance", "crypto", "technology", "politics", "economy", 
                          "business", "markets", "investing", "blockchain", "bitcoin",
                          "ethereum", "stocks", "trading", "economics", "policy"]
            
            for word in topic_words:
                if word.lower() in analysis_result.lower() and word not in topics:
                    topics.append(word)
            
            # Extract sentiment from analysis result
            if "positive" in analysis_result.lower() or "optimistic" in analysis_result.lower() or "bullish" in analysis_result.lower():
                sentiment = "positive"
            elif "negative" in analysis_result.lower() or "pessimistic" in analysis_result.lower() or "bearish" in analysis_result.lower():
                sentiment = "negative"
        except Exception as e:
            logger.warning(f"Error extracting topics and sentiment: {str(e)}")
        
        # If no topics were found, try to extract from tweet text
        if not topics:
            for word in topic_words:
                if word.lower() in tweet_text.lower() and word not in topics:
                    topics.append(word)
        
        # Prepare enhanced payload
        if metadata is None:
            metadata = {}
            
        # Create structured payload with searchable fields
        payload = {
            "tweet_id": tweet_id,
            "tweet_text": tweet_text,
            "author": author,
            "topics": topics,
            "sentiment": sentiment,
            "question": question,
            "analysis": analysis_result,
            "custom_metadata": metadata,  # Store original metadata
            "timestamp": time.time(),
            "date": time.strftime("%Y-%m-%d", time.localtime())
        }
        
        # Convert tweet_id to a valid Qdrant point ID
        # Use a hash function to convert the string to an integer
        import hashlib
        # Get the first 8 bytes of the MD5 hash and convert to integer
        point_id = int(hashlib.md5(tweet_id.encode()).hexdigest()[:16], 16)
        
        # Store in Qdrant
        qdrant_client.upsert(
            collection_name="tweet_insights",
            points=[
                models.PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload=payload
                )
            ]
        )
        
        return {
            "result": f"Successfully stored analysis for tweet {tweet_id} in Qdrant"
        }
        
    except Exception as e:
        logger.error(f"Error storing analysis in Qdrant: {str(e)}")
        return {
            "error": f"Failed to store analysis in Qdrant: {str(e)}"
        }

@tool
def search_qdrant(query: str, limit: int = 5, filter_by: dict = None):
    """
    Search for similar insights in Qdrant with optional filtering.
    
    Args:
        query: Search query
        limit: Maximum number of results to return (default: 5)
        filter_by: Optional dictionary for filtering results by metadata fields
                  Example: {"topics": "crypto", "sentiment": "positive"}
        
    Returns:
        Dictionary containing search results
    """
    try:
        # Generate embedding for the query
        query_embedding = embeddings.embed_query(query)
        
        # Prepare filter if provided
        search_filter = None
        if filter_by:
            filter_conditions = []
            
            # Add topic filter if provided
            if "topics" in filter_by:
                topic = filter_by["topics"]
                filter_conditions.append(
                    models.FieldCondition(
                        key="topics",
                        match=models.MatchAny(any=[topic])
                    )
                )
            
            # Add sentiment filter if provided
            if "sentiment" in filter_by:
                sentiment = filter_by["sentiment"]
                filter_conditions.append(
                    models.FieldCondition(
                        key="sentiment",
                        match=models.MatchValue(value=sentiment)
                    )
                )
            
            # Add author filter if provided
            if "author" in filter_by:
                author = filter_by["author"]
                filter_conditions.append(
                    models.FieldCondition(
                        key="author",
                        match=models.MatchValue(value=author)
                    )
                )
            
            # Add date filter if provided
            if "date" in filter_by:
                date = filter_by["date"]
                filter_conditions.append(
                    models.FieldCondition(
                        key="date",
                        match=models.MatchValue(value=date)
                    )
                )
            
            # Combine all conditions with "must" (AND)
            if filter_conditions:
                search_filter = models.Filter(
                    must=filter_conditions
                )
        
        # Search in Qdrant with optional filter
        search_results = qdrant_client.search(
            collection_name="tweet_insights",
            query_vector=query_embedding,
            limit=limit,
            filter=search_filter
        )
        
        # Extract results with enhanced metadata
        results = []
        for result in search_results:
            results.append({
                "tweet_id": result.payload.get("tweet_id"),
                "tweet_text": result.payload.get("tweet_text"),
                "author": result.payload.get("author"),
                "topics": result.payload.get("topics", []),
                "sentiment": result.payload.get("sentiment"),
                "date": result.payload.get("date"),
                "analysis": result.payload.get("analysis"),
                "score": result.score
            })
        
        return {
            "result": results,
            "count": len(results)
        }
        
    except Exception as e:
        logger.error(f"Error searching in Qdrant: {str(e)}")
        return {
            "error": f"Failed to search in Qdrant: {str(e)}",
            "count": 0
        }

@tool
def generate_research_question(tweet_text: str, persona: dict = None):
    """
    Generate a single focused research question to understand the author's intent in a tweet.
    
    Args:
        tweet_text: The text of the tweet
        persona: Optional persona details to customize the question generation style
        
    Returns:
        Dictionary containing the generated question
    """
    try:
        # Use default persona if none provided
        if not persona:
            persona_response = fetch_persona.invoke({})
            persona = persona_response.get("result", {})
        
        # Customize prompt based on persona
        tone_descriptor = "formal" if persona.get("tone", 50) > 70 else "conversational" if persona.get("tone", 50) < 30 else "balanced"
        humor_descriptor = "serious" if persona.get("humor", 50) < 30 else "light-hearted" if persona.get("humor", 50) > 70 else "occasionally humorous"
        enthusiasm_descriptor = "enthusiastic" if persona.get("enthusiasm", 50) > 70 else "reserved" if persona.get("enthusiasm", 50) < 30 else "moderately enthusiastic"
        assertiveness_descriptor = "confident and direct" if persona.get("assertiveness", 50) > 70 else "tentative and nuanced" if persona.get("assertiveness", 50) < 30 else "balanced"
        
        # Use OpenAI to generate a focused question
        model = init_chat_model(
            model="gpt-4o-mini",
            model_provider="openai",
            api_key=os.getenv("OPENAI_API_KEY"),
            temperature=0.7
        )
        
        system_prompt = f"You are {persona.get('name', 'Content Reviewer')}, {persona.get('description', 'a meticulous and objective reviewer who prioritizes factual accuracy, logical consistency, and narrative flow in all content.')} Generate a research question in a {tone_descriptor} tone, with a {humor_descriptor} approach, maintaining a {enthusiasm_descriptor} energy level, and presenting your question in a {assertiveness_descriptor} manner."
        
        prompt = f"""
        Given the following tweet, generate ONE focused research question that would help understand what the author is truly trying to communicate:
        
        Tweet: "{tweet_text}"
        
        Your question should aim to uncover:
        - The author's underlying intent or message
        - Any implicit assumptions or beliefs
        - The broader context that gives this tweet meaning
        
        Focus on generating a single, thoughtful question that gets to the heart of what this tweet is really about.
        
        Return ONLY the question text, with no additional formatting or explanation.
        """
        
        response = model.invoke(prompt)
        
        # Clean up the response to get just the question
        question = response.content.strip().strip('"\'').strip()
        
        # Log the generated question
        logger.info(f"Generated research question: {question}")
        
        return {
            "result": question
        }
        
    except Exception as e:
        logger.error(f"Error generating research question: {str(e)}")
        return {
            "error": f"Failed to generate research question: {str(e)}",
            "result": "What is the author of this tweet truly trying to communicate?"
        }

async def create_tweet_research_agent(client, tools, agent_tools):
    tools_description = get_tools_description(tools)
    agent_tools_description = get_tools_description(agent_tools)
    
    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            f"""You are tweet_research_agent, responsible for analyzing tweets, extracting insights, and storing them for future reference.
            
            Follow these steps in order:
            1. Call wait_for_mentions from coral tools (timeoutMs: 8000) to receive instructions from other agents
            2. If you receive a mention:
               a. Process the instruction (e.g., analyze specific tweets, search for insights)
               b. Execute the requested operation using your tools
               c. Send a response back to the sender with the results
            3. If no mentions are received (timeout):
               a. Fetch ONE unanalyzed tweet from Supabase using fetch_tweets_from_supabase (limit=1)
               b. If a tweet is found:
                  i. Generate a single focused research question using generate_research_question and save the returned question
                  ii. Use Perplexity to analyze the tweet by passing the tweet_text AND the question to analyze_tweet_perplexity
                  iii. Store the analysis in Qdrant using store_analysis_qdrant with the tweet_id, tweet_text, question, and analysis result
                  iv. Mark the tweet as analyzed using mark_tweet_as_analyzed
               c. Wait for 5 minutes before processing the next tweet (to avoid API rate limits)
            
            Your goal is to understand what the author of each tweet is truly trying to communicate. Focus on:
            - The author's underlying intent or message
            - Any implicit assumptions or beliefs
            - The broader context that gives the tweet meaning
            
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
                    fetch_tweets_from_supabase,
                    mark_tweet_as_analyzed,
                    analyze_tweet_perplexity,
                    store_analysis_qdrant,
                    search_qdrant,
                    generate_research_question
                ]
                
                # Combine Coral tools with agent-specific tools
                tools = client.get_tools() + agent_tools
                
                # Create and run the agent
                agent_executor = await create_tweet_research_agent(client, tools, agent_tools)
                
                while True:
                    try:
                        logger.info("Starting new agent invocation")
                        await agent_executor.ainvoke({"agent_scratchpad": []})
                        logger.info("Completed agent invocation, waiting 5 minutes before next tweet")
                        await asyncio.sleep(300)  # Wait 5 minutes between processing tweets
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
        try:
        # Mark agent as started
    asu.mark_agent_started(AGENT_NAME)
    
    asyncio.run(main())
        except Exception as e:
                # Report error in status
                asu.report_error(AGENT_NAME, f"Fatal error: {str(e)}")
                
                # Re-raise the exception
                raise
        finally:
                # Mark agent as stopped
                asu.mark_agent_stopped(AGENT_NAME)
