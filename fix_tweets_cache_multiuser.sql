-- Fix tweets_cache table for multiuser support
-- This script adds user_id column and RLS policies to tweets_cache table

-- Add user_id column if it doesn't exist
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE tweets_cache ADD COLUMN user_id UUID REFERENCES auth.users(id);
    EXCEPTION
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column user_id already exists in tweets_cache table';
    END;
END $$;

-- Create index for user_id
CREATE INDEX IF NOT EXISTS idx_tweets_cache_user_id ON tweets_cache(user_id);

-- Create composite index for user_id and analyzed status
CREATE INDEX IF NOT EXISTS idx_tweets_cache_user_analyzed ON tweets_cache(user_id, analyzed);

-- Enable Row Level Security
ALTER TABLE tweets_cache ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for users to only see their own tweets
DROP POLICY IF EXISTS "Users can only see their own tweets" ON tweets_cache;
CREATE POLICY "Users can only see their own tweets" ON tweets_cache
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policy for users to only insert their own tweets
DROP POLICY IF EXISTS "Users can only insert their own tweets" ON tweets_cache;
CREATE POLICY "Users can only insert their own tweets" ON tweets_cache
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policy for users to only update their own tweets
DROP POLICY IF EXISTS "Users can only update their own tweets" ON tweets_cache;
CREATE POLICY "Users can only update their own tweets" ON tweets_cache
    FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policy for users to only delete their own tweets
DROP POLICY IF EXISTS "Users can only delete their own tweets" ON tweets_cache;
CREATE POLICY "Users can only delete their own tweets" ON tweets_cache
    FOR DELETE USING (auth.uid() = user_id);

-- Show current table structure
\d tweets_cache;
