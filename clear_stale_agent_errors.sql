-- Clear Stale Agent Errors Script
-- This script clears all persistent error messages from the agent_status table
-- Run this to clean up existing stale errors that never got cleared

-- First, let's see what errors we have
SELECT 
    agent_name,
    status,
    last_error,
    last_activity,
    updated_at,
    user_id
FROM agent_status 
WHERE last_error IS NOT NULL
ORDER BY updated_at DESC;

-- Clear all errors for stopped agents (stopped agents shouldn't have active errors)
UPDATE agent_status 
SET 
    last_error = NULL,
    last_activity = 'Stale errors cleared - agent was stopped',
    updated_at = NOW()
WHERE status = 'stopped' 
  AND last_error IS NOT NULL;

-- Clear old errors (older than 24 hours) for running agents
-- This handles cases where agents recovered but didn't clear their errors
UPDATE agent_status 
SET 
    last_error = NULL,
    last_activity = 'Stale errors cleared - older than 24 hours',
    updated_at = NOW()
WHERE status = 'running' 
  AND last_error IS NOT NULL
  AND updated_at < NOW() - INTERVAL '24 hours';

-- Show the results after cleanup
SELECT 
    COUNT(*) as total_agents,
    COUNT(CASE WHEN last_error IS NOT NULL THEN 1 END) as agents_with_errors,
    COUNT(CASE WHEN status = 'stopped' THEN 1 END) as stopped_agents,
    COUNT(CASE WHEN status = 'running' THEN 1 END) as running_agents
FROM agent_status;

-- Show remaining errors (if any)
SELECT 
    agent_name,
    status,
    last_error,
    last_activity,
    updated_at,
    user_id
FROM agent_status 
WHERE last_error IS NOT NULL
ORDER BY updated_at DESC;
