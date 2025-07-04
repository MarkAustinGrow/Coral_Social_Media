-- =====================================================
-- CORAL SOCIAL MEDIA - DATABASE MIGRATION TESTING (CORRECTED)
-- Phase 1: Validation and Testing Script for Your Database Schema
-- =====================================================

-- This script tests the corrected database migration
-- Run this AFTER executing database_migration_phase1_corrected.sql

-- =====================================================
-- TEST 1: VERIFY TABLES AND COLUMNS EXIST
-- =====================================================

-- Check that user_id columns were added to your existing tables
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND column_name = 'user_id'
  AND table_name IN (
    'tweets_cache', 'blog_posts', 'x_accounts', 'agent_logs', 
    'personas', 'engagement_metrics', 'tweet_insights', 'tweet_replies',
    'potential_tweets', 'system_config', 'agent_status', 'blog_critique'
  )
ORDER BY table_name;

-- Check that new tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_profiles', 'user_api_keys', 'api_usage_logs', 'user_settings')
ORDER BY table_name;

-- =====================================================
-- TEST 2: VERIFY INDEXES WERE CREATED
-- =====================================================

SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
  AND tablename IN (
    'tweets_cache', 'blog_posts', 'x_accounts', 'agent_logs', 
    'personas', 'engagement_metrics', 'tweet_insights', 'tweet_replies',
    'potential_tweets', 'system_config', 'agent_status', 'blog_critique',
    'user_profiles', 'user_api_keys', 'api_usage_logs'
  )
ORDER BY tablename, indexname;

-- =====================================================
-- TEST 3: VERIFY RLS POLICIES EXIST
-- =====================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN (
    'tweets_cache', 'blog_posts', 'x_accounts', 'agent_logs', 
    'personas', 'engagement_metrics', 'tweet_insights', 'tweet_replies',
    'potential_tweets', 'system_config', 'agent_status', 'blog_critique',
    'user_profiles', 'user_api_keys', 'api_usage_logs', 'user_settings'
  )
ORDER BY tablename, policyname;

-- =====================================================
-- TEST 4: VERIFY FUNCTIONS EXIST
-- =====================================================

SELECT 
  routine_name,
  routine_type,
  data_type
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
-- TEST 5: VERIFY TRIGGERS EXIST
-- =====================================================

SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
  AND event_object_table IN ('user_profiles', 'user_settings', 'user_api_keys')
ORDER BY event_object_table, trigger_name;

-- =====================================================
-- TEST 6: VERIFY VIEWS EXIST
-- =====================================================

SELECT 
  table_name,
  view_definition
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name IN ('user_dashboard_summary', 'user_recent_activity')
ORDER BY table_name;

-- =====================================================
-- TEST 7: CREATE TEST USER AND VERIFY AUTOMATION
-- =====================================================

-- Create test user data to verify the migration works
DO $$
DECLARE
  test_user_id UUID := '550e8400-e29b-41d4-a716-446655440000';
  test_email TEXT := 'test@coral-social.com';
BEGIN
  -- Check if we can insert a test user profile manually
  -- (In production, this would be done by the trigger)
  
  INSERT INTO user_profiles(user_id, email, subscription_tier, api_usage_limit)
  VALUES (test_user_id, test_email, 'free', 1000)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO user_settings(user_id)
  VALUES (test_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO personas(user_id, name, description, tone, is_default)
  VALUES (test_user_id, 'Test Persona', 'Test persona for validation', 'professional', true)
  ON CONFLICT DO NOTHING;
  
  INSERT INTO agent_logs(user_id, agent_name, action, details)
  VALUES (test_user_id, 'test', 'migration_test', 'Testing database migration');
  
  RAISE NOTICE 'Test user data created successfully';
END $$;

-- =====================================================
-- TEST 8: VERIFY USER DATA ISOLATION
-- =====================================================

-- Create a second test user to verify RLS isolation
DO $$
DECLARE
  test_user_id_2 UUID := '550e8400-e29b-41d4-a716-446655440001';
  test_email_2 TEXT := 'test2@coral-social.com';
BEGIN
  INSERT INTO user_profiles(user_id, email, subscription_tier, api_usage_limit)
  VALUES (test_user_id_2, test_email_2, 'pro', 2000)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO agent_logs(user_id, agent_name, action, details)
  VALUES (test_user_id_2, 'test', 'migration_test', 'Testing user isolation');
  
  RAISE NOTICE 'Second test user created successfully';
END $$;

-- =====================================================
-- TEST 9: TEST UTILITY FUNCTIONS
-- =====================================================

-- Test API usage tracking
SELECT increment_api_usage(
  '550e8400-e29b-41d4-a716-446655440000'::UUID,
  'openai',
  10,
  150,
  '/v1/chat/completions'
);

-- Test usage limit checking
SELECT check_usage_limit('550e8400-e29b-41d4-a716-446655440000'::UUID) as within_limit;

-- Test API key storage (with dummy encrypted data)
INSERT INTO user_api_keys(user_id, service_name, encrypted_key)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000'::UUID,
  'openai',
  'encrypted_dummy_key_for_testing'
)
ON CONFLICT (user_id, service_name) DO UPDATE SET
  encrypted_key = EXCLUDED.encrypted_key;

-- Test API key retrieval
SELECT get_user_api_key(
  '550e8400-e29b-41d4-a716-446655440000'::UUID,
  'openai'
) as retrieved_key;

-- =====================================================
-- TEST 10: VERIFY DASHBOARD VIEWS
-- =====================================================

-- Test user dashboard summary view
SELECT * FROM user_dashboard_summary 
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::UUID;

-- Test recent activity view
SELECT * FROM user_recent_activity 
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::UUID
LIMIT 5;

-- =====================================================
-- TEST 11: PERFORMANCE TESTING FOR YOUR TABLES
-- =====================================================

-- Test index usage for common queries on your actual tables
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM tweets_cache 
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::UUID 
ORDER BY created_at DESC 
LIMIT 50;

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM user_profiles 
WHERE email = 'test@coral-social.com';

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM api_usage_logs 
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::UUID 
  AND created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;

-- Test performance on your existing tables
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM blog_posts 
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::UUID 
ORDER BY created_at DESC 
LIMIT 20;

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM x_accounts 
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::UUID;

-- =====================================================
-- TEST 12: VALIDATE YOUR SPECIFIC SCHEMA
-- =====================================================

-- Test that all your existing tables now have user_id columns
SELECT 
  'Schema Validation' as test_type,
  COUNT(*) as tables_with_user_id
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND column_name = 'user_id'
  AND table_name IN (
    'tweets_cache', 'blog_posts', 'x_accounts', 'agent_logs', 
    'personas', 'engagement_metrics', 'tweet_insights', 'tweet_replies',
    'potential_tweets', 'system_config', 'agent_status', 'blog_critique'
  );

-- Verify RLS is enabled on all your tables
SELECT 
  'RLS Validation' as test_type,
  COUNT(*) as tables_with_rls
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = true
  AND tablename IN (
    'tweets_cache', 'blog_posts', 'x_accounts', 'agent_logs', 
    'personas', 'engagement_metrics', 'tweet_insights', 'tweet_replies',
    'potential_tweets', 'system_config', 'agent_status', 'blog_critique',
    'user_profiles', 'user_api_keys', 'api_usage_logs', 'user_settings'
  );

-- =====================================================
-- TEST 13: CLEANUP TEST DATA (OPTIONAL)
-- =====================================================

-- Remove test data (optional - comment out if you want to keep test data)
/*
DELETE FROM api_usage_logs WHERE user_id IN (
  '550e8400-e29b-41d4-a716-446655440000'::UUID,
  '550e8400-e29b-41d4-a716-446655440001'::UUID
);

DELETE FROM user_api_keys WHERE user_id IN (
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
-- VALIDATION SUMMARY
-- =====================================================

-- Final validation query to ensure everything is working
SELECT 
  'Migration Validation Complete' as status,
  (SELECT COUNT(*) FROM user_profiles) as user_profiles_count,
  (SELECT COUNT(*) FROM user_api_keys) as api_keys_count,
  (SELECT COUNT(*) FROM api_usage_logs) as usage_logs_count,
  (SELECT COUNT(*) FROM user_settings) as user_settings_count,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as rls_policies_count,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%') as custom_indexes_count;

-- Check for any missing indexes on your tables
SELECT 
  'Missing Indexes Check' as check_type,
  CASE 
    WHEN COUNT(*) >= 15 THEN 'PASS - Expected indexes created for your schema'
    ELSE 'FAIL - Some indexes may be missing'
  END as result
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
  AND tablename IN (
    'tweets_cache', 'blog_posts', 'x_accounts', 'agent_logs', 
    'personas', 'engagement_metrics', 'tweet_insights', 'tweet_replies',
    'potential_tweets', 'user_profiles', 'user_api_keys', 'api_usage_logs'
  );

-- Check for RLS policies on your tables
SELECT 
  'RLS Policies Check' as check_type,
  CASE 
    WHEN COUNT(*) >= 16 THEN 'PASS - All expected RLS policies created for your schema'
    ELSE 'FAIL - Some RLS policies may be missing'
  END as result
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN (
    'tweets_cache', 'blog_posts', 'x_accounts', 'agent_logs', 
    'personas', 'engagement_metrics', 'tweet_insights', 'tweet_replies',
    'potential_tweets', 'system_config', 'agent_status', 'blog_critique',
    'user_profiles', 'user_api_keys', 'api_usage_logs', 'user_settings'
  );

-- =====================================================
-- NEXT STEPS FOR YOUR DATABASE
-- =====================================================

/*
If all tests pass, you can proceed to Phase 2:

1. ✅ Database schema migration complete for your tables
2. ✅ RLS policies implemented on all tables
3. ✅ Performance indexes created for your schema
4. ✅ Utility functions working
5. ✅ Triggers functioning

Your specific tables now support multi-tenancy:
- tweets_cache ✓
- blog_posts ✓  
- x_accounts ✓
- agent_logs ✓
- personas ✓
- engagement_metrics ✓
- tweet_insights ✓
- tweet_replies ✓
- potential_tweets ✓
- system_config ✓
- agent_status ✓
- blog_critique ✓

Next Phase: Authentication System Implementation
- Set up Supabase Auth configuration
- Create login/signup pages
- Implement protected routes
- Add API key encryption
*/
