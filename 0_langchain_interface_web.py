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

async def handle_user_message(client, tools, user_message):
    """Handle a single user message and return response"""
    try:
        # Create agent executor
        agent_executor = await create_interface_agent(client, tools)
        
        # Process the user message
        send_json_message("status", message="Processing your request...")
        
        # Create a custom prompt that includes the user's message
        result = await agent_executor.ainvoke({
            "input": user_message,
            "chat_history": []
        })
        
        # Send the result back
        if result and "output" in result:
            send_json_message("agent_response", response=result["output"])
        else:
            send_json_message("agent_response", response="Task completed successfully.")
            
        return True
        
    except Exception as e:
        logger.error(f"Error handling user message: {e}")
        send_json_message("error", message=f"Error processing message: {e}")
        return False

async def main():
    # Check if user context is available
    if not user_id:
        logger.error("No user context available. Cannot start Interface Agent.")
        log_to_database("error", "No user context available. Cannot start Interface Agent.")
        return
    
    logger.info(f"Starting Web Interface Agent for user: {user_id}")
    log_to_database("info", f"Web Interface Agent starting for user: {user_id}")
    send_json_message("status", message=f"Interface Agent starting for user: {user_id}")
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            logger.info(f"Connecting to SSE endpoint: {MCP_SERVER_URL}")
            send_json_message("status", message="Connecting to Coral server...")
            
            # Use the new MCP client pattern with user context (langchain-mcp-adapters 0.1.0+)
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
                log_to_database("info", f"Web Interface Agent connected to MCP server for user {user_id}")
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
                
                logger.info("Web Interface Agent ready for messages")
                log_to_database("info", "Web Interface Agent ready for messages")
                send_json_message("status", message="Interface Agent ready")
                
                # Wait for messages from the web interface
                while True:
                    # Check for messages in the queue
                    if message_queue:
                        message = message_queue.pop(0)
                        
                        # Handle different message types
                        if message.get("type") == "user_message":
                            user_message = message.get("content", "")
                            logger.info(f"Processing user message: {user_message}")
                            
                            # Handle the user message
                            success = await handle_user_message(client, tools, user_message)
                            
                            if not success:
                                break
                        elif message.get("type") == "user_response":
                            # This is handled by the ask_human_tool function
                            pass
                        else:
                            # Handle initial message from web interface (string format)
                            if isinstance(message, str):
                                logger.info(f"Processing initial message: {message}")
                                
                                # Handle the initial message
                                success = await handle_user_message(client, tools, message)
                                
                                if not success:
                                    break
                    
                    # Small delay to prevent busy waiting
                    await asyncio.sleep(0.1)
                
                logger.info("Web Interface Agent session ended")
                log_to_database("info", "Web Interface Agent session ended")
                send_json_message("status", message="Interface Agent session ended")
                
                # Break out of retry loop on successful execution
                break
                        
        except ClosedResourceError as e:
            logger.error(f"ClosedResourceError on attempt {attempt + 1}: {e}")
            log_to_database("error", f"ClosedResourceError on attempt {attempt + 1}: {e}")
            send_json_message("error", message=f"Connection error: {e}")
            if attempt < max_retries - 1:
                logger.info("Retrying in 5 seconds...")
                send_json_message("status", message="Retrying connection...")
                await asyncio.sleep(5)
                continue
            else:
                logger.error("Max retries reached. Exiting.")
                send_json_message("error", message="Max retries reached")
                raise
        except Exception as e:
            logger.error(f"Unexpected error on attempt {attempt + 1}: {e}")
            log_to_database("error", f"Unexpected error on attempt {attempt + 1}: {e}")
            send_json_message("error", message=f"Unexpected error: {e}")
            if attempt < max_retries - 1:
                logger.info("Retrying in 5 seconds...")
                send_json_message("status", message="Retrying...")
                await asyncio.sleep(5)
                continue
            else:
                logger.error("Max retries reached. Exiting.")
                send_json_message("error", message="Max retries reached")
                raise

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
