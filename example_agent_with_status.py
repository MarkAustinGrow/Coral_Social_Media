"""
Example Agent with Status Updates

This script demonstrates how to use the agent_status_updater module to update
the status of an agent in the Supabase database.
"""

import time
import random
import atexit
import signal
import sys
import agent_status_updater as asu

# Agent name should match the name in the agent_status table
AGENT_NAME = "Content Collector"

def signal_handler(sig, frame):
    """Handle Ctrl+C and other signals to gracefully shut down"""
    print("\nShutting down gracefully...")
    asu.mark_agent_stopped(AGENT_NAME)
    sys.exit(0)

def main():
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)  # Ctrl+C
    signal.signal(signal.SIGTERM, signal_handler)  # Termination signal
    
    # Register function to mark agent as stopped when the script exits
    atexit.register(lambda: asu.mark_agent_stopped(AGENT_NAME))
    
    # Mark agent as started
    print(f"Starting {AGENT_NAME}...")
    success = asu.mark_agent_started(AGENT_NAME)
    if not success:
        print("Failed to update agent status. Check your Supabase credentials.")
        return
    
    print(f"{AGENT_NAME} started successfully!")
    
    # Simulate agent work
    try:
        iteration = 0
        while True:
            iteration += 1
            print(f"Iteration {iteration}...")
            
            # Simulate different agent states based on random events
            random_value = random.random()
            
            if random_value < 0.1:  # 10% chance of error
                print("Simulating an error...")
                asu.report_error(AGENT_NAME, f"Simulated error on iteration {iteration}")
                time.sleep(5)  # Wait a bit after an error
                
                # Recover from error
                print("Recovering from error...")
                asu.mark_agent_started(AGENT_NAME)
                
            elif random_value < 0.3:  # 20% chance of warning
                print("Simulating a warning...")
                asu.report_warning(AGENT_NAME, f"Simulated warning on iteration {iteration}", health=75)
                
            else:  # 70% chance of normal operation
                # Send heartbeat
                health = random.randint(90, 100)  # Simulate slight health variations
                print(f"Sending heartbeat with health {health}%...")
                asu.send_heartbeat(AGENT_NAME, health=health)
            
            # Wait before next iteration
            wait_time = random.randint(3, 8)
            print(f"Waiting {wait_time} seconds...")
            time.sleep(wait_time)
            
    except Exception as e:
        # Report any uncaught exceptions
        print(f"Uncaught exception: {str(e)}")
        asu.report_error(AGENT_NAME, f"Uncaught exception: {str(e)}")
        raise
    finally:
        # Mark agent as stopped
        asu.mark_agent_stopped(AGENT_NAME)
        print(f"{AGENT_NAME} stopped.")

if __name__ == "__main__":
    main()
