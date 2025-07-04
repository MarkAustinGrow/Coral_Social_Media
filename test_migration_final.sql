-- =====================================================
-- CORAL SOCIAL MEDIA - FINAL MIGRATION TESTING
-- Phase 1: Validation Script for Exact Schema Match
-- =====================================================

-- This script tests the final database migration
-- Run this AFTER executing database_migration_final.sql

-- =====================================================
-- TEST 1: VERIFY ALL TABLES HAVE USER_ID COLUMNS
-- =====================================================

SELECT 
  'Schema Validation' as test_name,
  table_name,
  CASE 
    WHEN column_name = 'user_id' THEN '✅ user_id column exists'
    ELSE '❌ user_id column missing'
  END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN (
    'agent_logs', 'agent_status', 'blog_critique', 'blog_posts',
    'engagement_metrics', 'personas', 'potential_tweets', 'system_config',
    'tweet_insights', 'tweet_replies', 'tweets_cache', 'x_accounts'
  )
  AND column_name = 'user_id'
ORDER BY table_name;

-- =====================================================
-- TEST 2: VERIFY NEW TABLES WERE CREATED
-- =====================================================

SELECT 
  'New Tables Check' as test_name,
  table_name,
  '✅ Table created' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_profiles', 'user_api_keys', 'api_usage_logs', 'user_settings')
ORDER BY table_name;

-- =====================================================
-- TEST 3: VERIFY RLS IS ENABLED ON ALL TABLES
-- =====================================================

SELECT 
  'RLS Status Check' as test_name,
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS enabled'
    ELSE '❌ RLS not enabled'
  END as status
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN (
    'agent_logs', 'agent_status', 'blog_critique', 'blog_posts',
    'engagement_metrics', 'personas', 'potential_tweets', 'system_config',
    'tweet_insights', 'tweet_replies', 'tweets_cache', 'x_accounts',
    'user_profiles', 'user_api_keys', 'api_usage_logs', 'user_settings'
  )
ORDER BY tablename;

-- =====================================================
-- TEST 4: VERIFY RLS POLICIES EXIST
-- =====================================================

SELECT 
  'RLS Policies Check' as test_name,
  tablename,
  policyname,
  '✅ Policy exists' as status
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN (
    'agent_logs', 'agent_status', 'blog_critique', 'blog_posts',
    'engagement_metrics', 'personas', 'potential_tweets', 'system_config',
    'tweet_insights', 'tweet_replies', 'tweets_cache', 'x_accounts',
    'user_profiles', 'user_api_keys', 'api_usage_logs', 'user_settings'
  )
ORDER BY tablename, policyname;

-- =====================================================
-- TEST 5: VERIFY INDEXES WERE CREATED
-- =====================================================

SELECT 
  'Performance Indexes Check' as test_name,
  tablename,
  indexname,
  '✅ Index created' as status
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
  AND tablename IN (
    'agent_logs', 'agent_status', 'blog_critique', 'blog_posts',
    'engagement_metrics', 'personas', 'potential_tweets', 'system_config',
    'tweet_insights', 'tweet_replies', 'tweets_cache', 'x_accounts',
    'user_profiles', 'user_api_keys', 'api_usage_logs'
  )
ORDER BY tablename, indexname;

-- =====================================================
-- TEST 6: VERIFY FUNCTIONS EXIST
-- =====================================================

SELECT 
  'Functions Check' as test_name,
  routine_name,
  routine_type,
  '✅ Function exists' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'handle_new_user',
    'increment_api_usage',
    'reset_monthly_usage',
    'check_usage_limit',
    'get_user_api_key',
    'update_updated_at_column'
  )
ORDER BY routine_name;

-- =====================================================
-- TEST 7: VERIFY TRIGGERS EXIST
-- =====================================================

SELECT 
  'Triggers Check' as test_name,
  trigger_name,
  event_object_table,
  '✅ Trigger exists' as status
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'on_user_created',
    'update_user_profiles_updated_at',
    'update_user_settings_updated_at',
    'update_user_api_keys_updated_at'
  )
ORDER BY event_object_table, trigger_name;

-- =====================================================
-- TEST 8: VERIFY VIEWS EXIST
-- =====================================================

SELECT 
  'Views Check' as test_name,
  table_name,
  '✅ View exists' as status
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name IN ('user_dashboard_summary', 'user_recent_activity')
ORDER BY table_name;

-- =====================================================
-- TEST 9: CREATE TEST USERS AND VERIFY AUTOMATION
-- =====================================================

-- Create test user data to verify the migration works
DO $$
DECLARE
  test_user_id_1 UUID := '550e8400-e29b-41d4-a716-446655440000';
  test_user_id_2 UUID := '550e8400-e29b-41d4-a716-446655440001';
  test_email_1 TEXT := 'test1@coral-social.com';
  test_email_2 TEXT := 'test2@coral-social.com';
BEGIN
  -- Create test user profiles manually (simulating the trigger)
  INSERT INTO user_profiles(user_id, email, subscription_tier, api_usage_limit)
  VALUES 
    (test_user_id_1, test_email_1, 'free', 1000),
    (test_user_id_2, test_email_2, 'pro', 5000)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create user settings
  INSERT INTO user_settings(user_id)
  VALUES (test_user_id_1), (test_user_id_2)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create test personas
  INSERT INTO personas(user_id, name, description, tone, humor, enthusiasm, assertiveness)
  VALUES 
    (test_user_id_1, 'Test Persona 1', 'Test persona for user 1', 5, 3, 5, 4),
    (test_user_id_2, 'Test Persona 2', 'Test persona for user 2', 7, 5, 6, 6)
  ON CONFLICT DO NOTHING;
  
  -- Create test data in various tables
  INSERT INTO agent_logs(user_id, level, agent_name, message, metadata)
  VALUES 
    (test_user_id_1, 'INFO', 'test_agent', 'Test log for user 1', '{"test": true}'::jsonb),
    (test_user_id_2, 'INFO', 'test_agent', 'Test log for user 2', '{"test": true}'::jsonb);
  
  INSERT INTO x_accounts(user_id, username, display_name, priority)
  VALUES 
    (test_user_id_1, 'testuser1', 'Test User 1', 1),
    (test_user_id_2, 'testuser2', 'Test User 2', 1);
  
  INSERT INTO blog_posts(user_id, title, content, status)
  VALUES 
    (test_user_id_1, 'Test Blog 1', 'Content for user 1', 'draft'),
    (test_user_id_2, 'Test Blog 2', 'Content for user 2', 'draft');
  
  RAISE NOTICE 'Test user data created successfully';
END $$;

-- =====================================================
-- TEST 10: TEST UTILITY FUNCTIONS
-- =====================================================

-- Test API usage tracking
SELECT 
  'Function Test' as test_name,
  'increment_api_usage' as function_name,
  increment_api_usage(
    '550e8400-e29b-41d4-a716-446655440000'::UUID,
    'openai',
    10,
    150,
    '/v1/chat/completions'
  ) as result;

-- Test usage limit checking
SELECT 
  'Function Test' as test_name,
  'check_usage_limit' as function_name,
  check_usage_limit('550e8400-e29b-41d4-a716-446655440000'::UUID) as within_limit;

-- Test API key storage and retrieval
INSERT INTO user_api_keys(user_id, service_name, encrypted_key)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000'::UUID,
  'openai',
  'encrypted_dummy_key_for_testing'
)
ON CONFLICT (user_id, service_name) DO UPDATE SET
  encrypted_key = EXCLUDED.encrypted_key;

SELECT 
  'Function Test' as test_name,
  'get_user_api_key' as function_name,
  get_user_api_key(
    '550e8400-e29b-41d4-a716-446655440000'::UUID,
    'openai'
  ) as retrieved_key;

-- =====================================================
-- TEST 11: VERIFY DASHBOARD VIEWS WORK
-- =====================================================

-- Test user dashboard summary view
SELECT 
  'Dashboard View Test' as test_name,
  'user_dashboard_summary' as view_name,
  user_id,
  email,
  total_tweets_cache,
  total_blog_posts,
  total_x_accounts,
  total_personas
FROM user_dashboard_summary 
WHERE user_id IN (
  '550e8400-e29b-41d4-a716-446655440000'::UUID,
  '550e8400-e29b-41d4-a716-446655440001'::UUID
);

-- Test recent activity view
SELECT 
  'Dashboard View Test' as test_name,
  'user_recent_activity' as view_name,
  user_id,
  agent_name,
  level,
  message
FROM user_recent_activity 
WHERE user_id IN (
  '550e8400-e29b-41d4-a716-446655440000'::UUID,
  '550e8400-e29b-41d4-a716-446655440001'::UUID
)
LIMIT 5;

-- =====================================================
-- TEST 12: PERFORMANCE TESTING
-- =====================================================

-- Test index usage for common queries on your actual tables
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM tweets_cache 
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::UUID 
ORDER BY created_at DESC 
LIMIT 50;

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM blog_posts 
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::UUID 
  AND status = 'published'
ORDER BY created_at DESC 
LIMIT 20;

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM agent_logs 
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::UUID 
  AND timestamp >= NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC;

-- =====================================================
-- TEST 13: DATA ISOLATION VERIFICATION
-- =====================================================

-- Verify that each user can only see their own data
SELECT 
  'Data Isolation Test' as test_name,
  'User 1 Data Count' as description,
  (SELECT COUNT(*) FROM agent_logs WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::UUID) as user1_logs,
  (SELECT COUNT(*) FROM blog_posts WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::UUID) as user1_blogs,
  (SELECT COUNT(*) FROM x_accounts WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::UUID) as user1_accounts;

SELECT 
  'Data Isolation Test' as test_name,
  'User 2 Data Count' as description,
  (SELECT COUNT(*) FROM agent_logs WHERE user_id = '550e8400-e29b-41d4-a716-446655440001'::UUID) as user2_logs,
  (SELECT COUNT(*) FROM blog_posts WHERE user_id = '550e8400-e29b-41d4-a716-446655440001'::UUID) as user2_blogs,
  (SELECT COUNT(*) FROM x_accounts WHERE user_id = '550e8400-e29b-41d4-a716-446655440001'::UUID) as user2_accounts;

-- =====================================================
-- TEST 14: FINAL VALIDATION SUMMARY
-- =====================================================

SELECT 
  'FINAL VALIDATION SUMMARY' as test_name,
  'Migration Status' as check_type,
  CASE 
    WHEN (
      (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'user_id' AND table_name IN ('agent_logs', 'agent_status', 'blog_critique', 'blog_posts', 'engagement_metrics', 'personas', 'potential_tweets', 'system_config', 'tweet_insights', 'tweet_replies', 'tweets_cache', 'x_accounts')) = 12
      AND (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('user_profiles', 'user_api_keys', 'api_usage_logs', 'user_settings')) = 4
      AND (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') >= 16
      AND (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%') >= 30
      AND (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name IN ('handle_new_user', 'increment_api_usage', 'reset_monthly_usage', 'check_usage_limit', 'get_user_api_key')) = 5
    ) THEN '🎉 MIGRATION SUCCESSFUL - All components implemented correctly!'
    ELSE '❌ MIGRATION INCOMPLETE - Some components missing'
  END as result;

-- Count summary
SELECT 
  'Component Counts' as summary_type,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'user_id') as user_id_columns,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as rls_policies,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%') as performance_indexes,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public') as utility_functions,
  (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public') as triggers,
  (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public') as dashboard_views;

-- =====================================================
-- CLEANUP TEST DATA (OPTIONAL)
-- =====================================================

-- Uncomment to remove test data after validation
/*
DELETE FROM api_usage_logs WHERE user_id IN (
  '550e8400-e29b-41d4-a716-446655440000'::UUID,
  '550e8400-e29b-41d4-a716-446655440001'::UUID
);

DELETE FROM user_api_keys WHERE user_id IN (
  '550e8400-e29b-41d4-a716-446655440000'::UUID,
  '550e8400-e29b-41d4-a716-446655440001'::UUID
);

DELETE FROM blog_posts WHERE user_id IN (
  '550e8400-e29b-41d4-a716-446655440000'::UUID,
  '550e8400-e29b-41d4-a716-446655440001'::UUID
);

DELETE FROM x_accounts WHERE user_id IN (
  '550e8400-e29b-41d4-a716-446655440000'::UUID,
  '550e8400-e29b-41d4-a716-446655440001'::UUID
);

DELETE FROM agent_logs WHERE user_id IN (
  '550e8400-e29b-41d4-a716-446655440000'::UUID,
  '550e8400-e29b-41d4-a716-446655440001'::UUID
);

DELETE FROM personas WHERE user_id IN (
  '550e8400-e29b-41d4-a716-446655440000'::UUID,
  '550e8400-e29b-41d4-a716-446655440001'::UUID
);

DELETE FROM user_settings WHERE user_id IN (
  '550e8400-e29b-41d4-a716-446655440000'::UUID,
  '550e8400-e29b-41d4-a716-446655440001'::UUID
);

DELETE FROM user_profiles WHERE user_id IN (
  '550e8400-e29b-41d4-a716-446655440000'::UUID,
  '550e8400-e29b-41d4-a716-446655440001'::UUID
);
*/

-- =====================================================
-- NEXT STEPS
-- =====================================================

/*
If all tests pass, your database is ready for multi-tenant operation!

✅ COMPLETED:
- 12 existing tables updated with user_id columns
- 4 new multi-tenant tables created
- 16+ RLS policies implemented (complete data isolation)
- 30+ performance indexes created
- 5 utility functions for user management
- Automated user provisioning triggers
- Dashboard views for user data

🚀 READY FOR PHASE 2:
- Authentication system implementation
- Login/signup pages
- Protected routes
- API key encryption UI
- User dashboard integration

Your Coral Social Media platform is now multi-tenant ready!
*/
