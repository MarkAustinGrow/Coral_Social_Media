# Agent Status Monitoring System

This document describes the agent status monitoring system implemented for the Core Social Infrastructure project. The system allows real-time monitoring of agent status, health, and activity through the web interface.

## Overview

The agent status monitoring system consists of several components:

1. **Agent Status Table**: A database table that stores the status of each agent
2. **Agent Status Updater**: A Python module that agents use to update their status
3. **Process Manager**: A module that handles starting and stopping agent processes
4. **Web Interface**: A dashboard that displays agent status and allows controlling agents

## Agent Status Table

The `agent_status` table in the Supabase database has the following structure:

```sql
CREATE TABLE agent_status (
  id SERIAL PRIMARY KEY,
  agent_name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'stopped',
  health INTEGER NOT NULL DEFAULT 0,
  last_heartbeat TIMESTAMPTZ,
  last_error TEXT,
  last_activity TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

The table stores the following information for each agent:

- `agent_name`: The name of the agent (e.g., "Tweet Scraping Agent")
- `status`: The current status of the agent (running, warning, error, stopped)
- `health`: A numeric value (0-100) indicating the health of the agent
- `last_heartbeat`: The timestamp of the last heartbeat received from the agent
- `last_error`: The last error message reported by the agent
- `last_activity`: A description of the last activity performed by the agent
- `updated_at`: The timestamp when the agent status was last updated

## Agent Status Updater

The `agent_status_updater.py` module provides functions for agents to update their status in the database:

- `mark_agent_started(agent_name)`: Mark an agent as started
- `mark_agent_stopped(agent_name)`: Mark an agent as stopped
- `update_agent_status(agent_name, status, health, last_activity)`: Update an agent's status
- `send_heartbeat(agent_name)`: Send a heartbeat to indicate the agent is still running
- `report_error(agent_name, error_message)`: Report an error
- `report_warning(agent_name, warning_message, health)`: Report a warning

## Process Manager

The `process-manager.ts` module in the web interface handles starting and stopping agent processes:

- `startAgent(agentName)`: Start an agent process
- `stopAgent(agentName)`: Stop an agent process
- `startAllAgents()`: Start all agent processes

## Web Interface

The web interface displays agent status in the System Status Panel, which shows:

- Agent name
- Current status (running, warning, error, stopped)
- Health indicator
- Last activity
- Start/Stop buttons

## Integration with Agents

To integrate the status monitoring system with an agent, you need to:

1. Import the agent status updater module:
   ```python
   import agent_status_updater as asu
   import atexit
   import signal
   import sys
   ```

2. Define the agent name constant:
   ```python
   # Agent name for status updates - must match exactly what's in the database
   AGENT_NAME = "Tweet Scraping Agent"
   ```

3. Add signal handlers for graceful shutdown:
   ```python
   # Register signal handlers for graceful shutdown
   def signal_handler(sig, frame):
       """Handle Ctrl+C and other signals to gracefully shut down"""
       print("Shutting down gracefully...")
       asu.mark_agent_stopped(AGENT_NAME)
       sys.exit(0)

   # Register signal handlers
   signal.signal(signal.SIGINT, signal_handler)  # Ctrl+C
   signal.signal(signal.SIGTERM, signal_handler)  # Termination signal

   # Register function to mark agent as stopped when the script exits
   atexit.register(lambda: asu.mark_agent_stopped(AGENT_NAME))
   ```

4. Mark the agent as started at the beginning of execution:
   ```python
   # Mark agent as started
   asu.mark_agent_started(AGENT_NAME)
   ```

5. Add heartbeats in the main loop:
   ```python
   # Send heartbeat periodically
   asu.send_heartbeat(AGENT_NAME)
   ```

6. Add status updates at key points:
   ```python
   # Update status
   asu.update_agent_status(
       agent_name=AGENT_NAME,
       status="running",
       health=95,
       last_activity="Fetching tweets"
   )
   ```

7. Add error reporting:
   ```python
   try:
       # Your code here
   except Exception as e:
       # Report any uncaught exceptions
       asu.report_error(AGENT_NAME, str(e))
       raise
   ```

8. Mark the agent as stopped when exiting:
   ```python
   # Mark agent as stopped
   asu.mark_agent_stopped(AGENT_NAME)
   ```

## Automatic Integration

You can use the `add_status_to_agents.py` script to automatically add status update code to all agent files:

```bash
python add_status_to_agents.py
```

This script will:
1. Create a backup of each agent file
2. Add the necessary imports and code for status updates
3. Add signal handlers for graceful shutdown
4. Add status update calls at key points

After running the script, you may need to manually add heartbeat calls to the main loop of each agent.

## Testing

You can use the `test_agent_status.py` script to test the agent status system:

```bash
python test_agent_status.py --agent tweet_scraping --duration 60
```

This will run the specified agent for the given duration (in seconds) and monitor its status.

## Troubleshooting

If an agent's status is not updating correctly, check:

1. The agent name in the code matches exactly what's in the database
2. The agent has the necessary imports and code for status updates
3. The agent is sending heartbeats in its main loop
4. The Supabase connection is working correctly

### Managing Agent Status Visibility

Sometimes there can be a discrepancy between an agent's actual running state and what is shown in the database. This can happen in several scenarios:

1. **Hidden Running Processes**: An agent might be running in a background window that isn't immediately visible
2. **Abrupt Termination**: If an agent process was terminated abruptly without properly updating its status
3. **Web Interface Restart**: When the web interface restarts, it may not correctly detect running agent processes

You can use the following methods to manage agent status visibility:

1. **Using the Web Interface**:
   - Click the "Force Stop" option from the dropdown menu (triangle icon) next to the agent
   - This will update the agent's status in the database without trying to stop the process

2. **Using the fix_agent_status.py Script**:
   - Run the script to manually update the status of an agent in the database:
   ```bash
   python fix_agent_status.py
   ```
   - By default, this will set the Tweet Scraping Agent to "stopped" with a health of 0
   - You can modify the script to update other agents as needed

3. **Using the agent_status_lock.py Utility**:
   - This utility provides more control over agent statuses:
   ```bash
   python agent_status_lock.py
   ```
   - Without arguments, it will display all agent statuses
   - To force a specific agent's status:
   ```bash
   python agent_status_lock.py "Tweet Scraping Agent" stopped 0
   ```
   - The arguments are: agent_name, status (running/warning/error/stopped), health (0-100)

4. **Using the Automatic Agent Status Monitor**:
   - For a more permanent solution, you can run the agent status monitor:
   ```bash
   python agent_status_monitor.py
   ```
   - This script runs continuously and ensures the database status accurately reflects the actual running state of agents
   - It checks if agent processes are actually running and updates their status accordingly
   - It also monitors for agents that have been inactive for too long
   - You can run this as a background service for continuous monitoring

5. **Checking for Running Processes**:
   - Before starting any agents, check if they're already running in the background:
   ```bash
   # On Windows
   tasklist | findstr python
   
   # On Linux/Mac
   ps aux | grep python
   ```

### Agent Status Monitor Configuration

The agent status monitor can be configured by editing the following variables in `agent_status_monitor.py`:

- `CHECK_INTERVAL`: How often to check agent statuses (default: 60 seconds)
- `MAX_RUNNING_TIME_WITHOUT_ACTIVITY`: Maximum time an agent can be running without activity before being marked as stopped (default: 15 minutes)
- `AGENT_PROCESS_NAMES`: Mapping of agent names to their process names

To run the agent status monitor as a service:

1. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the monitor in the background:
   ```bash
   # On Linux/Mac:
   nohup python agent_status_monitor.py > agent_monitor.log 2>&1 &
   
   # On Windows (PowerShell):
   Start-Process -NoNewWindow python -ArgumentList "agent_status_monitor.py"
   ```
