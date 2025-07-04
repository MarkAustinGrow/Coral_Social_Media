"""
Script to fix agent status in the database.

This script will update the status of the Tweet Scraping Agent to 'stopped'
in the agent_status table in Supabase.
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

def fix_agent_status(agent_name, status="stopped", health=0):
    """
    Fix the status of an agent in the Supabase database.
    
    Args:
        agent_name: The name of the agent to update
        status: The status to set (default: stopped)
        health: The health to set (default: 0)
        
    Returns:
        bool: True if the update was successful, False otherwise
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: Supabase credentials not found in environment variables")
        return False
    
    # Check current status
    current_status = get_agent_status(agent_name)
    if current_status:
        print(f"Current status of {agent_name}: {current_status['status']} with health {current_status['health']}")
    
    # Prepare data for update
    data = {
        "status": status,
        "health": health,
        "last_activity": "Status manually fixed",
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
        
        print(f"Updating status of {agent_name} to {status} with health {health}...")
        response = requests.patch(url, headers=headers, params=params, json=data)
        
        if response.status_code in [200, 201, 204]:
            print(f"Successfully updated status of {agent_name} to {status}")
            
            # Verify the update
            updated_status = get_agent_status(agent_name)
            if updated_status:
                print(f"Verified status of {agent_name}: {updated_status['status']} with health {updated_status['health']}")
                if updated_status['status'] != status or updated_status['health'] != health:
                    print(f"WARNING: Status not updated correctly!")
            
            return True
        else:
            print(f"Error updating agent status: {response.status_code} {response.text}")
            return False
    
    except Exception as e:
        print(f"Exception updating agent status: {str(e)}")
        return False

def main():
    """Main function"""
    # Print Supabase credentials (without showing the actual key)
    print(f"Supabase URL: {'Available' if SUPABASE_URL else 'Not available'}")
    print(f"Supabase Key: {'Available' if SUPABASE_KEY else 'Not available'}")
    
    # Get current status of all agents
    try:
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json"
        }
        
        url = f"{SUPABASE_URL}/rest/v1/agent_status"
        params = {
            "select": "*"
        }
        
        print("\nFetching all agent statuses...")
        response = requests.get(url, headers=headers, params=params)
        
        if response.status_code == 200:
            agents = response.json()
            print(f"Found {len(agents)} agents:")
            for agent in agents:
                print(f"  - {agent['agent_name']}: {agent['status']} (health: {agent['health']})")
        else:
            print(f"Error getting agent statuses: {response.status_code} {response.text}")
    except Exception as e:
        print(f"Exception getting agent statuses: {str(e)}")
    
    # Fix the status of the Tweet Scraping Agent
    print("\nAttempting to fix Tweet Scraping Agent status...")
    fix_agent_status("Tweet Scraping Agent")
    
    # You can add more agents to fix here if needed
    # fix_agent_status("Another Agent Name")

if __name__ == "__main__":
    main()
