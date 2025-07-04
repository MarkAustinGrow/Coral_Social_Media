"""
Test Agent Status System

This script runs the example agent to demonstrate how the agent status system works.
It will start the agent, which will update its status in the database as it runs.
"""

import os
import sys
import time
import subprocess
import signal
import argparse
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def check_environment():
    """Check if the required environment variables are set"""
    required_vars = ["SUPABASE_URL", "SUPABASE_KEY"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"Error: The following environment variables are not set: {', '.join(missing_vars)}")
        print("Please set them in your .env file or environment.")
        return False
    
    return True

def run_agent(agent_name, duration=60):
    """Run the specified agent for a given duration"""
    print(f"Starting {agent_name} for {duration} seconds...")
    
    if agent_name == "example":
        # Run the example agent
        agent_script = "example_agent_with_status.py"
    elif agent_name == "tweet_scraping":
        # Run the tweet scraping agent with status updates
        agent_script = "2_langchain_tweet_scraping_agent_with_status.py"
    else:
        print(f"Unknown agent: {agent_name}")
        return
    
    try:
        # Start the agent process
        process = subprocess.Popen([sys.executable, agent_script], 
                                  stdout=subprocess.PIPE,
                                  stderr=subprocess.PIPE,
                                  text=True,
                                  bufsize=1)
        
        # Monitor the agent for the specified duration
        start_time = time.time()
        while time.time() - start_time < duration:
            # Check if the process is still running
            if process.poll() is not None:
                print(f"Agent process exited with code {process.returncode}")
                break
            
            # Read output from the process
            output = process.stdout.readline()
            if output:
                print(output.strip())
            
            # Read error output from the process
            error = process.stderr.readline()
            if error:
                print(f"ERROR: {error.strip()}", file=sys.stderr)
            
            # Sleep briefly to avoid high CPU usage
            time.sleep(0.1)
        
        # Time's up, terminate the process
        if process.poll() is None:
            print(f"Time's up! Stopping {agent_name}...")
            process.send_signal(signal.SIGINT)  # Send Ctrl+C signal
            
            # Give the process a chance to shut down gracefully
            for _ in range(50):  # Wait up to 5 seconds
                if process.poll() is not None:
                    break
                time.sleep(0.1)
            
            # If it's still running, force kill it
            if process.poll() is None:
                print(f"Force killing {agent_name}...")
                process.terminate()
        
        # Get any remaining output
        stdout, stderr = process.communicate()
        if stdout:
            print(stdout)
        if stderr:
            print(f"ERROR: {stderr}", file=sys.stderr)
        
        print(f"{agent_name} has been stopped.")
        
    except KeyboardInterrupt:
        print("\nUser interrupted. Stopping agent...")
        if process.poll() is None:
            process.send_signal(signal.SIGINT)
            process.wait()
        print(f"{agent_name} has been stopped.")
    except Exception as e:
        print(f"Error running {agent_name}: {str(e)}")
        if 'process' in locals() and process.poll() is None:
            process.terminate()

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="Test the agent status system")
    parser.add_argument("--agent", choices=["example", "tweet_scraping"], default="example",
                        help="Which agent to run (default: example)")
    parser.add_argument("--duration", type=int, default=60,
                        help="How long to run the agent in seconds (default: 60)")
    args = parser.parse_args()
    
    if not check_environment():
        return
    
    run_agent(args.agent, args.duration)

if __name__ == "__main__":
    main()
