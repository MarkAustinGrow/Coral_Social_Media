#!/usr/bin/env python3
"""
Script to clean up stale interface agents from the Coral server.
This script attempts to deregister old timestamped interface agents.
"""

import requests
import json
import sys

# Coral server configuration
CORAL_BASE_URL = "http://coral.8interns.com:5555/devmode/exampleApplication/privkey/session1"

# List of stale agent IDs to remove (timestamped ones)
STALE_AGENTS = [
    "interface_agent_99d3ff50-dcb5-4389-8e76-2ecd626902bc_1753177565297",
    "interface_agent_99d3ff50-dcb5-4389-8e76-2ecd626902bc_1753178960106", 
    "interface_agent_99d3ff50-dcb5-4389-8e76-2ecd626902bc_1753180335478",
    "interface_agent_99d3ff50-dcb5-4389-8e76-2ecd626902bc_1753179388985",
    "interface_agent_99d3ff50-dcb5-4389-8e76-2ecd626902bc_1753176627279",
    "interface_agent_99d3ff50-dcb5-4389-8e76-2ecd626902bc_1753178561628",
    "interface_agent_99d3ff50-dcb5-4389-8e76-2ecd626902bc_1753177285686"
]

def try_deregister_agent(agent_id):
    """Attempt to deregister an agent using various possible endpoints."""
    
    endpoints_to_try = [
        f"{CORAL_BASE_URL}/mcp/deregister_agent",
        f"{CORAL_BASE_URL}/deregister_agent", 
        f"{CORAL_BASE_URL}/admin/deregister_agent",
        f"{CORAL_BASE_URL}/agents/deregister",
        f"{CORAL_BASE_URL}/remove_agent"
    ]
    
    for endpoint in endpoints_to_try:
        try:
            print(f"Trying to deregister {agent_id} via {endpoint}")
            
            response = requests.post(
                endpoint,
                headers={
                    'Content-Type': 'application/json',
                    'X-User-ID': '99d3ff50-dcb5-4389-8e76-2ecd626902bc'
                },
                json={
                    'agentId': agent_id,
                    'method': 'deregister_agent',
                    'params': {'agentId': agent_id}
                },
                timeout=10
            )
            
            print(f"Response: {response.status_code} - {response.text[:200]}")
            
            if response.status_code in [200, 202, 204]:
                print(f"✅ Successfully deregistered {agent_id}")
                return True
                
        except Exception as e:
            print(f"❌ Failed to deregister {agent_id} via {endpoint}: {e}")
            continue
    
    return False

def main():
    print("🧹 Starting cleanup of stale interface agents...")
    print(f"Target agents: {len(STALE_AGENTS)}")
    
    success_count = 0
    
    for agent_id in STALE_AGENTS:
        if try_deregister_agent(agent_id):
            success_count += 1
        print("-" * 50)
    
    print(f"\n📊 Cleanup Summary:")
    print(f"✅ Successfully deregistered: {success_count}")
    print(f"❌ Failed to deregister: {len(STALE_AGENTS) - success_count}")
    
    if success_count == 0:
        print("\n💡 If no endpoints worked, the agents may need to timeout naturally.")
        print("   The Coral server should clean them up automatically after a period of inactivity.")
    
    return success_count

if __name__ == "__main__":
    main()
