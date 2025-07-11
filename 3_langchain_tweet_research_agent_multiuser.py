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
import agent_multiuser_utils_simple as amu

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Agent name for database logging
AGENT_NAME = "Tweet Research Agent"

# Load environment variables
load_dotenv()

# Get user context for user-specific MCP server
user_id = amu.get_user_context()

# Handle case where user_id is None (direct command line execution)
if user_id is None:
    user_id = "3b55275a-d666-4724-ae39-26a58fda3aff"  # Default test user
    print(f"⚠️  No user context found, using default test user: {user_id}")

# Use centralized multi-user Coral server
base_url = "http://coral.8interns.com/devmode/exampleApplication/privkey/session1/sse"
params = {
    "waitForAgents": 2,
    "agentId": f"tweet_research_agent_{user_id}",
    "agentDescription": f"You are tweet_research_agent for user {user_id}, responsible for analyzing tweets, extracting insights, and storing them for future reference"
}
query_string = urllib.parse.urlencode(params)
MCP_SERVER_URL = f"{base_url}?{query_string}"

print(f"🔗 Using centralized MCP server: {MCP_SERVER_URL}")

# Create a user-specific collection name for Qdrant (shortened to avoid length limits)
import hashlib
user_hash = hashlib.md5(user_id.encode()).hexdigest()[:8]
COLLECTION_NAME = f"research_{user_hash}"
print(f"🔍 Using user-specific Qdrant collection: {COLLECTION_NAME}")
print(f"📝 Collection name length: {len(COLLECTION_NAME)} characters (user: {user_id})")

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
    
    # Ensure user-specific Qdrant collection exists
    collection_exists = False
    
    # First, try to check if collection exists using list_collections
    try:
        collections = qdrant_client.list_collections()
        if COLLECTION_NAME in [collection.name for collection in collections.collections]:
            logger.info(f"Qdrant collection '{COLLECTION_NAME}' already exists")
            collection_exists = True
    except Exception as e:
        logger.warning(f"Error checking collections list: {str(e)}")
    
    # If we couldn't confirm from list_collections, try to create it
    if not collection_exists:
        try:
            logger.info(f"Creating user-specific Qdrant collection '{COLLECTION_NAME}'")
            qdrant_client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=models.VectorParams(
                    size=1536,  # OpenAI embeddings dimension
                    distance=models.Distance.COSINE
                )
            )
            logger.info(f"Successfully created Qdrant collection '{COLLECTION_NAME}'")
        except Exception as e:
            # Check if the error is because collection already exists
            if "already exists" in str(e):
                logger.info(f"Qdrant collection '{COLLECTION_NAME}' already exists (from error message)")
                collection_exists = True
            else:
                logger.warning(f"Error creating Qdrant collection: {str(e)}")
                logger.warning("Will continue without Qdrant collection, some functionality may be limited")
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
    log_to_database("info", f"Fetching {limit} tweets with analyzed={analyzed}")
    
    try:
        # Fetch tweets from Supabase for the current user
        query = supabase_client.table("tweets_cache").select("*")
        
        # Filter by user_id
        query = query.eq("user_id", user_id)
        
        if not analyzed:
            query = query.eq("analyzed", False)
            
        query = query.order("inserted_at", desc=True).limit(limit)
        
        result = query.execute()
        
        tweets = result.data if result.data else []
        
        log_to_database("info", f"Retrieved {len(tweets)} tweets from Supabase")
        return {
            "result": tweets,
            "count": len(tweets)
        }
        
    except Exception as e:
        logger.error(f"Error fetching tweets from Supabase: {str(e)}")
        log_to_database("error", f"Error fetching tweets from Supabase: {str(e)}")
        return {
            "error": f"Failed to fetch tweets: {str(e)}",
            "count": 0
        }

@tool
def mark_tweet_as_analyzed(tweet_ids: list):
    """
    Mark tweets as analyzed in Supabase.
    
    Args:
        tweet_ids: List of tweet IDs to mark as analyzed (can be database IDs or tweet_ids)
        
    Returns:
        Dictionary containing operation result
    """
    try:
        # Update tweets in Supabase
        for tweet_id in tweet_ids:
            # Check if the ID is numeric (database ID) or a string (tweet_id)
            if isinstance(tweet_id, int) or (isinstance(tweet_id, str) and tweet_id.isdigit()):
                # It's a database ID, use the 'id' column
                supabase_client.table("tweets_cache").update(
                    {"analyzed": True}
                ).eq("id", tweet_id).eq("user_id", user_id).execute()
                logger.info(f"Marked tweet with database ID {tweet_id} as analyzed")
            else:
                # It's a tweet_id, use the 'tweet_id' column
                supabase_client.table("tweets_cache").update(
                    {"analyzed": True}
                ).eq("tweet_id", tweet_id).eq("user_id", user_id).execute()
                logger.info(f"Marked tweet with tweet_id {tweet_id} as analyzed")
        
        log_to_database("info", f"Marked {len(tweet_ids)} tweets as analyzed", {"tweet_ids": tweet_ids})
        return {
            "result": f"Marked {len(tweet_ids)} tweets as analyzed",
            "count": len(tweet_ids)
        }
        
    except Exception as e:
        logger.error(f"Error marking tweets as analyzed: {str(e)}")
        log_to_database("error", f"Error marking tweets as analyzed: {str(e)}")
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
    log_to_database("info", f"Analyzing tweet with research question: {question}", {"tweet_preview": tweet_text[:50]})
    
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
        
        prompt = f"""
        Research Question: {question}

        Context (from a tweet): "{tweet_text}"

        Please provide a comprehensive research response that:
        1. Thoroughly explores the question from multiple perspectives
        2. Provides specific data points, evidence, and examples where relevant
        3. Considers historical context and future implications
        4. Organizes insights into clear sections with logical flow
        5. Identifies connections to related fields or topics
        6. Presents a balanced view that considers different interpretations
        7. Concludes with the most significant implications

        Format your response with clear section headings, bullet points for key insights, and citations where appropriate. Present your analysis in a {tone_descriptor} tone, with a {humor_descriptor} approach, maintaining a {enthusiasm_descriptor} energy level, and presenting your analysis in a {assertiveness_descriptor} manner.
        """
        
        system_prompt = f"You are {persona.get('name', 'Content Reviewer')}, {persona.get('description', 'a meticulous and objective reviewer who prioritizes factual accuracy, logical consistency, and narrative flow in all content.')} Provide a thorough, well-researched response that explores the topic in depth, going beyond the tweet itself to examine broader implications and contexts."
        
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
                        log_to_database("info", "Successfully analyzed tweet with Perplexity", {"answer_preview": answer[:100]})
                        
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
            log_to_database("error", f"Perplexity API error: {response.status_code}")
            return {
                "question": question,
                "answer": f"Error: {response.status_code}"
            }
        
    except Exception as e:
        logger.error(f"Error analyzing tweet with Perplexity: {str(e)}")
        log_to_database("error", f"Error analyzing tweet with Perplexity: {str(e)}")
        return {
            "error": f"Failed to analyze tweet: {str(e)}",
            "question": question,
            "answer": "Error occurred during analysis"
        }

@tool
def store_analysis_qdrant(tweet_id: str, tweet_text: str, question: str, analysis_result: str, tweet_data: dict = None, metadata: dict = None):
    """
    Store tweet analysis in Qdrant vector database with enhanced metadata for better searchability.
    
    Args:
        tweet_id: ID of the tweet
        tweet_text: Text of the tweet
        question: The research question that was asked
        analysis_result: The answer from Perplexity
        tweet_data: Full tweet data object containing author and engagement metrics (optional)
        metadata: Additional metadata to store (optional)
        
    Returns:
        Dictionary containing operation result
    """
    try:
        # Prepare the text for embedding
        analysis_text = f"{tweet_text}\n\nQuestion: {question}\n\nAnswer: {analysis_result}"
        log_to_database("info", f"Storing analysis for tweet {tweet_id} in Qdrant collection {COLLECTION_NAME}", {"question": question})
        
        # Generate embedding
        embedding = embeddings.embed_query(analysis_text)
        
        # Extract author and engagement metrics from tweet_data if available
        author = None
        likes = 0
        retweets = 0
        replies = 0
        
        if tweet_data:
            author = tweet_data.get("author", None)
            likes = tweet_data.get("likes", 0)
            retweets = tweet_data.get("retweets", 0)
            replies = tweet_data.get("replies", 0)
        elif metadata and "author" in metadata:
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
        
        # Import datetime for proper timestamp formatting
        from datetime import datetime
        
        # Create structured payload that matches the macrobot schema
        payload = {
            "content": tweet_text,
            "type": "research",
            "source": "perplexity:perplexity",
            "timestamp": datetime.utcfromtimestamp(time.time()).isoformat(),
            "tags": topics,
            "persona_alignment_score": metadata.get("confidence_score", 1.0),
            "matched_aspects": metadata.get("related_entities", []),
            "alignment_explanation": analysis_result,  # Store the full analysis
            "character_version": 1,  # Or parse from metadata if dynamic
            "alignment_bypassed": False,
            
            # Add user_id to the payload for multi-user support
            "user_id": user_id,
            
            # Keep original fields for backward compatibility
            "tweet_id": tweet_id,
            "author": author,
            "sentiment": sentiment,
            "question": question,
            "custom_metadata": {
                "engagement_score": likes + (retweets * 2) + replies,  # Simple engagement score calculation
                "like_count": likes,
                "retweet_count": retweets,
                "reply_count": replies,
                "source_url": ""  # Add source URL if available
            }
        }
        
        # Convert tweet_id to a valid Qdrant point ID
        # Use a hash function to convert the string to an integer
        import hashlib
        # Get the first 8 bytes of the MD5 hash and convert to integer
        point_id = int(hashlib.md5(tweet_id.encode()).hexdigest()[:16], 16)
        
        # Store in user-specific Qdrant collection
        qdrant_client.upsert(
            collection_name=COLLECTION_NAME,
            points=[
                models.PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload=payload
                )
            ]
        )
        
        log_to_database("info", f"Successfully stored analysis for tweet {tweet_id} in Qdrant collection {COLLECTION_NAME}", {"topics": topics, "sentiment": sentiment})
        return {
            "result": f"Successfully stored analysis for tweet {tweet_id} in Qdrant collection {COLLECTION_NAME}"
        }
        
    except Exception as e:
        logger.error(f"Error storing analysis in Qdrant: {str(e)}")
        log_to_database("error", f"Error storing analysis in Qdrant: {str(e)}")
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
        log_to_database("info", f"Searching Qdrant collection {COLLECTION_NAME} for: {query}", {"limit": limit, "filter_by": filter_by})
        
        # Prepare filter if provided
        search_filter = None
        if filter_by:
            filter_conditions = []
            
            # Add topic filter if provided
            if "topics" in filter_by:
                topic = filter_by["topics"]
                filter_conditions.append(
                    models.FieldCondition(
                        key="tags",  # working_knowledge uses "tags" for topics
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
                        key="timestamp",  # working_knowledge uses "timestamp" for date
                        match=models.MatchValue(value=date)
                    )
                )
            
            # Combine all conditions with "must" (AND)
            if filter_conditions:
                search_filter = models.Filter(
                    must=filter_conditions
                )
        
        # Always filter by user_id for multi-user support
        user_filter = models.FieldCondition(
            key="user_id",
            match=models.MatchValue(value=user_id)
        )
        
        # Add user filter to existing filter or create new filter
        if search_filter:
            search_filter.must.append(user_filter)
        else:
            search_filter = models.Filter(
                must=[user_filter]
            )
        
        # Search in Qdrant with user filter
        search_results = qdrant_client.search(
            collection_name=COLLECTION_NAME,
            query_vector=query_embedding,
            limit=limit,
            filter=search_filter
        )
        
        # Extract results with enhanced metadata
        results = []
        for result in search_results:
            results.append({
                "tweet_id": result.payload.get("tweet_id"),
                "tweet_text": result.payload.get("content", result.payload.get("tweet_text", "")),
                "author": result.payload.get("author"),
                "topics": result.payload.get("tags", result.payload.get("topics", [])),
                "sentiment": result.payload.get("sentiment"),
                "date": result.payload.get("timestamp", result.payload.get("date", "")),
                "analysis": result.payload.get("alignment_explanation", result.payload.get("analysis", "")),
                "score": result.score
            })
        
        log_to_database("info", f"Found {len(results)} results in Qdrant search")
        return {
            "result": results,
            "count": len(results)
        }
        
    except Exception as e:
        logger.error(f"Error searching in Qdrant: {str(e)}")
        log_to_database("error", f"Error searching in Qdrant: {str(e)}")
        return {
            "error": f"Failed to search in Qdrant: {str(e)}",
            "count": 0
        }

@tool
def generate_research_question(tweet_text: str, persona: dict = None):
    """
    Generate a single focused research question to understand the broader implications and context of the topic mentioned in a tweet.
    
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
        
        log_to_database("info", f"Generating research question for tweet: {tweet_text[:50]}...")
        
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
            temperature=0.9  # Higher temperature for more creative research questions
        )
        
        system_prompt = f"You are {persona.get('name', 'Content Reviewer')}, {persona.get('description', 'a meticulous and objective reviewer who prioritizes factual accuracy, logical consistency, and narrative flow in all content.')} Generate a research question in a {tone_descriptor} tone, with a {humor_descriptor} approach, maintaining a {enthusiasm_descriptor} energy level, and presenting your question in a {assertiveness_descriptor} manner."
        
        prompt = f"""
        Given the following tweet, generate ONE focused research question that would help understand the broader implications and context of the topic mentioned.

        Tweet: "{tweet_text}"

        Your research question should:
        1. Focus on the underlying topic rather than the tweet itself
        2. Aim for depth and comprehensive understanding
        3. Explore potential connections to related fields and broader implications
        4. Be specific enough to guide detailed research
        5. Be open-ended enough to allow for multiple perspectives
        6. Encourage data-driven analysis and evidence-based exploration
        7. Consider historical context and future implications

        The ideal research question should lead to a comprehensive analysis that could include:
        - Multiple perspectives on the topic
        - Supporting evidence and data points
        - Connections to related fields
        - Historical context and future implications
        - Potential impacts on various sectors or domains

        Return ONLY the question text, with no additional formatting or explanation.
        """
        
        response = model.invoke(prompt)
        
        # Clean up the response to get just the question
        question = response.content.strip()
        
        logger.info(f"Generated research question: {question}")
        log_to_database("info", f"Generated research question: {question}")
        
        return {
            "result": question
        }
        
    except Exception as e:
        logger.error(f"Error generating research question: {str(e)}")
        log_to_database("error", f"Error generating research question: {str(e)}")
        return {
            "error": f"Failed to generate research question: {str(e)}",
            "result": "What is the author of this tweet truly trying to communicate?"
        }

# Main agent execution
async def main():
    """Main agent execution loop"""
    try:
        # Mark agent as started
        asu.mark_agent_started(AGENT_NAME)
        amu.mark_agent_started_with_user(AGENT_NAME)
        log_to_database("info", "Tweet Research Agent started with user context")
        
        # Initialize MCP client
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
        
        # Get Coral tools
        coral_tools = await client.get_tools()
        
        # Define agent tools
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
        tools = coral_tools + agent_tools
        
        # Initialize the chat model
        model = init_chat_model(
            model="gpt-4o-mini",
            model_provider="openai",
            api_key=os.getenv("OPENAI_API_KEY"),
            temperature=0.7
        )
        
        # Create the prompt template
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are the Tweet Research Agent for user {user_id}. Your role is to analyze tweets and extract deep insights using research tools.

Your workflow:
1. Fetch unanalyzed tweets from the database
2. For each tweet, generate a focused research question
3. Use Perplexity to conduct in-depth analysis
4. Store the analysis in Qdrant vector database
5. Mark tweets as analyzed

Available tools:
{tools}

Always maintain user context and ensure all operations are user-specific."""),
            ("human", "{input}"),
            ("placeholder", "{agent_scratchpad}")
        ])
        
        # Create the agent
        agent = create_tool_calling_agent(model, tools, prompt)
        agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
        
        # Main execution loop
        while True:
            try:
                log_to_database("info", "Starting new agent invocation cycle")
                
                # Execute the agent
                result = agent_executor.invoke({
                    "input": f"Analyze unanalyzed tweets for user {user_id}. Fetch tweets, generate research questions, analyze with Perplexity, store in Qdrant, and mark as analyzed.",
                    "user_id": user_id,
                    "tools": get_tools_description(tools)
                })
                
                logger.info("Agent execution completed successfully")
                log_to_database("info", "Completed agent invocation cycle")
                
                # Wait before next execution
                await asyncio.sleep(300)  # 5 minutes
                
            except Exception as e:
                logger.error(f"Error in agent execution: {str(e)}")
                log_to_database("error", f"Error in agent execution: {str(e)}")
                await asyncio.sleep(60)  # Wait 1 minute before retrying
                
    except Exception as e:
        logger.error(f"Fatal error in Tweet Research Agent: {str(e)}")
        log_to_database("error", f"Fatal error in Tweet Research Agent: {str(e)}")
        raise
    finally:
        # Mark agent as stopped
        asu.mark_agent_stopped(AGENT_NAME)
        amu.mark_agent_stopped_with_user(AGENT_NAME)
        log_to_database("info", "Tweet Research Agent stopped with user context")

if __name__ == "__main__":
    asyncio.run(main())
