-- Fix Persona System: Add unique constraint to prevent duplicate personas per user
-- This ensures each user can only have one persona record

-- Add unique constraint on user_id to prevent duplicates
ALTER TABLE personas ADD CONSTRAINT unique_user_persona UNIQUE (user_id);

-- Optional: Add comment to document the constraint
COMMENT ON CONSTRAINT unique_user_persona ON personas IS 'Ensures each user can only have one persona record';
