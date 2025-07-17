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

# Global variable to store the client for use in ask_human_tool
_global_client = None

async def ask_human_tool(question: str) -> str:
    """
    Ask the user a question and wait for a response through the Coral Protocol.
    This function will actually wait for user input via the web interface.
    """
    global _global_client
    user_id = amu.get_user_context()
    
    logger.info(f"Interface Agent for user {user_id} asks: {question}")
    log_to_database("info", f"Interface Agent asks user: {question}")
    
    if not _global_client:
        logger.error("No Coral client available for ask_human_tool")
        return "Error: No connection to Coral Protocol available"
    
    try:
        # Get the wait_for_mentions tool from the Coral client
        coral_tools = _global_client.get_tools()
        wait_for_mentions_tool = None
        
        for tool in coral_tools:
            if tool.name == "wait_for_mentions":
                wait_for_mentions_tool = tool
                break
        
        if not wait_for_mentions_tool:
            logger.error("wait_for_mentions tool not available")
            return "Error: Cannot wait for user response - wait_for_mentions tool not available"
        
        logger.info(f"Waiting for user response to: {question}")
        log_to_database("info", f"Waiting for user response via Coral Protocol")
        
        # Use wait_for_mentions to actually wait for user input
        # This will block until the user responds through the Coral Inspector
        result = await wait_for_mentions_tool.acall({"timeout": 60})  # 60 second timeout
        
        if result and result.strip():
            logger.info(f"Received user response: {result}")
            log_to_database("info", f"User response received: {result}")
            return result
        else:
            logger.warning("No response received from user within timeout")
            log_to_database("warning", "No response received from user within timeout")
            return "No response received within timeout. Please try again."
            
    except Exception as e:
        logger.error(f"Error in ask_human_tool: {e}")
        log_to_database("error", f"Error in ask_human_tool: {e}")
        return f"Error waiting for user response: {str(e)}"

async def create_interface_agent(client, tools):
    tools_description = get_tools_description(tools)
    
    # Use the original working prompt structure
    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            f"""You are an agent interacting with the tools from Coral Server and having your own Human Tool to ask have a conversation with Human. 
            
            IMPORTANT: You are operating in MULTI-USER mode for user {user_id}.
            You will only interact with agents and data belonging to this specific user.
            
            Follow these steps in order:
            1. Use `list_agents` to list all connected agents and get their descriptions.
            2. Use `ask_human` to ask, "How can I assist you today?" and capture the response.
            3. Take 2 seconds to think and understand the user's intent and decide the right agent to handle the request based on list of agents. 
            4. If the user wants any information about the coral server, use the tools to get the information and pass it to the user. Do not send any message to any other agent, just give the information and go to Step 1.
            5. Once you have the right agent, use `create_thread` to create a thread with the selected agent. If no agent is available, use the `ask_human` tool to specify the agent you want to use.
            6. Use your logic to determine the task you want that agent to perform and create a message for them which instructs the agent to perform the task called "instruction". 
            7. Use `send_message` to send a message in the thread, mentioning the selected agent, with content: "instructions".
            8. Use `wait_for_mentions` with a 30 seconds timeout to wait for a response from the agent you mentioned.
            9. Show the entire conversation in the thread to the user.
            10. Wait for 3 seconds and then use `ask_human` to ask the user if they need anything else and keep waiting for their response.
            11. If the user asks for something else, repeat the process from step 1.

            Use only listed tools: {tools_description}"""
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
    global _global_client
    
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
            
            # Store client globally for use in ask_human_tool
            _global_client = client
            
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
            
            # Create and run the agent - SINGLE EXECUTION like the original
            agent_executor = await create_interface_agent(client, tools)
            
            logger.info("Starting Interface Agent execution")
            log_to_database("info", "Starting Interface Agent execution")
            
            # Single execution - let the agent handle its own conversation flow
            await agent_executor.ainvoke({"agent_scratchpad": []})
            
            logger.info("Interface Agent execution completed")
            log_to_database("info", "Interface Agent execution completed")
            
            # Break out of retry loop on successful execution
            break
                    
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
