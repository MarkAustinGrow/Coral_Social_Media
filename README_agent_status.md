# Agent Status System

This system provides real-time monitoring and control of the various agents in the Core Social Infrastructure. It consists of:

1. A Supabase database table (`agent_status`) to store agent status information
2. A Python module (`agent_status_updater.py`) for agents to update their status
3. API endpoints for starting and stopping agents
4. A web interface for monitoring and controlling agents

## Setup

### 1. Create the Agent Status Table

First, create the `agent_status` table in your Supabase database:

```sql
CREATE TABLE agent_status (
  id SERIAL PRIMARY KEY,
  agent_name TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL, -- 'running', 'warning', 'error', 'stopped'
  health INTEGER NOT NULL, -- 0-100
  last_heartbeat TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  last_activity TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial records for each agent
INSERT INTO agent_status (agent_name, status, health, last_heartbeat) VALUES
  ('Content Collector', 'stopped', 0, NULL),
  ('Blog Generator', 'stopped', 0, NULL),
  ('Tweet Scheduler', 'stopped', 0, NULL),
  ('Engagement Analyzer', 'stopped', 0, NULL),
  ('Account Manager', 'stopped', 0, NULL);
```

### 2. Configure Environment Variables

Ensure your `.env` file contains the Supabase credentials:

```
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_KEY="your-supabase-key"
```

## Using the Agent Status Updater

The `agent_status_updater.py` module provides functions for agents to update their status in the database.

### Basic Usage

```python
import agent_status_updater as asu

# Mark agent as started
asu.mark_agent_started("Content Collector")

# Send a heartbeat
asu.send_heartbeat("Content Collector")

# Report a warning
asu.report_warning("Content Collector", "Rate limit approaching", health=75)

# Report an error
asu.report_error("Content Collector", "Failed to fetch tweets", health=30)

# Mark agent as stopped
asu.mark_agent_stopped("Content Collector")
```

### Integrating with Agents

To integrate the status updater with your agents:

1. Import the module at the top of your agent script
2. Mark the agent as started at the beginning
3. Send heartbeats periodically
4. Report warnings and errors as they occur
5. Mark the agent as stopped when it exits

See `example_agent_with_status.py` for a complete example.

## Web Interface

The web interface provides a dashboard for monitoring and controlling agents:

- View the status of all agents
- Start and stop individual agents
- Start all agents at once
- See detailed information about each agent

### API Endpoints

The following API endpoints are available:

- `POST /api/agents/start` - Start an agent
- `POST /api/agents/stop` - Stop an agent
- `POST /api/agents/start-all` - Start all agents

## Running the Example Agent

To run the example agent:

```bash
python example_agent_with_status.py
```

This will start a simulated agent that:

- Updates its status in the database
- Randomly generates warnings and errors
- Sends heartbeats
- Gracefully handles shutdown signals

## Integrating with Existing Agents

To integrate the status system with existing agents:

1. Add the following code at the beginning of your agent script:

```python
import agent_status_updater as asu
import atexit

# Agent name should match the name in the agent_status table
AGENT_NAME = "Your Agent Name"

# Mark agent as started
asu.mark_agent_started(AGENT_NAME)

# Register function to mark agent as stopped when the script exits
atexit.register(lambda: asu.mark_agent_stopped(AGENT_NAME))
```

2. Add heartbeats in your main loop:

```python
# Send heartbeat every minute
asu.send_heartbeat(AGENT_NAME)
```

3. Add error reporting:

```python
try:
    # Your code here
except Exception as e:
    # Report any uncaught exceptions
    asu.report_error(AGENT_NAME, str(e))
    raise
finally:
    # Mark agent as stopped
    asu.mark_agent_stopped(AGENT_NAME)
```

## Troubleshooting

If you encounter issues:

1. Check that your Supabase credentials are correct in the `.env` file
2. Verify that the `agent_status` table exists in your Supabase database
3. Check that the agent names match between the database and your code
4. Look for error messages in the agent logs
