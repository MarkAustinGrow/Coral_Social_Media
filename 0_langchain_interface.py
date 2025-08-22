import asyncio
import os
import json
import logging
import signal
import sys
import atexit
import time
import random
from datetime import datetime
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

# Setup logging with enhanced web interface debugging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Enhanced logging for web interface debugging
def web_debug_log(level: str, message: str, data: dict = None):
    """Enhanced logging specifically for web interface debugging"""
    timestamp = datetime.now().isoformat()
    log_data = {"timestamp": timestamp, "level": level, "message": message}
    if data:
        log_data.update(data)
    
    # Print to stdout for Node.js to capture
    print(f"[WEB_DEBUG] [{level}] {message}", flush=True)
    if data:
        print(f"[WEB_DEBUG] Data: {data}", flush=True)
    
    # Also log normally
    if level == "ERROR":
        logger.error(f"{message} - Data: {data}")
    elif level == "WARN":
        logger.warning(f"{message} - Data: {data}")
    else:
        logger.info(f"{message} - Data: {data}")

# Agent name for database logging
AGENT_NAME = "Interface Agent"

# Load environment variables
load_dotenv()

# Check if running via web interface
is_web_interface = os.getenv('AGENT_USER_ID') is not None
web_debug_log("INFO", "Interface Agent starting", {"is_web_interface": is_web_interface, "user_id_env": os.getenv('AGENT_USER_ID')})

# Get user context for user-specific MCP server
user_id = amu.get_user_context()
web_debug_log("INFO", "User context retrieved", {"user_id": user_id, "from_env": os.getenv('AGENT_USER_ID')})

# Use centralized multi-user Coral server
base_url = "https://coral.8interns.com/devmode/exampleApplication/privkey/session1/sse"
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
    print(f"Agent asks: {question}")
    return input("Your response: ")

async def create_interface_agent(client, tools):
    tools_description = get_tools_description(tools)
    
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

# Heartbeat function to check if the MCP connection is still alive
async def send_heartbeat(client, user_id):
    """Send a heartbeat to the MCP server to check if the connection is still alive."""
    try:
        # Use a simple tool call as a heartbeat
        await client.ainvoke_tool("coral", "list_agents", {})
        web_debug_log("INFO", "Heartbeat successful", {"user_id": user_id})
        return True
    except Exception as e:
        web_debug_log("ERROR", f"Heartbeat failed: {str(e)}", {"user_id": user_id})
        logger.error(f"Heartbeat failed: {e}")
        return False

# Calculate backoff time with jitter for reconnection attempts
def calculate_backoff_time(attempt, base_delay=1, max_delay=60):
    """Calculate exponential backoff time with jitter."""
    delay = min(base_delay * (2 ** attempt), max_delay)
    jitter = random.uniform(0, 0.1 * delay)  # 10% jitter
    return delay + jitter

async def main():
    # Check if user context is available
    if not user_id:
        web_debug_log("ERROR", "No user context available. Cannot start Interface Agent.")
        logger.error("No user context available. Cannot start Interface Agent.")
        log_to_database("error", "No user context available. Cannot start Interface Agent.")
        return
    
    web_debug_log("INFO", "Starting Interface Agent main function", {"user_id": user_id})
    logger.info(f"Starting Interface Agent for user: {user_id}")
    log_to_database("info", f"Interface Agent starting for user: {user_id}")
    
    max_retries = 5  # Increased from 3 to 5
    heartbeat_interval = 30  # Seconds between heartbeats
    last_heartbeat_time = 0
    client = None
    agent_executor = None
    
    for attempt in range(max_retries):
        try:
            # Calculate backoff time with jitter for reconnection attempts
            if attempt > 0:
                backoff_time = calculate_backoff_time(attempt - 1)
                web_debug_log("INFO", f"Backing off for {backoff_time:.2f} seconds before retry", {"user_id": user_id, "attempt": attempt + 1})
                await asyncio.sleep(backoff_time)
            
            web_debug_log("INFO", f"Connection attempt {attempt + 1}", {"url": MCP_SERVER_URL, "user_id": user_id})
            logger.info(f"Connecting to SSE endpoint: {MCP_SERVER_URL}")
            
            # Use the new MCP client pattern with user context (langchain-mcp-adapters 0.1.0+)
            web_debug_log("INFO", "Creating MCP client", {"user_id": user_id})
            async with MultiServerMCPClient(
                connections={
                    "coral": {
                        "transport": "sse",
                        "url": MCP_SERVER_URL,
                        "headers": {"X-User-ID": user_id},  # CRITICAL: User isolation header
                        "timeout": 300,
                        "sse_read_timeout": 300,
                    }
                }
            ) as client:
                web_debug_log("INFO", "MCP client connected successfully", {"user_id": user_id})
                logger.info(f"Connected to MCP server at {MCP_SERVER_URL}")
                log_to_database("info", f"Interface Agent connected to MCP server for user {user_id}")
                
                # Get Coral tools using the new pattern
                web_debug_log("INFO", "Getting Coral tools", {"user_id": user_id})
                coral_tools = client.get_tools()
                tool_names = [tool.name for tool in coral_tools]
                web_debug_log("INFO", "Coral tools retrieved", {"user_id": user_id, "tool_count": len(coral_tools), "tools": tool_names})
                logger.info(f"Available Coral tools: {tool_names}")
                log_to_database("info", f"Available Coral tools: {tool_names}")
                
                # Add the ask_human tool
                tools = coral_tools + [Tool(
                    name="ask_human",
                    func=None,
                    coroutine=ask_human_tool,
                    description="Ask the user a question and wait for a response."
                )]
                
                web_debug_log("INFO", "Starting Interface Agent execution", {"user_id": user_id, "total_tools": len(tools)})
                logger.info("Starting Interface Agent execution")
                log_to_database("info", "Starting Interface Agent execution")
                
                # Create the agent executor
                web_debug_log("INFO", "Creating and invoking agent executor", {"user_id": user_id})
                agent_executor = await create_interface_agent(client, tools)
                web_debug_log("INFO", "Agent executor created, starting execution", {"user_id": user_id})
                
                # Start the heartbeat task
                last_heartbeat_time = time.time()
                
                # Main execution loop with heartbeat
                try:
                    # Start the agent execution
                    execution_task = asyncio.create_task(agent_executor.ainvoke({}))
                    
                    # Monitor the execution and send heartbeats
                    while not execution_task.done():
                        # Check if it's time for a heartbeat
                        current_time = time.time()
                        if current_time - last_heartbeat_time >= heartbeat_interval:
                            web_debug_log("INFO", "Sending heartbeat", {"user_id": user_id})
                            heartbeat_success = await send_heartbeat(client, user_id)
                            last_heartbeat_time = current_time
                            
                            if not heartbeat_success:
                                web_debug_log("ERROR", "Heartbeat failed, reconnecting...", {"user_id": user_id})
                                # Cancel the current execution task
                                execution_task.cancel()
                                # Raise an exception to trigger reconnection
                                raise ClosedResourceError("Heartbeat failed, reconnecting...")
                        
                        # Wait a short time before checking again
                        await asyncio.sleep(1)
                    
                    # Get the result of the execution task
                    await execution_task
                    
                    web_debug_log("INFO", "Interface Agent execution completed successfully", {"user_id": user_id})
                    logger.info("Interface Agent execution completed")
                    log_to_database("info", "Interface Agent execution completed")
                    
                    # Break out of retry loop on successful execution
                    break
                    
                except asyncio.CancelledError:
                    web_debug_log("WARN", "Agent execution was cancelled", {"user_id": user_id})
                    logger.warning("Agent execution was cancelled")
                    # Don't break, let the retry logic handle reconnection
                    raise ClosedResourceError("Agent execution was cancelled")
                        
        except ClosedResourceError as e:
            web_debug_log("ERROR", f"ClosedResourceError on attempt {attempt + 1}", {"user_id": user_id, "error": str(e)})
            logger.error(f"ClosedResourceError on attempt {attempt + 1}: {e}")
            log_to_database("error", f"ClosedResourceError on attempt {attempt + 1}: {e}")
            
            # Clean up any existing client
            if client:
                try:
                    await client.aclose()
                except Exception as close_error:
                    web_debug_log("ERROR", f"Error closing client: {str(close_error)}", {"user_id": user_id})
            
            if attempt < max_retries - 1:
                web_debug_log("INFO", "Retrying after ClosedResourceError", {"user_id": user_id, "attempt": attempt + 1})
                logger.info(f"Retrying after ClosedResourceError (attempt {attempt + 1} of {max_retries})")
                # Backoff is handled at the beginning of the loop
                continue
            else:
                web_debug_log("ERROR", "Max retries reached for ClosedResourceError", {"user_id": user_id})
                logger.error("Max retries reached. Exiting.")
                # Notify the user about the connection issue
                print("\nConnection to the server was lost. Please try again later.\n")
                raise
                
        except Exception as e:
            web_debug_log("ERROR", f"Unexpected error on attempt {attempt + 1}", {"user_id": user_id, "error": str(e), "type": type(e).__name__})
            logger.error(f"Unexpected error on attempt {attempt + 1}: {e}")
            log_to_database("error", f"Unexpected error on attempt {attempt + 1}: {e}")
            
            # Clean up any existing client
            if client:
                try:
                    await client.aclose()
                except Exception as close_error:
                    web_debug_log("ERROR", f"Error closing client: {str(close_error)}", {"user_id": user_id})
            
            if attempt < max_retries - 1:
                web_debug_log("INFO", "Retrying after unexpected error", {"user_id": user_id, "attempt": attempt + 1})
                logger.info(f"Retrying after unexpected error (attempt {attempt + 1} of {max_retries})")
                # Backoff is handled at the beginning of the loop
                continue
            else:
                web_debug_log("ERROR", "Max retries reached for unexpected error", {"user_id": user_id})
                logger.error("Max retries reached. Exiting.")
                # Notify the user about the error
                print(f"\nAn unexpected error occurred: {str(e)}. Please try again later.\n")
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
