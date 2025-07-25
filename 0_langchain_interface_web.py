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
base_url = "http://coral.8interns.com/devmode/exampleApplication/privkey/session1/sse"
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
    """Web-compatible ask_human tool that uses JSON communication"""
    global waiting_for_input, message_queue
    
    # Send question to web interface
    send_json_message("agent_question", question=question)
    
    # Wait for response from web interface
    waiting_for_input = True
    while waiting_for_input and len(message_queue) == 0:
        await asyncio.sleep(0.1)
    
    if message_queue:
        response_msg = message_queue.pop(0)
        if response_msg.get("type") == "user_response":
            user_response = response_msg.get("content", "")
            send_json_message("user_response", message=user_response)
            return user_response
    
    return "No response received"

async def create_interface_agent(client, tools):
    tools_description = get_tools_description(tools)
    
    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            f"""You are an Interface Agent operating in CORAL PROTOCOL mode for user {user_id}.
            
            IMPORTANT: You are operating in MULTI-USER mode. Each user has their own agents and data.
            You will only interact with agents and data belonging to this specific user.
            
            CORAL PROTOCOL BEHAVIOR:
            You listen for instructions from other agents and respond via the Coral Protocol.
            
            Follow these steps in order:
            1. Call `wait_for_mentions` from coral tools (timeoutMs: 30000) to receive mentions from other agents.
            2. When you receive a mention, keep the thread ID and the sender ID.
            3. Parse the instruction in the message content. Look for requests like:
               - "coordinate with agents"
               - "process user request"
               - "manage workflow"
               - "interface with user"
               - "orchestrate tasks"
            4. Based on the instruction, use your tools to:
               a. List available agents using `list_agents`
               b. Create threads with appropriate agents using `create_thread`
               c. Send instructions to agents using `send_message`
               d. Wait for responses using `wait_for_mentions`
               e. Coordinate multi-agent workflows
            5. Prepare a response with the results (agents contacted, tasks coordinated, etc.)
            6. Use `send_message` from coral tools to send your response back to the sender in the same thread.
            7. Always respond back to the sender agent, even if there's an error.
            8. Wait for 2 seconds and repeat the process from step 1.
            
            If no mentions are received (timeout), simply continue waiting - do NOT perform autonomous actions.
            
            RESPONSE FORMAT:
            Always format your responses clearly:
            - Success: "Coordinated with X agents successfully. Tasks: [list of tasks]"
            - Error: "Unable to coordinate: [reason]. Please check agent availability."
            - No agents: "No suitable agents available for the requested task."
            - Workflow complete: "Multi-agent workflow completed successfully."
            
            INTERFACE AGENT FOCUS:
            When coordinating agents for the current user, focus on:
            - Using the user's own agents and data
            - Orchestrating multi-agent workflows
            - Managing inter-agent communication
            - Ensuring proper task delegation
            - Providing clear status updates
            - Handling errors gracefully
            - Maintaining user data isolation
            
            MULTI-USER CONSIDERATIONS:
            - Always use the current user's agents
            - Ensure all coordination is user-specific and isolated
            - Handle cases where agents are not available gracefully
            - Maintain proper threading for complex workflows
            
            Available Coral tools: {tools_description}"""
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
