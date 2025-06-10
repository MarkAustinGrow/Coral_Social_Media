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
    qdrant_client = QdrantClient(
        url=os.getenv("QDRANT_URL", "http://localhost:6333"),
        api_key=os.getenv("QDRANT_API_KEY", "")
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

def get_tools_description(tools):
    return "\n".join(
        f"Tool: {tool.name}, Schema: {json.dumps(tool.args).replace('{', '{{').replace('}', '}}')}"
        for tool in tools
    )

@tool
def fetch_tweets_from_supabase(limit: int = 20, analyzed: bool = False):
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
def analyze_tweet_perplexity(tweet_text: str, questions: list):
    """
    Use Perplexity to analyze tweet content.
    
    Args:
        tweet_text: The text of the tweet to analyze
        questions: List of questions to ask about the tweet
        
    Returns:
        Dictionary containing analysis results
    """
    logger.info(f"Analyzing tweet with Perplexity: {tweet_text[:50]}...")
    
    try:
        api_key = os.getenv("PERPLEXITY_API_KEY")
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        results = {}
        
        for question in questions:
            prompt = f"Tweet: \"{tweet_text}\"\n\nQuestion: {question}"
            
            data = {
                "model": "llama-3-sonar-small-32k-online",
                "messages": [
                    {"role": "system", "content": "You are an AI assistant analyzing tweets. Provide concise, factual responses."},
                    {"role": "user", "content": prompt}
                ]
            }
            
            response = requests.post(
                "https://api.perplexity.ai/chat/completions",
                headers=headers,
                json=data
            )
            
            if response.status_code == 200:
                response_data = response.json()
                answer = response_data["choices"][0]["message"]["content"]
                results[question] = answer
            else:
                logger.error(f"Perplexity API error: {response.status_code} - {response.text}")
                results[question] = f"Error: {response.status_code}"
        
        return {
            "result": results
        }
        
    except Exception as e:
        logger.error(f"Error analyzing tweet with Perplexity: {str(e)}")
        return {
            "error": f"Failed to analyze tweet: {str(e)}"
        }

@tool
def store_analysis_qdrant(tweet_id: str, tweet_text: str, analysis: dict, metadata: dict = None):
    """
    Store tweet analysis in Qdrant vector database.
    
    Args:
        tweet_id: ID of the tweet
        tweet_text: Text of the tweet
        analysis: Dictionary containing analysis results
        metadata: Additional metadata to store (optional)
        
    Returns:
        Dictionary containing operation result
    """
    try:
        # Prepare the text for embedding
        analysis_text = tweet_text + "\n\n" + json.dumps(analysis)
        
        # Generate embedding
        embedding = embeddings.embed_query(analysis_text)
        
        # Prepare metadata
        if metadata is None:
            metadata = {}
            
        payload = {
            "tweet_id": tweet_id,
            "tweet_text": tweet_text,
            "analysis": analysis,
            "metadata": metadata,
            "timestamp": time.time()
        }
        
        # Store in Qdrant
        qdrant_client.upsert(
            collection_name="tweet_insights",
            points=[
                models.PointStruct(
                    id=tweet_id,
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
def search_qdrant(query: str, limit: int = 5):
    """
    Search for similar insights in Qdrant.
    
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
        logger.error(f"Error searching in Qdrant: {str(e)}")
        return {
            "error": f"Failed to search in Qdrant: {str(e)}",
            "count": 0
        }

@tool
def generate_research_questions(tweet_text: str, num_questions: int = 3):
    """
    Generate research questions for a tweet.
    
    Args:
        tweet_text: The text of the tweet
        num_questions: Number of questions to generate (default: 3)
        
    Returns:
        Dictionary containing generated questions
    """
    try:
        # Use OpenAI to generate questions
        model = init_chat_model(
            model="gpt-4o-mini",
            model_provider="openai",
            api_key=os.getenv("OPENAI_API_KEY"),
            temperature=0.7
        )
        
        prompt = f"""
        Given the following tweet, generate {num_questions} insightful research questions that would help extract valuable information and context from it:
        
        Tweet: "{tweet_text}"
        
        Generate {num_questions} questions that would help understand:
        1. The main topic or subject of the tweet
        2. Any claims or statements made
        3. The context or background information needed
        4. Potential implications or consequences
        
        Format your response as a JSON array of strings, with each string being a question.
        """
        
        response = model.invoke(prompt)
        
        # Parse the response to extract questions
        try:
            # Try to parse as JSON
            questions_text = response.content
            # Find JSON array in the text if it's not pure JSON
            if not questions_text.strip().startswith('['):
                import re
                json_match = re.search(r'\[(.*?)\]', questions_text, re.DOTALL)
                if json_match:
                    questions_text = f"[{json_match.group(1)}]"
                else:
                    # Fall back to line-by-line parsing
                    lines = questions_text.strip().split('\n')
                    questions = [line.strip().strip('\"\'') for line in lines if line.strip() and not line.strip().startswith('#')]
                    return {"result": questions[:num_questions]}
            
            questions = json.loads(questions_text)
            return {"result": questions[:num_questions]}
        except Exception as e:
            # If JSON parsing fails, extract questions line by line
            logger.warning(f"Failed to parse questions as JSON: {str(e)}")
            lines = response.content.strip().split('\n')
            questions = [line.strip().strip('\"\'').strip('0123456789.').strip() for line in lines if line.strip() and not line.strip().startswith('#')]
            return {"result": questions[:num_questions]}
        
    except Exception as e:
        logger.error(f"Error generating research questions: {str(e)}")
        return {
            "error": f"Failed to generate research questions: {str(e)}",
            "result": [
                "What is the main topic of this tweet?",
                "What claims or statements are made in this tweet?",
                "What is the context or background of this tweet?"
            ]
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
               a. Fetch unanalyzed tweets from Supabase using fetch_tweets_from_supabase
               b. For each tweet:
                  i. Generate research questions using generate_research_questions
                  ii. Use Perplexity to analyze the tweet with these questions using analyze_tweet_perplexity
                  iii. Store the analysis in Qdrant using store_analysis_qdrant
                  iv. Mark the tweet as analyzed using mark_tweet_as_analyzed
               c. If interesting insights are found, notify blog_writing_agent
            4. Wait for 2 seconds and repeat the process
            
            When analyzing tweets, focus on extracting:
            - Main topics and themes
            - Key claims or statements
            - Contextual information
            - Potential implications
            
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
                    fetch_tweets_from_supabase,
                    mark_tweet_as_analyzed,
                    analyze_tweet_perplexity,
                    store_analysis_qdrant,
                    search_qdrant,
                    generate_research_questions
                ]
                
                # Combine Coral tools with agent-specific tools
                tools = client.get_tools() + agent_tools
                
                # Create and run the agent
                agent_executor = await create_tweet_research_agent(client, tools, agent_tools)
                
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
