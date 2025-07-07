-- Update existing tweets with NULL user_id
-- This script helps associate existing tweets with users based on the accounts they monitor

-- First, let's see how many tweets have NULL user_id
SELECT 
    COUNT(*) as total_tweets,
    COUNT(user_id) as tweets_with_user_id,
    COUNT(*) - COUNT(user_id) as tweets_with_null_user_id
FROM tweets_cache;

-- Show sample tweets with NULL user_id
SELECT author, COUNT(*) as tweet_count
FROM tweets_cache 
WHERE user_id IS NULL 
GROUP BY author 
ORDER BY tweet_count DESC;

-- Option 1: If you want to assign all existing tweets to a specific user
-- (Replace 'your-user-id-here' with the actual user ID)
/*
UPDATE tweets_cache 
SET user_id = '99d3ff50-dcb5-4389-8e76-2ecd626902bc'
WHERE user_id IS NULL;
*/

-- Option 2: More sophisticated approach - assign tweets to users based on their monitored accounts
-- This will only work if the tweet authors match accounts in x_accounts table
/*
UPDATE tweets_cache 
SET user_id = x_accounts.user_id
FROM x_accounts 
WHERE tweets_cache.author = x_accounts.username 
    AND tweets_cache.user_id IS NULL;
*/

-- Option 3: Delete tweets with NULL user_id (if you prefer to start fresh)
/*
DELETE FROM tweets_cache WHERE user_id IS NULL;
*/

-- After running one of the above options, verify the results:
SELECT 
    COUNT(*) as total_tweets,
    COUNT(user_id) as tweets_with_user_id,
    COUNT(*) - COUNT(user_id) as tweets_with_null_user_id
FROM tweets_cache;

-- Show tweets by user
SELECT 
    user_id,
    COUNT(*) as tweet_count,
    MIN(inserted_at) as first_tweet,
    MAX(inserted_at) as latest_tweet
FROM tweets_cache 
WHERE user_id IS NOT NULL
GROUP BY user_id
ORDER BY tweet_count DESC;
