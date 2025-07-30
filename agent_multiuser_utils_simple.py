"""
Simple Multiuser Agent Utilities

This module provides basic functions for agents to work in a multiuser environment.
Simplified version to avoid import issues.
"""

import os
import logging
import datetime
from typing import Optional, Dict, Any

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

def get_user_context():
    """
    Get the user context from environment variables.
    This is set by the process manager when starting agents.
    
    Returns:
        str: The user ID if available, None otherwise
    """
    # Try multiple environment variable names for flexibility
    return os.getenv("AGENT_USER_ID") or os.getenv("USER_ID") or os.getenv("CURRENT_USER_ID")

def set_user_context(user_id: str) -> bool:
    """
    Set the user context for the current process.
    
    Args:
        user_id: The user ID to set as context
        
    Returns:
        bool: True if context was set successfully
    """
    try:
        os.environ["AGENT_USER_ID"] = user_id
        logger.info(f"User context set to: {user_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to set user context: {str(e)}")
        return False

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
        # Import supabase only when needed to avoid hanging
        from supabase import create_client
        
        # Get user context
        user_id = get_user_context()
        if not user_id:
            logger.warning(f"No user context available for logging from {agent_name}")
            # Still log but without user context for backward compatibility
        
        # Get Supabase credentials
        SUPABASE_URL = os.getenv("SUPABASE_URL")
        SUPABASE_KEY = os.getenv("SUPABASE_KEY")
        
        if not SUPABASE_URL or not SUPABASE_KEY:
            logger.error("Supabase credentials not found in environment variables")
            return False
        
        # Create Supabase client
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        
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
            logger.info(f"Successfully logged to database: {agent_name} - {message}")
            return True
        else:
            logger.error(f"Failed to insert log: {result}")
            return False
            
    except Exception as e:
        logger.error(f"Failed to log to database: {str(e)}")
        return False

def mark_agent_started_with_user(agent_name: str) -> bool:
    """
    Mark an agent as started (with user context).
    
    Args:
        agent_name: The name of the agent
        
    Returns:
        bool: True if the agent was marked as started successfully, False otherwise
    """
    # Log the start
    return log_to_database(agent_name, "info", "Agent started with user context")

def mark_agent_stopped_with_user(agent_name: str) -> bool:
    """
    Mark an agent as stopped (with user context).
    
    Args:
        agent_name: The name of the agent
        
    Returns:
        bool: True if the agent was marked as stopped successfully, False otherwise
    """
    # Log the stop
    return log_to_database(agent_name, "info", "Agent stopped with user context")

def report_error_with_user(agent_name: str, error_message: str) -> bool:
    """
    Report an error for an agent (with user context).
    
    Args:
        agent_name: The name of the agent
        error_message: The error message
        
    Returns:
        bool: True if the error was reported successfully, False otherwise
    """
    # Log the error
    return log_to_database(agent_name, "error", error_message)
