-- =====================================================
-- CORAL SOCIAL MEDIA - MULTI-TENANT DATABASE MIGRATION
-- Phase 1: Database Foundation (CORRECTED FOR EXISTING SCHEMA)
-- =====================================================

-- This script implements the database schema changes needed for multi-tenancy
-- Updated to match your existing database table names
-- Execute this script in your Supabase SQL editor

BEGIN;

-- =====================================================
-- STEP 1: ADD USER_ID COLUMNS TO EXISTING TABLES
-- =====================================================

-- Add user_id columns to your existing tables
-- Note: Using your actual table names from the database

-- Core tables that exist in your database
ALTER TABLE tweets_cache ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE x_accounts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE agent_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE personas ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE engagement_metrics ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE tweet_insights ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE tweet_replies ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE potential_tweets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE system_config ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE agent_status ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE blog_critique ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- =====================================================
-- STEP 2: CREATE NEW MULTI-TENANT TABLES
-- =====================================================

-- User profiles table (extends auth.users with app-specific data)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  company_name TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  api_usage_limit INTEGER DEFAULT 1000,
  api_usage_current INTEGER DEFAULT 0,
  setup_completed BOOLEAN DEFAULT false,
  onboarding_step INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API keys table (encrypted storage)
CREATE TABLE IF NOT EXISTS user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  service_name TEXT NOT NULL, -- 'openai', 'twitter_bearer', 'twitter_api_key', etc.
  encrypted_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, service_name)
);

-- Usage tracking table for billing and monitoring
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  service_name TEXT NOT NULL,
  endpoint TEXT,
  cost_cents INTEGER NOT NULL DEFAULT 0,
  tokens_used INTEGER,
  response_time_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User settings table for preferences
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  notification_email BOOLEAN DEFAULT true,
  notification_browser BOOLEAN DEFAULT true,
  auto_post_enabled BOOLEAN DEFAULT false,
  max_daily_posts INTEGER DEFAULT 5,
  preferred_posting_times JSONB DEFAULT '["09:00", "13:00", "17:00"]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STEP 3: CREATE PERFORMANCE INDEXES
-- =====================================================

-- Critical performance indexes for user-specific queries on existing tables
CREATE INDEX IF NOT EXISTS idx_tweets_cache_user_id ON tweets_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_tweets_cache_user_created ON tweets_cache(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tweets_cache_user_status ON tweets_cache(user_id, status);

CREATE INDEX IF NOT EXISTS idx_blog_posts_user_id ON blog_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_user_created ON blog_posts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_x_accounts_user_id ON x_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_x_accounts_user_active ON x_accounts(user_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_agent_logs_user_id ON agent_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_user_created ON agent_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_user_agent ON agent_logs(user_id, agent_name);

CREATE INDEX IF NOT EXISTS idx_personas_user_id ON personas(user_id);
CREATE INDEX IF NOT EXISTS idx_personas_user_default ON personas(user_id, is_default) WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_engagement_metrics_user_id ON engagement_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_engagement_metrics_user_date ON engagement_metrics(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_tweet_insights_user_id ON tweet_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_tweet_insights_user_created ON tweet_insights(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tweet_replies_user_id ON tweet_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_tweet_replies_user_created ON tweet_replies(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_potential_tweets_user_id ON potential_tweets(user_id);
CREATE INDEX IF NOT EXISTS idx_potential_tweets_user_created ON potential_tweets(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_config_user_id ON system_config(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_status_user_id ON agent_status(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_critique_user_id ON blog_critique(user_id);

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription ON user_profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_user_profiles_setup ON user_profiles(setup_completed);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_service ON user_api_keys(user_id, service_name);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_active ON user_api_keys(user_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_date ON api_usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_service_date ON api_usage_logs(service_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_service ON api_usage_logs(user_id, service_name);

-- =====================================================
-- STEP 4: ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on existing tables
ALTER TABLE tweets_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE tweet_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE tweet_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE potential_tweets ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_critique ENABLE ROW LEVEL SECURITY;

-- Enable RLS on new tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 5: CREATE RLS POLICIES
-- =====================================================

-- RLS Policies: Users can only access their own data

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "users_own_tweets_cache" ON tweets_cache;
DROP POLICY IF EXISTS "users_own_blog_posts" ON blog_posts;
DROP POLICY IF EXISTS "users_own_x_accounts" ON x_accounts;
DROP POLICY IF EXISTS "users_own_agent_logs" ON agent_logs;
DROP POLICY IF EXISTS "users_own_personas" ON personas;
DROP POLICY IF EXISTS "users_own_engagement_metrics" ON engagement_metrics;
DROP POLICY IF EXISTS "users_own_tweet_insights" ON tweet_insights;
DROP POLICY IF EXISTS "users_own_tweet_replies" ON tweet_replies;
DROP POLICY IF EXISTS "users_own_potential_tweets" ON potential_tweets;
DROP POLICY IF EXISTS "users_own_system_config" ON system_config;
DROP POLICY IF EXISTS "users_own_agent_status" ON agent_status;
DROP POLICY IF EXISTS "users_own_blog_critique" ON blog_critique;
DROP POLICY IF EXISTS "users_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "users_own_api_keys" ON user_api_keys;
DROP POLICY IF EXISTS "users_own_usage_logs" ON api_usage_logs;
DROP POLICY IF EXISTS "users_own_settings" ON user_settings;

-- Create policies for existing tables
CREATE POLICY "users_own_tweets_cache" ON tweets_cache 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_blog_posts" ON blog_posts 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_x_accounts" ON x_accounts 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_agent_logs" ON agent_logs 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_personas" ON personas 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_engagement_metrics" ON engagement_metrics 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_tweet_insights" ON tweet_insights 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_tweet_replies" ON tweet_replies 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_potential_tweets" ON potential_tweets 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_system_config" ON system_config 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_agent_status" ON agent_status 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_blog_critique" ON blog_critique 
  FOR ALL USING (auth.uid() = user_id);

-- Create policies for new tables
CREATE POLICY "users_own_profile" ON user_profiles 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_api_keys" ON user_api_keys 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_usage_logs" ON api_usage_logs 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_settings" ON user_settings 
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- STEP 6: CREATE UTILITY FUNCTIONS
-- =====================================================

-- Function to handle new user creation (automated provisioning)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create user profile with default settings
  INSERT INTO user_profiles(user_id, email, subscription_tier, api_usage_limit)
  VALUES (NEW.id, NEW.email, 'free', 1000)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create default user settings
  INSERT INTO user_settings(user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create default persona
  INSERT INTO personas(user_id, name, description, tone, is_default)
  VALUES (NEW.id, 'Default', 'Professional social media persona', 'professional', true)
  ON CONFLICT DO NOTHING;
  
  -- Log user creation
  INSERT INTO agent_logs(user_id, agent_name, action, details)
  VALUES (NEW.id, 'system', 'user_created', 'New user account provisioned with default settings');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment API usage (for billing tracking)
CREATE OR REPLACE FUNCTION increment_api_usage(
  p_user_id UUID, 
  p_service_name TEXT, 
  p_cost_cents INTEGER DEFAULT 1,
  p_tokens_used INTEGER DEFAULT NULL,
  p_endpoint TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Update current usage in user profile
  UPDATE user_profiles 
  SET api_usage_current = api_usage_current + p_cost_cents,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Log the usage for detailed tracking
  INSERT INTO api_usage_logs (
    user_id, 
    service_name, 
    cost_cents, 
    tokens_used, 
    endpoint
  )
  VALUES (
    p_user_id, 
    p_service_name, 
    p_cost_cents, 
    p_tokens_used, 
    p_endpoint
  );
END;
$$ LANGUAGE plpgsql;

-- Function to reset monthly usage (call this monthly via cron)
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
  UPDATE user_profiles 
  SET api_usage_current = 0,
      updated_at = NOW();
  
  -- Log the reset
  INSERT INTO agent_logs(user_id, agent_name, action, details)
  SELECT user_id, 'system', 'usage_reset', 'Monthly API usage reset'
  FROM user_profiles;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has exceeded usage limits
CREATE OR REPLACE FUNCTION check_usage_limit(p_user_id UUID)
RETURNS boolean AS $$
DECLARE
  current_usage INTEGER;
  usage_limit INTEGER;
BEGIN
  SELECT api_usage_current, api_usage_limit 
  INTO current_usage, usage_limit
  FROM user_profiles 
  WHERE user_id = p_user_id;
  
  RETURN current_usage < usage_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's API key (for server-side use only)
CREATE OR REPLACE FUNCTION get_user_api_key(p_user_id UUID, p_service_name TEXT)
RETURNS TEXT AS $$
DECLARE
  encrypted_key TEXT;
BEGIN
  SELECT user_api_keys.encrypted_key 
  INTO encrypted_key
  FROM user_api_keys 
  WHERE user_id = p_user_id 
    AND service_name = p_service_name 
    AND is_active = true;
  
  RETURN encrypted_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 7: CREATE TRIGGERS
-- =====================================================

-- Create trigger for automatic user provisioning
DROP TRIGGER IF EXISTS on_user_created ON auth.users;
CREATE TRIGGER on_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at 
  BEFORE UPDATE ON user_settings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_api_keys_updated_at ON user_api_keys;
CREATE TRIGGER update_user_api_keys_updated_at 
  BEFORE UPDATE ON user_api_keys 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 8: GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions for authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions for the service role (for server-side operations)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- =====================================================
-- STEP 9: CREATE VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for user dashboard summary (updated for your table names)
CREATE OR REPLACE VIEW user_dashboard_summary AS
SELECT 
  up.user_id,
  up.email,
  up.full_name,
  up.subscription_tier,
  up.api_usage_current,
  up.api_usage_limit,
  up.setup_completed,
  (SELECT COUNT(*) FROM tweets_cache WHERE user_id = up.user_id) as total_tweets_cache,
  (SELECT COUNT(*) FROM tweets_cache WHERE user_id = up.user_id AND status = 'unprocessed') as pending_tweets,
  (SELECT COUNT(*) FROM blog_posts WHERE user_id = up.user_id) as total_blog_posts,
  (SELECT COUNT(*) FROM x_accounts WHERE user_id = up.user_id) as total_accounts,
  (SELECT COUNT(*) FROM personas WHERE user_id = up.user_id) as total_personas,
  (SELECT COUNT(*) FROM potential_tweets WHERE user_id = up.user_id) as potential_tweets_count
FROM user_profiles up;

-- View for recent user activity
CREATE OR REPLACE VIEW user_recent_activity AS
SELECT 
  al.user_id,
  al.agent_name,
  al.action,
  al.details,
  al.created_at,
  up.email
FROM agent_logs al
JOIN user_profiles up ON al.user_id = up.user_id
WHERE al.created_at >= NOW() - INTERVAL '7 days'
ORDER BY al.created_at DESC;

COMMIT;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verify the migration by running these queries:
-- SELECT COUNT(*) FROM user_profiles;
-- SELECT COUNT(*) FROM user_api_keys;
-- SELECT COUNT(*) FROM api_usage_logs;
-- SELECT * FROM user_dashboard_summary LIMIT 5;

-- Next steps:
-- 1. Test RLS policies by creating test users
-- 2. Verify indexes are being used with EXPLAIN ANALYZE
-- 3. Test the utility functions
-- 4. Proceed to Phase 2: Authentication System Implementation

-- =====================================================
-- IMPORTANT NOTES FOR YOUR DATABASE
-- =====================================================

/*
This corrected script:
1. Uses your actual table names (tweets_cache, blog_posts, etc.)
2. Adds IF NOT EXISTS clauses to prevent errors
3. Drops existing policies before recreating them
4. Includes all tables visible in your database
5. Updates the dashboard view to use your table names

Tables updated for multi-tenancy:
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

New tables created:
- user_profiles ✓
- user_api_keys ✓
- api_usage_logs ✓
- user_settings ✓
*/
