import asyncio
import os
import json
import logging
import signal
import sys
import atexit
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain.prompts import ChatPromptTemplate
from langchain.chat_models import init_chat_model
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain.tools import Tool
from dotenv import load_dotenv
from anyio import ClosedResourceError
import urllib.parse
import agent_status_updater as asu
import agent_multiuser_utils_simple as amu

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Agent name for database logging
AGENT_NAME = "Interface Agent"

# Load environment variables
load_dotenv()

# Get user context for user-specific MCP server
user_id = amu.get_user_context()

# Use centralized multi-user Coral server
base_url = "http://coral.8interns.com/devmode/exampleApplication/privkey/session1/sse"
params = {
    "waitForAgents": 2,
    "agentId": f"user_interface_agent_{user_id}",
    "agentDescription": f"You are user_interface_agent for user {user_id}, responsible for engaging with users, processing instructions, and coordinating with other agents"
}
query_string = urllib.parse.urlencode(params)
MCP_SERVER_URL = f"{base_url}?{query_string}"

print(f"🔗 Using centralized MCP server: {MCP_SERVER_URL}")

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

async def ask_human_tool(question: str) -> str:
    """
    Ask the user a question and wait for a response.
    In the Coral Protocol context, this should wait for messages from other agents or the web interface.
    """
    user_id = amu.get_user_context()
    logger.info(f"Interface Agent for user {user_id} asks: {question}")
    log_to_database("info", f"Interface Agent asks user: {question}")
    
    # In the Coral Protocol, the Interface Agent should wait for mentions/messages
    # rather than immediately returning a response. This prevents the infinite loop.
    response = "Waiting for user input through Coral Protocol web interface..."
    
    log_to_database("info", f"Interface Agent waiting for user input via Coral Protocol")
    return response

async def create_interface_agent(client, tools):
    tools_description = get_tools_description(tools)
    
    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            f"""You are an Interface Agent operating in MULTI-USER mode for user {user_id}.
            You serve as the central hub for agent communication through the Coral Protocol.
            
            Your primary role is to:
            1. Wait for mentions and messages from other agents or the web interface using `wait_for_mentions` (timeout: 30000ms)
            2. When you receive a message, process the request and coordinate with appropriate agents
            3. Use `list_agents` to see available agents when needed
            4. Create threads and send messages to coordinate agent tasks
            5. Respond back to the sender with results
            
            IMPORTANT: Do NOT continuously ask "How can I assist you today?" - instead, wait for incoming messages.
            
            Main loop:
            1. Use `wait_for_mentions` with 30 second timeout to listen for incoming messages
            2. When you receive a mention/message, keep the thread ID and sender ID
            3. Process the request and determine which agent(s) to involve
            4. Coordinate with other agents as needed using `create_thread` and `send_message`
            5. Send response back to the original sender using `send_message`
            6. Return to step 1 to wait for the next message
            
            If no mentions are received (timeout), simply wait again - do not initiate conversations.
            
            Available tools: {tools_description}"""
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
    # Check if user context is available
    if not user_id:
        logger.error("No user context available. Cannot start Interface Agent.")
        log_to_database("error", "No user context available. Cannot start Interface Agent.")
        return
    
    logger.info(f"Starting Interface Agent for user: {user_id}")
    log_to_database("info", f"Interface Agent starting for user: {user_id}")
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            logger.info(f"Connecting to SSE endpoint: {MCP_SERVER_URL}")
            
            # Use the new MCP client pattern with user context (langchain-mcp-adapters 0.1.0+)
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
            log_to_database("info", f"Interface Agent connected to MCP server for user {user_id}")
            
            # Get Coral tools using the new pattern
            coral_tools = client.get_tools()
            
            # Add the ask_human tool
            tools = coral_tools + [Tool(
                name="ask_human",
                func=None,
                coroutine=ask_human_tool,
                description="Ask the user a question and wait for a response."
            )]
            
            # Create and run the agent
            agent_executor = await create_interface_agent(client, tools)
            
            # Use the same main loop pattern as other agents
            while True:
                try:
                    logger.info("Starting new agent invocation")
                    log_to_database("info", "Starting new agent invocation cycle")
                    await agent_executor.ainvoke({"agent_scratchpad": []})
                    logger.info("Completed agent invocation, restarting loop")
                    log_to_database("info", "Completed agent invocation cycle")
                    await asyncio.sleep(1)
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
    # Mark agent as started (use both old and new for compatibility)
    asu.mark_agent_started(AGENT_NAME)
    amu.mark_agent_started_with_user(AGENT_NAME)
    log_to_database("info", "Interface Agent (Multi-User) started")
    
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
