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
AGENT_NAME = "Interface Agent (Web)"

# Load environment variables
load_dotenv()

# Get user context from command line argument
if len(sys.argv) < 2:
    logger.error("Usage: python 0_langchain_interface_web.py <user_id>")
    sys.exit(1)

user_id = sys.argv[1]

# Use centralized multi-user Coral server
base_url = "https://coral.8interns.com/devmode/exampleApplication/privkey/session1/sse"
params = {
    "waitForAgents": 2,
    "agentId": f"user_interface_agent_{user_id}",
    "agentDescription": f"You are user_interface_agent for user {user_id}, responsible for engaging with users, processing instructions, and coordinating with other agents"
}
query_string = urllib.parse.urlencode(params)
MCP_SERVER_URL = f"{base_url}?{query_string}"

print(f"🔗 Using centralized MCP server: {MCP_SERVER_URL}", file=sys.stderr)

# Message queue for web communication
message_queue = []
waiting_for_input = False

def send_json_message(msg_type, **kwargs):
    """Send JSON message to web interface via stdout"""
    message = {
        "type": msg_type,
        "timestamp": asyncio.get_event_loop().time(),
        **kwargs
    }
    print(json.dumps(message), flush=True)

def read_stdin_messages():
    """Read messages from stdin in a separate thread"""
    global message_queue, waiting_for_input
    
    try:
        for line in sys.stdin:
            if line.strip():
                try:
                    message = json.loads(line.strip())
                    message_queue.append(message)
                    if waiting_for_input:
                        waiting_for_input = False
                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON received: {line}")
    except EOFError:
        pass

# Register signal handlers for graceful shutdown
def signal_handler(sig, frame):
    """Handle Ctrl+C and other signals to gracefully shut down"""
    send_json_message("status", message="Shutting down gracefully...")
    asu.mark_agent_stopped(AGENT_NAME)
    sys.exit(0)

# Register signal handlers
signal.signal(signal.SIGINT, signal_handler)  # Ctrl+C
signal.signal(signal.SIGTERM, signal_handler)  # Termination signal

# Register function to mark agent as stopped when the script exits
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
    """Web-compatible ask_human tool that uses JSON communication with timeout and error handling"""
    global waiting_for_input, message_queue
    
    try:
        # Send question to web interface
        send_json_message("agent_question", question=question)
        logger.info(f"Sent question to web interface: {question[:50]}...")
        
        # Wait for response from web interface with timeout (60 seconds)
        waiting_for_input = True
        timeout_counter = 0
        max_timeout = 600  # 60 seconds (600 * 0.1)
        
        while waiting_for_input and len(message_queue) == 0 and timeout_counter < max_timeout:
            await asyncio.sleep(0.1)
            timeout_counter += 1
        
        # Check if we got a response
        if message_queue:
            response_msg = message_queue.pop(0)
            if response_msg.get("type") == "user_response":
                user_response = response_msg.get("content", "")
                send_json_message("user_response", message=user_response)
                logger.info(f"Received user response: {user_response[:50]}...")
                return user_response
        
        # Handle timeout case
        if timeout_counter >= max_timeout:
            logger.warning("Timeout waiting for user response (60 seconds)")
            send_json_message("timeout", message="Timeout waiting for user response")
            return "Timeout - no response received within 60 seconds. Please try again."
        
        # Handle no response case
        logger.warning("No response received from web interface")
        return "No response received from web interface. Please try again."
        
    except Exception as e:
        logger.error(f"Error in ask_human_tool: {str(e)}")
        send_json_message("error", message=f"Communication error: {str(e)}")
        return f"Communication error occurred: {str(e)}. Please try again."

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


async def main():
    """Main agent execution loop following working World News Agent pattern"""
    # Check if user context is available
    if not user_id:
        logger.error("No user context available. Cannot start Interface Agent.")
        log_to_database("error", "No user context available. Cannot start Interface Agent.")
        return
    
    logger.info(f"Starting Interface Agent (Coral Protocol) for user: {user_id}")
    log_to_database("info", f"Interface Agent (Coral Protocol) starting for user: {user_id}")
    send_json_message("status", message=f"Interface Agent starting for user: {user_id}")
    
    # Single persistent connection following working World News Agent pattern
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
        logger.info(f"Connected to MCP server at {MCP_SERVER_URL}")
        log_to_database("info", f"Interface Agent connected to MCP server for user {user_id}")
        send_json_message("status", message="Connected to Coral server")
        
        # Get Coral tools using the new pattern
        coral_tools = client.get_tools()
        logger.info(f"Available Coral tools: {[tool.name for tool in coral_tools]}")
        log_to_database("info", f"Available Coral tools: {[tool.name for tool in coral_tools]}")
        send_json_message("tools_available", tools=[tool.name for tool in coral_tools])
        
        # Add the ask_human tool
        tools = coral_tools + [Tool(
            name="ask_human",
            func=None,
            coroutine=ask_human_tool,
            description="Ask the user a question and wait for a response."
        )]
        
        # Create the agent executor
        agent_executor = await create_interface_agent(client, tools)
        
        logger.info("Starting Interface Agent (Coral Protocol) execution")
        log_to_database("info", "Starting Interface Agent (Coral Protocol) execution")
        send_json_message("status", message="Interface Agent ready")
        
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
                send_json_message("error", message=f"Agent loop error: {str(e)}")
                await asyncio.sleep(5)

if __name__ == "__main__":
    # Start stdin reader in background
    import threading
    stdin_thread = threading.Thread(target=read_stdin_messages, daemon=True)
    stdin_thread.start()
    
    # Mark agent as started
    asu.mark_agent_started(AGENT_NAME)
    amu.mark_agent_started_with_user(AGENT_NAME)
    log_to_database("info", "Web Interface Agent (Multi-User) started")
    send_json_message("status", message="Web Interface Agent started")
    
    try:
        asyncio.run(main())
    except Exception as e:
        # Report error in status
        asu.report_error(AGENT_NAME, f"Fatal error: {str(e)}")
        amu.report_error_with_user(AGENT_NAME, f"Fatal error: {str(e)}")
        send_json_message("error", message=f"Fatal error: {str(e)}")
        
        # Re-raise the exception
        raise
    finally:
        # Mark agent as stopped
        asu.mark_agent_stopped(AGENT_NAME)
        amu.mark_agent_stopped_with_user(AGENT_NAME)
        send_json_message("status", message="Web Interface Agent stopped")
