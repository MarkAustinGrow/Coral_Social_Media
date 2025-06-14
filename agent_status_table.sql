-- Create agent_status table for monitoring and controlling agents
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

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_agent_status_name ON agent_status(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_status_status ON agent_status(status);

-- Insert initial records for each agent
INSERT INTO agent_status (agent_name, status, health, updated_at) VALUES
  ('Content Collector', 'stopped', 0, NOW()),
  ('Blog Generator', 'stopped', 0, NOW()),
  ('Tweet Scheduler', 'stopped', 0, NOW()),
  ('Engagement Analyzer', 'stopped', 0, NOW()),
  ('Account Manager', 'stopped', 0, NOW());

-- Create a function to update the updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_agent_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the function before each update
CREATE TRIGGER update_agent_status_updated_at
BEFORE UPDATE ON agent_status
FOR EACH ROW
EXECUTE FUNCTION update_agent_status_updated_at();
