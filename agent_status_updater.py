"""
Agent Status Updater

This module provides functions to update the status of agents in the Supabase database.
It can be imported by the Python agents to update their status as they run.

Enhanced with:
- Retry mechanism for database operations
- Local file-based fallback for when the database is unreachable
- Mechanism to prevent agents from getting stuck when they can't connect to the database
"""

import os
import json
import time
import logging
import socket
from datetime import datetime
from typing import Optional, Literal, Dict, Any
import requests
from dotenv import load_dotenv
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Get Supabase credentials from environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Status types
StatusType = Literal["running", "warning", "error", "stopped"]

# Constants for retry mechanism
MAX_RETRIES = 3
RETRY_DELAY = 1  # seconds
CONNECTION_TIMEOUT = 5  # seconds

# Constants for local fallback
LOCAL_STATUS_DIR = Path("agent_status_cache")
MAX_FAILED_UPDATES = 5  # Maximum number of consecutive failed updates before forcing agent termination

# Create local status directory if it doesn't exist
LOCAL_STATUS_DIR.mkdir(exist_ok=True)

# Track consecutive failed updates
consecutive_failed_updates = {}

def is_network_available() -> bool:
    """
    Check if the network is available by attempting to connect to a reliable host.
    
    Returns:
        bool: True if the network is available, False otherwise
    """
    try:
        # Try to connect to Google's DNS server
        socket.create_connection(("8.8.8.8", 53), timeout=CONNECTION_TIMEOUT)
        return True
    except OSError:
        return False

def save_status_locally(agent_name: str, status_data: Dict[str, Any]) -> bool:
    """
    Save agent status to a local file as a fallback when the database is unreachable.
    
    Args:
        agent_name: The name of the agent
        status_data: The status data to save
        
    Returns:
        bool: True if the status was saved successfully, False otherwise
    """
    try:
        file_path = LOCAL_STATUS_DIR / f"{agent_name.replace(' ', '_').lower()}_status.json"
        with open(file_path, 'w') as f:
            json.dump(status_data, f)
        return True
    except Exception as e:
        logger.error(f"Error saving status locally: {str(e)}")
        return False

def get_local_status(agent_name: str) -> Optional[Dict[str, Any]]:
    """
    Get agent status from a local file.
    
    Args:
        agent_name: The name of the agent
        
    Returns:
        Optional[Dict[str, Any]]: The status data if available, None otherwise
    """
    try:
        file_path = LOCAL_STATUS_DIR / f"{agent_name.replace(' ', '_').lower()}_status.json"
        if file_path.exists():
            with open(file_path, 'r') as f:
                return json.load(f)
        return None
    except Exception as e:
        logger.error(f"Error reading local status: {str(e)}")
        return None

def update_agent_status(
    agent_name: str,
    status: StatusType,
    health: int,
    last_activity: Optional[str] = None,
    last_error: Optional[str] = None
) -> bool:
    """
    Update the status of an agent in the Supabase database.
    
    Args:
        agent_name: The name of the agent to update
        status: The status of the agent (running, warning, error, stopped)
        health: The health of the agent (0-100)
        last_activity: Optional description of the last activity
        last_error: Optional error message
        
    Returns:
        bool: True if the update was successful, False otherwise
    """
    global consecutive_failed_updates
    
    # Initialize consecutive failed updates counter if not already set
    if agent_name not in consecutive_failed_updates:
        consecutive_failed_updates[agent_name] = 0
    
    # Validate inputs
    if status not in ["running", "warning", "error", "stopped"]:
        logger.error(f"Invalid status '{status}'. Must be one of: running, warning, error, stopped")
        return False
    
    if not isinstance(health, int) or health < 0 or health > 100:
        logger.error(f"Invalid health '{health}'. Must be an integer between 0 and 100")
        return False
    
    # Prepare data for update
    data = {
        "agent_name": agent_name,
        "status": status,
        "health": health,
        "updated_at": datetime.now().isoformat()
    }
    
    if last_activity:
        data["last_activity"] = last_activity
    
    if last_error:
        data["last_error"] = last_error
    
    # Always save status locally as a backup
    save_status_locally(agent_name, data)
    
    # Check if network is available
    if not is_network_available():
        logger.warning(f"Network unavailable, could not update status for {agent_name}")
        consecutive_failed_updates[agent_name] += 1
        
        # Check if we've exceeded the maximum number of consecutive failed updates
        if consecutive_failed_updates[agent_name] >= MAX_FAILED_UPDATES:
            logger.critical(
                f"Maximum consecutive failed updates ({MAX_FAILED_UPDATES}) exceeded for {agent_name}. "
                f"Agent should terminate to prevent being stuck in an inconsistent state."
            )
            # If this is a critical agent, we might want to exit the process here
            if status != "stopped":  # Don't exit if we're already trying to stop
                logger.critical("Forcing agent termination due to database connectivity issues")
                # We don't call sys.exit() directly to allow the caller to handle cleanup
                return False
        
        return False
    
    # If Supabase credentials are missing, log and return
    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.error("Supabase credentials not found in environment variables")
        consecutive_failed_updates[agent_name] += 1
        return False
    
    # Update the agent status in Supabase with retry mechanism
    for attempt in range(MAX_RETRIES):
        try:
            headers = {
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            }
            
            url = f"{SUPABASE_URL}/rest/v1/agent_status"
            params = {"agent_name": f"eq.{agent_name}"}
            
            response = requests.patch(
                url, 
                headers=headers, 
                params=params, 
                json=data,
                timeout=CONNECTION_TIMEOUT
            )
            
            if response.status_code in [200, 201, 204]:
                # Reset consecutive failed updates counter on success
                consecutive_failed_updates[agent_name] = 0
                return True
            else:
                logger.warning(
                    f"Error updating agent status (attempt {attempt+1}/{MAX_RETRIES}): "
                    f"{response.status_code} {response.text}"
                )
                
                # If this is the last attempt, increment the consecutive failed updates counter
                if attempt == MAX_RETRIES - 1:
                    consecutive_failed_updates[agent_name] += 1
                
                # Wait before retrying
                if attempt < MAX_RETRIES - 1:
                    time.sleep(RETRY_DELAY * (attempt + 1))  # Exponential backoff
        
        except requests.exceptions.RequestException as e:
            logger.warning(f"Request exception (attempt {attempt+1}/{MAX_RETRIES}): {str(e)}")
            
            # If this is the last attempt, increment the consecutive failed updates counter
            if attempt == MAX_RETRIES - 1:
                consecutive_failed_updates[agent_name] += 1
            
            # Wait before retrying
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY * (attempt + 1))  # Exponential backoff
        
        except Exception as e:
            logger.error(f"Unexpected exception updating agent status: {str(e)}")
            consecutive_failed_updates[agent_name] += 1
            return False
    
    # Check if we've exceeded the maximum number of consecutive failed updates
    if consecutive_failed_updates[agent_name] >= MAX_FAILED_UPDATES:
        logger.critical(
            f"Maximum consecutive failed updates ({MAX_FAILED_UPDATES}) exceeded for {agent_name}. "
            f"Agent should terminate to prevent being stuck in an inconsistent state."
        )
        # If this is a critical agent, we might want to exit the process here
        if status != "stopped":  # Don't exit if we're already trying to stop
            logger.critical("Forcing agent termination due to database connectivity issues")
            # We don't call sys.exit() directly to allow the caller to handle cleanup
            return False
    
    return False

def send_heartbeat(agent_name: str, health: int = 100) -> bool:
    """
    Send a heartbeat for an agent to indicate it's still running.
    
    Args:
        agent_name: The name of the agent
        health: The health of the agent (0-100)
        
    Returns:
        bool: True if the heartbeat was successful, False otherwise
    """
    return update_agent_status(
        agent_name=agent_name,
        status="running",
        health=health,
        last_activity="Heartbeat"
    )

def report_warning(agent_name: str, warning_message: str, health: int = 75) -> bool:
    """
    Report a warning for an agent.
    
    Args:
        agent_name: The name of the agent
        warning_message: The warning message
        health: The health of the agent (0-100)
        
    Returns:
        bool: True if the warning was reported successfully, False otherwise
    """
    return update_agent_status(
        agent_name=agent_name,
        status="warning",
        health=health,
        last_activity=warning_message
    )

def report_error(agent_name: str, error_message: str, health: int = 30) -> bool:
    """
    Report an error for an agent.
    
    Args:
        agent_name: The name of the agent
        error_message: The error message
        health: The health of the agent (0-100)
        
    Returns:
        bool: True if the error was reported successfully, False otherwise
    """
    return update_agent_status(
        agent_name=agent_name,
        status="error",
        health=health,
        last_activity="Error occurred",
        last_error=error_message
    )

def mark_agent_started(agent_name: str) -> bool:
    """
    Mark an agent as started.
    
    Args:
        agent_name: The name of the agent
        
    Returns:
        bool: True if the agent was marked as started successfully, False otherwise
    """
    return update_agent_status(
        agent_name=agent_name,
        status="running",
        health=100,
        last_activity="Agent started"
    )

def mark_agent_stopped(agent_name: str) -> bool:
    """
    Mark an agent as stopped.
    
    Args:
        agent_name: The name of the agent
        
    Returns:
        bool: True if the agent was marked as stopped successfully, False otherwise
    """
    return update_agent_status(
        agent_name=agent_name,
        status="stopped",
        health=0,
        last_activity="Agent stopped"
    )

def should_terminate(agent_name: str) -> bool:
    """
    Check if an agent should terminate due to database connectivity issues.
    
    Args:
        agent_name: The name of the agent
        
    Returns:
        bool: True if the agent should terminate, False otherwise
    """
    global consecutive_failed_updates
    
    # Initialize consecutive failed updates counter if not already set
    if agent_name not in consecutive_failed_updates:
        return False
    
    # Check if we've exceeded the maximum number of consecutive failed updates
    if consecutive_failed_updates[agent_name] >= MAX_FAILED_UPDATES:
        logger.critical(
            f"Maximum consecutive failed updates ({MAX_FAILED_UPDATES}) exceeded for {agent_name}. "
            f"Agent should terminate to prevent being stuck in an inconsistent state."
        )
        return True
    
    return False

def reset_failed_updates(agent_name: str) -> None:
    """
    Reset the consecutive failed updates counter for an agent.
    
    Args:
        agent_name: The name of the agent
    """
    global consecutive_failed_updates
    consecutive_failed_updates[agent_name] = 0

# Example usage in an agent script:
"""
import agent_status_updater as asu
import time
import atexit
import sys

# Agent name should match the name in the agent_status table
AGENT_NAME = "Content Collector"

# Mark agent as started
asu.mark_agent_started(AGENT_NAME)

# Register function to mark agent as stopped when the script exits
atexit.register(lambda: asu.mark_agent_stopped(AGENT_NAME))

try:
    # Main agent loop
    while True:
        # Do agent work...
        
        # Send heartbeat every minute
        heartbeat_success = asu.send_heartbeat(AGENT_NAME)
        
        # Check if we should terminate due to database connectivity issues
        if not heartbeat_success and asu.should_terminate(AGENT_NAME):
            logger.critical("Terminating agent due to persistent database connectivity issues")
            # Attempt to save final status locally before exiting
            asu.save_status_locally(AGENT_NAME, {
                "agent_name": AGENT_NAME,
                "status": "stopped",
                "health": 0,
                "last_activity": "Terminated due to database connectivity issues",
                "updated_at": datetime.now().isoformat()
            })
            sys.exit(1)
        
        # If a warning occurs
        # asu.report_warning(AGENT_NAME, "Rate limit approaching")
        
        # If an error occurs
        # asu.report_error(AGENT_NAME, "Failed to fetch tweets")
        
        time.sleep(60)
except Exception as e:
    # Report any uncaught exceptions
    asu.report_error(AGENT_NAME, str(e))
    raise
finally:
    # Mark agent as stopped (this will also be called by atexit)
    asu.mark_agent_stopped(AGENT_NAME)
"""
