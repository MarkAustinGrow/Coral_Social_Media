-- Fix X Accounts table for multiuser support
-- This script ensures the x_accounts table supports multiple users

-- Add user_id column if it doesn't exist (will fail if it already exists, which is fine)
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE x_accounts ADD COLUMN user_id UUID REFERENCES auth.users(id);
    EXCEPTION
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column user_id already exists in x_accounts table';
    END;
END $$;

-- Remove the old unique constraint on username (if it exists)
DO $$
BEGIN
    BEGIN
        ALTER TABLE x_accounts DROP CONSTRAINT x_accounts_username_key;
    EXCEPTION
        WHEN undefined_object THEN 
            RAISE NOTICE 'Constraint x_accounts_username_key does not exist';
    END;
END $$;

-- Add unique constraint for user-specific usernames
DO $$
BEGIN
    BEGIN
        ALTER TABLE x_accounts ADD CONSTRAINT x_accounts_user_username_unique 
        UNIQUE (user_id, username);
    EXCEPTION
        WHEN duplicate_table THEN 
            RAISE NOTICE 'Constraint x_accounts_user_username_unique already exists';
    END;
END $$;

-- Create index for user_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_x_accounts_user_id ON x_accounts(user_id);

-- Enable Row Level Security
ALTER TABLE x_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for users to only see their own accounts
DROP POLICY IF EXISTS "Users can only see their own x_accounts" ON x_accounts;
CREATE POLICY "Users can only see their own x_accounts" ON x_accounts
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policy for users to only insert their own accounts
DROP POLICY IF EXISTS "Users can only insert their own x_accounts" ON x_accounts;
CREATE POLICY "Users can only insert their own x_accounts" ON x_accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policy for users to only update their own accounts
DROP POLICY IF EXISTS "Users can only update their own x_accounts" ON x_accounts;
CREATE POLICY "Users can only update their own x_accounts" ON x_accounts
    FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policy for users to only delete their own accounts
DROP POLICY IF EXISTS "Users can only delete their own x_accounts" ON x_accounts;
CREATE POLICY "Users can only delete their own x_accounts" ON x_accounts
    FOR DELETE USING (auth.uid() = user_id);

-- Show current table structure
\d x_accounts;
