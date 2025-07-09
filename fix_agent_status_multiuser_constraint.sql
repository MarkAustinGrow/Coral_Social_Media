-- Fix agent_status table for multiuser support
-- Remove global unique constraint and add user-specific constraint

-- Step 1: Remove the existing unique constraint on agent_name
ALTER TABLE agent_status DROP CONSTRAINT IF EXISTS agent_status_agent_name_key;

-- Step 2: Ensure user_id column exists (it should already exist)
-- This is just a safety check
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'agent_status' AND column_name = 'user_id') THEN
        ALTER TABLE agent_status ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Step 3: Add composite unique constraint for user_id + agent_name
-- This allows each user to have their own set of agents with the same names
ALTER TABLE agent_status ADD CONSTRAINT agent_status_user_agent_unique 
UNIQUE (user_id, agent_name);

-- Step 4: Update any existing agents without user_id to have a placeholder
-- (Optional - only if there are orphaned agents)
-- UPDATE agent_status SET user_id = '00000000-0000-0000-0000-000000000000' 
-- WHERE user_id IS NULL;

-- Step 5: Verify the changes
SELECT 
    constraint_name, 
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'agent_status' 
AND constraint_type = 'UNIQUE';
