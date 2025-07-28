#!/usr/bin/env python3
"""
Emergency script to stop all running agents
"""

import subprocess
import sys
import os

def stop_all_python_agents():
    """Stop all Python agent processes"""
    try:
        # Get all Python processes
        result = subprocess.run(['ps', 'aux'], capture_output=True, text=True)
        lines = result.stdout.split('\n')
        
        agent_processes = []
        for line in lines:
            if 'python' in line and any(agent in line for agent in [
                'langchain_tweet_scraping_agent',
                'langchain_tweet_research_agent', 
                'langchain_blog_writing_agent',
                'langchain_blog_critique_agent',
                'langchain_blog_to_tweet_agent',
                'langchain_twitter_posting_agent',
                'langchain_x_reply_agent',
                'langchain_hot_topic_agent',
                'langchain_world_news_agent',
                'langchain_interface'
            ]):
                parts = line.split()
                if len(parts) > 1:
                    pid = parts[1]
                    agent_processes.append((pid, line))
        
        if not agent_processes:
            print("No agent processes found running")
            return
        
        print(f"Found {len(agent_processes)} agent processes:")
        for pid, line in agent_processes:
            print(f"PID {pid}: {line}")
        
        # Kill all agent processes
        for pid, line in agent_processes:
            try:
                subprocess.run(['kill', '-TERM', pid], check=True)
                print(f"Stopped process {pid}")
            except subprocess.CalledProcessError:
                try:
                    subprocess.run(['kill', '-KILL', pid], check=True)
                    print(f"Force killed process {pid}")
                except subprocess.CalledProcessError:
                    print(f"Failed to kill process {pid}")
        
        print("All agent processes stopped")
        
    except Exception as e:
        print(f"Error stopping agents: {e}")

def stop_pm2_processes():
    """Stop all PM2 processes"""
    try:
        # Stop all PM2 processes
        subprocess.run(['pm2', 'stop', 'all'], check=True)
        print("Stopped all PM2 processes")
        
        # Delete all PM2 processes
        subprocess.run(['pm2', 'delete', 'all'], check=True)
        print("Deleted all PM2 processes")
        
    except subprocess.CalledProcessError as e:
        print(f"Error with PM2: {e}")
    except FileNotFoundError:
        print("PM2 not found, skipping PM2 cleanup")

if __name__ == "__main__":
    print("🛑 Emergency Agent Stop Script")
    print("=" * 40)
    
    # Stop Python agents
    print("\n1. Stopping Python agent processes...")
    stop_all_python_agents()
    
    # Stop PM2 processes
    print("\n2. Stopping PM2 processes...")
    stop_pm2_processes()
    
    print("\n✅ All agents should now be stopped")
    print("You can now restart PM2 with: pm2 start ecosystem.config.js")
