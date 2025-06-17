"""
Agent Status Lock

This module provides a simple lock mechanism to prevent agents from updating their status
when they are not actually running. It's used to fix issues where agents might be stuck
in a "running" state even though they're not actually running.
"""

import os
import json
import time
from datetime import datetime
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get Supabase credentials from environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

def force_agent_status(agent_name, status="stopped", health=0, last_activity="Status manually fixed"):
    """
    Force the status of an agent in the Supabase database.
    This is used to fix agents that are stuck in a "running" state.
    
    Args:
        agent_name: The name of the agent to update
        status: The status to set (default: stopped)
        health: The health to set (default: 0)
        last_activity: Description of the activity (default: "Status manually fixed")
        
    Returns:
        bool: True if the update was successful, False otherwise
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: Supabase credentials not found in environment variables")
        return False
    
    # Validate inputs
    if status not in ["running", "warning", "error", "stopped"]:
        print(f"Error: Invalid status '{status}'. Must be one of: running, warning, error, stopped")
        return False
    
    if not isinstance(health, int) or health < 0 or health > 100:
        print(f"Error: Invalid health '{health}'. Must be an integer between 0 and 100")
        return False
    
    # Prepare data for update
    data = {
        "status": status,
        "health": health,
        "last_activity": last_activity,
        "updated_at": datetime.now().isoformat()
    }
    
    # Update the agent status in Supabase
    try:
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"  # Return the updated record
        }
        
        url = f"{SUPABASE_URL}/rest/v1/agent_status"
        params = {"agent_name": f"eq.{agent_name}"}
        
        print(f"Forcing status of {agent_name} to {status} with health {health}...")
        response = requests.patch(url, headers=headers, params=params, json=data)
        
        if response.status_code in [200, 201, 204]:
            print(f"Successfully forced status of {agent_name} to {status}")
            return True
        else:
            print(f"Error updating agent status: {response.status_code} {response.text}")
            return False
    
    except Exception as e:
        print(f"Exception updating agent status: {str(e)}")
        return False

def get_agent_status(agent_name):
    """
    Get the current status of an agent from the Supabase database.
    
    Args:
        agent_name: The name of the agent to check
        
    Returns:
        dict: The agent status data, or None if not found
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: Supabase credentials not found in environment variables")
        return None
    
    try:
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json"
        }
        
        url = f"{SUPABASE_URL}/rest/v1/agent_status"
        params = {
            "agent_name": f"eq.{agent_name}",
            "select": "*"
        }
        
        response = requests.get(url, headers=headers, params=params)
        
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                return data[0]
            else:
                print(f"Agent {agent_name} not found in database")
                return None
        else:
            print(f"Error getting agent status: {response.status_code} {response.text}")
            return None
    
    except Exception as e:
        print(f"Exception getting agent status: {str(e)}")
        return None

def list_all_agents():
    """
    List all agents and their statuses from the Supabase database.
    
    Returns:
        list: List of agent status records, or empty list if none found
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: Supabase credentials not found in environment variables")
        return []
    
    try:
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json"
        }
        
        url = f"{SUPABASE_URL}/rest/v1/agent_status"
        params = {
            "select": "*",
            "order": "agent_name.asc"
        }
        
        response = requests.get(url, headers=headers, params=params)
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error listing agents: {response.status_code} {response.text}")
            return []
    
    except Exception as e:
        print(f"Exception listing agents: {str(e)}")
        return []

if __name__ == "__main__":
    # Example usage
    print("Agent Status Lock Utility")
    print("========================")
    print("\nCurrent agent statuses:")
    
    agents = list_all_agents()
    for agent in agents:
        print(f"  - {agent['agent_name']}: {agent['status']} (health: {agent['health']})")
    
    print("\nTo force an agent's status, run:")
    print("  python agent_status_lock.py <agent_name> <status> <health>")
    
    # Check if command line arguments were provided
    import sys
    if len(sys.argv) >= 2:
        agent_name = sys.argv[1]
        status = sys.argv[2] if len(sys.argv) >= 3 else "stopped"
        health = int(sys.argv[3]) if len(sys.argv) >= 4 else 0
        
        force_agent_status(agent_name, status, health)
