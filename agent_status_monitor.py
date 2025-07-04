"""
Agent Status Monitor

This script monitors agent statuses and automatically fixes any agents that are stuck
in the "running" state but are not actually running. It can be run as a service to
provide continuous monitoring.

Enhanced with:
- Local file-based fallback for when the database is unreachable
- Improved process detection and termination
- Better error handling and recovery
"""

import os
import sys
import time
import json
import logging
import subprocess
import psutil
import signal
from datetime import datetime, timedelta
import requests
from dotenv import load_dotenv
from pathlib import Path
import agent_status_lock as asl
import agent_status_updater as asu

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("agent_status_monitor.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Configuration
CHECK_INTERVAL = 60  # seconds - check every minute
MAX_RUNNING_TIME_WITHOUT_ACTIVITY = 300  # 5 minutes - more reasonable timeout
# Agent process names ordered according to the workflow
AGENT_PROCESS_NAMES = {
    "Tweet Scraping Agent": "2_langchain_tweet_scraping_agent_with_status.py",
    "Hot Topic Agent": "3.5_langchain_hot_topic_agent.py",
    "Tweet Research Agent": "3_langchain_tweet_research_agent.py",
    "Blog Writing Agent": "4_langchain_blog_writing_agent.py",
    "Blog Critique Agent": "4_langchain_blog_critique_agent.py",
    "Blog to Tweet Agent": "5_langchain_blog_to_tweet_agent.py",
    "Twitter Posting Agent": "7_langchain_twitter_posting_agent.py",
    "X Reply Agent": "6_langchain_x_reply_agent.py"
}

def is_process_running(process_name):
    """
    Check if a process with the given name is running.
    
    Args:
        process_name: The name of the process to check
        
    Returns:
        bool: True if the process is running, False otherwise
    """
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            # Check if process name contains the given name
            cmdline = ' '.join(proc.info['cmdline'] or [])
            if process_name in cmdline:
                return True
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass
    return False

def get_process_pid(process_name):
    """
    Get the PID of a process with the given name.
    
    Args:
        process_name: The name of the process to check
        
    Returns:
        int: The PID of the process, or None if not found
    """
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            # Check if process name contains the given name
            cmdline = ' '.join(proc.info['cmdline'] or [])
            if process_name in cmdline:
                return proc.info['pid']
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass
    return None

def kill_process(pid):
    """
    Kill a process with the given PID.
    
    Args:
        pid: The PID of the process to kill
        
    Returns:
        bool: True if the process was killed successfully, False otherwise
    """
    try:
        if os.name == 'nt':  # Windows
            subprocess.run(['taskkill', '/F', '/PID', str(pid), '/T'], check=True)
        else:  # Unix-like
            os.kill(pid, signal.SIGTERM)
            # Wait a moment for the process to terminate
            time.sleep(1)
            # If it's still running, use SIGKILL
            if psutil.pid_exists(pid):
                os.kill(pid, signal.SIGKILL)
        return True
    except (subprocess.SubprocessError, OSError, psutil.NoSuchProcess) as e:
        logger.error(f"Error killing process with PID {pid}: {str(e)}")
        return False

def check_agent_statuses():
    """
    Check the status of all agents and fix any that are stuck.
    """
    logger.info("Checking agent statuses...")
    
    try:
        # Check if network is available
        if not asu.is_network_available():
            logger.warning("Network is not available, using local status files")
            check_agent_statuses_local()
            return
        
        # Get all agents from the database
        agents = asl.list_all_agents()
        
        if not agents:
            logger.warning("No agents found in database, using local status files")
            check_agent_statuses_local()
            return
        
        for agent in agents:
            agent_name = agent['agent_name']
            status = agent['status']
            health = agent['health']
            last_activity = agent['last_activity']
            updated_at = agent['updated_at']
            
            logger.info(f"Checking agent: {agent_name}, status: {status}, health: {health}, last_activity: {last_activity}")
            
            # Skip agents that are already stopped
            if status == 'stopped':
                logger.info(f"Agent {agent_name} is already stopped, skipping")
                continue
            
            # Get the process name for this agent
            process_name = AGENT_PROCESS_NAMES.get(agent_name)
            if not process_name:
                logger.warning(f"Unknown agent: {agent_name}, skipping")
                continue
            
            # Check if the process is running
            is_running = is_process_running(process_name)
            logger.info(f"Agent {agent_name} process is running: {is_running}")
            
            # Calculate time since last update
            try:
                updated_at_dt = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
                time_since_update = (datetime.now() - updated_at_dt).total_seconds()
                logger.info(f"Agent {agent_name} time since last update: {time_since_update:.2f} seconds")
            except (ValueError, TypeError):
                logger.warning(f"Invalid updated_at timestamp for {agent_name}: {updated_at}")
                time_since_update = MAX_RUNNING_TIME_WITHOUT_ACTIVITY + 1  # Force check
            
            # If the agent is marked as running but the process is not running,
            # or if the agent has been running for too long without activity,
            # mark it as stopped
            if status == 'running' and (
                not is_running or 
                time_since_update > MAX_RUNNING_TIME_WITHOUT_ACTIVITY
            ):
                reason = "process not running" if not is_running else "no activity for too long"
                logger.info(f"Agent {agent_name} is marked as running but {reason}, fixing...")
                
                # If the process is still running, kill it
                if is_running:
                    pid = get_process_pid(process_name)
                    if pid:
                        logger.info(f"Killing process {process_name} with PID {pid}")
                        kill_success = kill_process(pid)
                        if kill_success:
                            logger.info(f"Successfully killed process {process_name} with PID {pid}")
                        else:
                            logger.warning(f"Failed to kill process {process_name} with PID {pid}")
                
                # Force the agent status to stopped
                success = asl.force_agent_status(
                    agent_name=agent_name,
                    status="stopped",
                    health=0,
                    last_activity=f"Automatically stopped (reason: {reason})"
                )
                
                # Also save the status locally as a backup
                asu.save_status_locally(agent_name, {
                    "agent_name": agent_name,
                    "status": "stopped",
                    "health": 0,
                    "last_activity": f"Automatically stopped (reason: {reason})",
                    "updated_at": datetime.now().isoformat()
                })
                
                if success:
                    logger.info(f"Successfully forced {agent_name} status to stopped")
                    
                    # Verify the update
                    time.sleep(1)  # Wait a moment for the database to update
                    current_status = asl.get_agent_status(agent_name)
                    if current_status:
                        logger.info(f"Verified {agent_name} status: {current_status['status']} with health {current_status['health']}")
                        if current_status['status'] != 'stopped':
                            logger.warning(f"WARNING: Status not updated correctly! Still showing as {current_status['status']}")
                else:
                    logger.error(f"Failed to force {agent_name} status to stopped")
    except Exception as e:
        logger.error(f"Error in check_agent_statuses: {str(e)}")
        # Fall back to local status files
        check_agent_statuses_local()

def check_agent_statuses_local():
    """
    Check the status of all agents using local status files when the database is unreachable.
    """
    logger.info("Checking agent statuses using local status files...")
    
    # Check each agent process
    for agent_name, process_name in AGENT_PROCESS_NAMES.items():
        try:
            # Check if the process is running
            is_running = is_process_running(process_name)
            logger.info(f"Agent {agent_name} process is running: {is_running}")
            
            # Get the local status file
            local_status = asu.get_local_status(agent_name)
            
            if local_status:
                status = local_status.get('status')
                logger.info(f"Local status for {agent_name}: {status}")
                
                # If the agent is marked as running but the process is not running,
                # update the local status file
                if status == 'running' and not is_running:
                    logger.info(f"Agent {agent_name} is marked as running locally but process is not running, updating local status")
                    
                    # Update the local status file
                    asu.save_status_locally(agent_name, {
                        "agent_name": agent_name,
                        "status": "stopped",
                        "health": 0,
                        "last_activity": "Automatically stopped (process not running)",
                        "updated_at": datetime.now().isoformat()
                    })
                
                # If the process is running but the agent is marked as stopped,
                # kill the process
                elif status == 'stopped' and is_running:
                    pid = get_process_pid(process_name)
                    if pid:
                        logger.info(f"Agent {agent_name} is marked as stopped locally but process is running, killing process")
                        kill_success = kill_process(pid)
                        if kill_success:
                            logger.info(f"Successfully killed process {process_name} with PID {pid}")
                        else:
                            logger.warning(f"Failed to kill process {process_name} with PID {pid}")
            else:
                # No local status file, create one based on process state
                status = "running" if is_running else "stopped"
                health = 100 if is_running else 0
                last_activity = "Process detected" if is_running else "Process not detected"
                
                logger.info(f"No local status for {agent_name}, creating one with status {status}")
                
                asu.save_status_locally(agent_name, {
                    "agent_name": agent_name,
                    "status": status,
                    "health": health,
                    "last_activity": last_activity,
                    "updated_at": datetime.now().isoformat()
                })
        except Exception as e:
            logger.error(f"Error checking local status for {agent_name}: {str(e)}")

def main():
    """
    Main function to run the agent status monitor.
    """
    logger.info("Agent Status Monitor started")
    
    try:
        while True:
            try:
                check_agent_statuses()
            except Exception as e:
                logger.error(f"Error checking agent statuses: {str(e)}")
            
            # Sleep for the check interval
            time.sleep(CHECK_INTERVAL)
    except KeyboardInterrupt:
        logger.info("Agent Status Monitor stopped by user")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise

if __name__ == "__main__":
    main()
