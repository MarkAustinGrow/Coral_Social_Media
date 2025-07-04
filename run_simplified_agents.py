"""
Run Simplified Agents

This script provides a convenient way to run the simplified agents that have been created
to address connection issues with the Coral server.
"""

import os
import sys
import subprocess
import time
import argparse
import signal

# List of simplified agents
SIMPLIFIED_AGENTS = [
    "2_langchain_tweet_scraping_agent_simple.py",
    "3.5_langchain_hot_topic_agent_simple.py",
    "3_langchain_tweet_research_agent_simple.py",
    "6_langchain_x_reply_agent_simple.py",
    "7_langchain_twitter_posting_agent_simple.py"
]

# Global list to keep track of running processes
running_processes = []

def signal_handler(sig, frame):
    """Handle Ctrl+C and other signals to gracefully shut down all processes"""
    print("\nShutting down all agents...")
    for process in running_processes:
        if process.poll() is None:  # If process is still running
            try:
                process.terminate()
                print(f"Terminated {process.args}")
            except Exception as e:
                print(f"Error terminating {process.args}: {e}")
    
    print("All agents stopped.")
    sys.exit(0)

def run_agent(agent_path, wait_time=5):
    """Run a single agent and return the process"""
    print(f"Starting {agent_path}...")
    
    # Determine the Python executable based on the platform
    python_executable = "python" if sys.platform == "win32" else "python3"
    
    # Start the process
    process = subprocess.Popen(
        [python_executable, agent_path],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
        universal_newlines=True
    )
    
    # Add to the list of running processes
    running_processes.append(process)
    
    # Wait a bit to allow the agent to start
    time.sleep(wait_time)
    
    return process

def monitor_processes():
    """Monitor running processes and restart them if they crash"""
    while True:
        for i, process in enumerate(running_processes):
            if process.poll() is not None:  # Process has terminated
                agent_path = process.args[1]
                print(f"{agent_path} has crashed. Restarting...")
                
                # Remove the old process
                running_processes.pop(i)
                
                # Start a new process
                new_process = run_agent(agent_path, wait_time=1)
                
                # Replace in the list
                running_processes.append(new_process)
        
        # Sleep for a bit before checking again
        time.sleep(10)

def main():
    parser = argparse.ArgumentParser(description="Run simplified agents")
    parser.add_argument("--agents", nargs="+", choices=SIMPLIFIED_AGENTS, 
                        help="Specify which agents to run (default: all)")
    parser.add_argument("--wait-time", type=int, default=5,
                        help="Time to wait between starting agents (default: 5 seconds)")
    
    args = parser.parse_args()
    
    # Register signal handler for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Determine which agents to run
    agents_to_run = args.agents if args.agents else SIMPLIFIED_AGENTS
    
    print(f"Starting {len(agents_to_run)} simplified agents...")
    
    # Start each agent
    for agent_path in agents_to_run:
        run_agent(agent_path, wait_time=args.wait_time)
    
    print(f"All {len(agents_to_run)} agents started.")
    print("Press Ctrl+C to stop all agents.")
    
    # Monitor processes and restart them if they crash
    try:
        monitor_processes()
    except KeyboardInterrupt:
        signal_handler(signal.SIGINT, None)

if __name__ == "__main__":
    main()
