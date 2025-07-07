"""
Multiuser Agent Utilities

This module provides functions for agents to work in a multiuser environment.
It handles user context, logging, and status updates with proper user isolation.
"""

import os
import json
import time
import logging
import datetime
from typing import Optional, Literal, Dict, Any
from supabase import create_client, Client
from dotenv import load_dotenv

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

def get_user_context():
    """
    Get the user context from environment variables.
    This is set by the process manager when starting agents.
    
    Returns:
        str: The user ID if available, None otherwise
    """
    return os.getenv("AGENT_USER_ID")

def get_supabase_client() -> Optional[Client]:
    """
    Get a Supabase client instance.
    
    Returns:
        Optional[Client]: Supabase client if credentials are available, None otherwise
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.error("Supabase credentials not found in environment variables")
        return None
    
    try:
        return create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        logger.error(f"Error creating Supabase client: {str(e)}")
        return None

def log_to_database(agent_name: str, level: str, message: str, metadata: Optional[Dict[str, Any]] = None) -> bool:
    """
    Log agent activity to the agent_logs table in Supabase with user context.
    
    Args:
        agent_name: The name of the agent
        level: Log level ('info', 'warning', 'error')
        message: Log message
        metadata: Optional JSON metadata
        
    Returns:
        bool: True if the log was saved successfully, False otherwise
    """
    try:
        # Get user context
        user_id = get_user_context()
        if not user_id:
            logger.warning(f"No user context available for logging from {agent_name}")
            # Still log but without user context for backward compatibility
        
        # Get Supabase client
        supabase = get_supabase_client()
        if not supabase:
            logger.error("Failed to get Supabase client for logging")
            return False
        
        # Prepare log data
        log_data = {
            "timestamp": datetime.datetime.now().isoformat(),
            "level": level,
            "agent_name": agent_name,
            "message": message,
            "metadata": metadata
        }
        
        # Add user_id if available
        if user_id:
            log_data["user_id"] = user_id
        
        # Insert log into agent_logs table
        result = supabase.table("agent_logs").insert(log_data).execute()
        
        if result.data:
            return True
        else:
            logger.error(f"Failed to insert log: {result}")
            return False
            
    except Exception as e:
        logger.error(f"Failed to log to database: {str(e)}")
        return False

def update_agent_status_with_user(
    agent_name: str,
    status: StatusType,
    health: int,
    last_activity: Optional[str] = None,
    last_error: Optional[str] = None
) -> bool:
    """
    Update the status of an agent in the Supabase database with user context.
    
    Args:
        agent_name: The name of the agent to update
        status: The status of the agent (running, warning, error, stopped)
        health: The health of the agent (0-100)
        last_activity: Optional description of the last activity
        last_error: Optional error message
        
    Returns:
        bool: True if the update was successful, False otherwise
    """
    try:
        # Get user context
        user_id = get_user_context()
        if not user_id:
            logger.warning(f"No user context available for status update from {agent_name}")
            # Fall back to old behavior for backward compatibility
            return False
        
        # Validate inputs
        if status not in ["running", "warning", "error", "stopped"]:
            logger.error(f"Invalid status '{status}'. Must be one of: running, warning, error, stopped")
            return False
        
        if not isinstance(health, int) or health < 0 or health > 100:
            logger.error(f"Invalid health '{health}'. Must be an integer between 0 and 100")
            return False
        
        # Get Supabase client
        supabase = get_supabase_client()
        if not supabase:
            logger.error("Failed to get Supabase client for status update")
            return False
        
        # Prepare data for update
        data = {
            "status": status,
            "health": health,
            "updated_at": datetime.datetime.now().isoformat()
        }
        
        if last_activity:
            data["last_activity"] = last_activity
        
        if last_error:
            data["last_error"] = last_error
        
        # Update the agent status for this specific user
        result = supabase.table("agent_status").update(data).eq("agent_name", agent_name).eq("user_id", user_id).execute()
        
        if result.data:
            logger.info(f"Successfully updated status for {agent_name} (user: {user_id}) to {status}")
            return True
        else:
            logger.error(f"Failed to update agent status: {result}")
            return False
            
    except Exception as e:
        logger.error(f"Error updating agent status: {str(e)}")
        return False

def send_heartbeat_with_user(agent_name: str, health: int = 100) -> bool:
    """
    Send a heartbeat for an agent to indicate it's still running (with user context).
    
    Args:
        agent_name: The name of the agent
        health: The health of the agent (0-100)
        
    Returns:
        bool: True if the heartbeat was successful, False otherwise
    """
    return update_agent_status_with_user(
        agent_name=agent_name,
        status="running",
        health=health,
        last_activity="Heartbeat"
    )

def report_warning_with_user(agent_name: str, warning_message: str, health: int = 75) -> bool:
    """
    Report a warning for an agent (with user context).
    
    Args:
        agent_name: The name of the agent
        warning_message: The warning message
        health: The health of the agent (0-100)
        
    Returns:
        bool: True if the warning was reported successfully, False otherwise
    """
    # Log the warning
    log_to_database(agent_name, "warning", warning_message)
    
    # Update status
    return update_agent_status_with_user(
        agent_name=agent_name,
        status="warning",
        health=health,
        last_activity=warning_message
    )

def report_error_with_user(agent_name: str, error_message: str, health: int = 30) -> bool:
    """
    Report an error for an agent (with user context).
    
    Args:
        agent_name: The name of the agent
        error_message: The error message
        health: The health of the agent (0-100)
        
    Returns:
        bool: True if the error was reported successfully, False otherwise
    """
    # Log the error
    log_to_database(agent_name, "error", error_message)
    
    # Update status
    return update_agent_status_with_user(
        agent_name=agent_name,
        status="error",
        health=health,
        last_activity="Error occurred",
        last_error=error_message
    )

def mark_agent_started_with_user(agent_name: str) -> bool:
    """
    Mark an agent as started (with user context).
    
    Args:
        agent_name: The name of the agent
        
    Returns:
        bool: True if the agent was marked as started successfully, False otherwise
    """
    # Log the start
    log_to_database(agent_name, "info", "Agent started")
    
    # Update status
    return update_agent_status_with_user(
        agent_name=agent_name,
        status="running",
        health=100,
        last_activity="Agent started"
    )

def mark_agent_stopped_with_user(agent_name: str) -> bool:
    """
    Mark an agent as stopped (with user context).
    
    Args:
        agent_name: The name of the agent
        
    Returns:
        bool: True if the agent was marked as stopped successfully, False otherwise
    """
    # Log the stop
    log_to_database(agent_name, "info", "Agent stopped")
    
    # Update status
    return update_agent_status_with_user(
        agent_name=agent_name,
        status="stopped",
        health=0,
        last_activity="Agent stopped"
    )

# Example usage in an agent script:
"""
import agent_multiuser_utils as amu
import time
import atexit
import sys

# Agent name should match the name in the agent_status table
AGENT_NAME = "Tweet Scraping Agent"

# Mark agent as started with user context
amu.mark_agent_started_with_user(AGENT_NAME)

# Register function to mark agent as stopped when the script exits
atexit.register(lambda: amu.mark_agent_stopped_with_user(AGENT_NAME))

try:
    # Main agent loop
    while True:
        # Do agent work...
        amu.log_to_database(AGENT_NAME, "info", "Processing tweets...")
        
        # Send heartbeat every minute
        amu.send_heartbeat_with_user(AGENT_NAME)
        
        # If a warning occurs
        # amu.report_warning_with_user(AGENT_NAME, "Rate limit approaching")
        
        # If an error occurs
        # amu.report_error_with_user(AGENT_NAME, "Failed to fetch tweets")
        
        time.sleep(60)
except Exception as e:
    # Report any uncaught exceptions
    amu.report_error_with_user(AGENT_NAME, str(e))
    raise
finally:
    # Mark agent as stopped (this will also be called by atexit)
    amu.mark_agent_stopped_with_user(AGENT_NAME)
"""
