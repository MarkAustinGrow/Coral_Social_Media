-- =====================================================
-- CORAL SOCIAL MEDIA INFRASTRUCTURE - SUPABASE SCHEMA
-- =====================================================
-- Complete database schema for new installations
-- Generated from production database: 2025-06-24
-- 
-- This script creates all tables, indexes, constraints,
-- and relationships needed for the social media agent system.
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: agent_status
-- Agent health monitoring and status tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS agent_status (
    id SERIAL PRIMARY KEY,
    agent_name TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL,
    health INTEGER NOT NULL,
    last_heartbeat TIMESTAMPTZ,
    last_error TEXT,
    last_activity TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: agent_logs
-- Comprehensive agent logging system
-- =====================================================
CREATE TABLE IF NOT EXISTS agent_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    level TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: system_config
-- System-wide configuration storage
-- =====================================================
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: personas
-- Writing personas for content generation
-- =====================================================
CREATE TABLE IF NOT EXISTS personas (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    tone INTEGER,
    humor INTEGER,
    enthusiasm INTEGER,
    assertiveness INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- TABLE: x_accounts
-- X (Twitter) account management
-- =====================================================
CREATE TABLE IF NOT EXISTS x_accounts (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT,
    priority INTEGER DEFAULT 1,
    last_fetched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: tweets_cache
-- Tweet storage and metadata
-- =====================================================
CREATE TABLE IF NOT EXISTS tweets_cache (
    id SERIAL PRIMARY KEY,
    tweet_id TEXT NOT NULL UNIQUE,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ,
    author TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    retweets INTEGER DEFAULT 0,
    replies INTEGER DEFAULT 0,
    conversation_id TEXT,
    analyzed BOOLEAN DEFAULT FALSE,
    inserted_at TIMESTAMPTZ DEFAULT NOW(),
    engagement_processed BOOLEAN DEFAULT FALSE
);

-- =====================================================
-- TABLE: tweet_insights
-- AI-generated tweet analysis and insights
-- =====================================================
CREATE TABLE IF NOT EXISTS tweet_insights (
    id SERIAL PRIMARY KEY,
    tweet_id TEXT NOT NULL UNIQUE,
    tweet_text TEXT NOT NULL,
    main_topic TEXT,
    key_claims JSONB,
    context TEXT,
    implications TEXT,
    raw_analysis JSONB,
    analyzed_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (tweet_id) REFERENCES tweets_cache(tweet_id)
);

-- =====================================================
-- TABLE: engagement_metrics
-- Topic engagement tracking and scoring
-- =====================================================
CREATE TABLE IF NOT EXISTS engagement_metrics (
    id SERIAL PRIMARY KEY,
    topic TEXT NOT NULL UNIQUE,
    engagement_score INTEGER DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    topic_description TEXT,
    subtopics JSONB,
    category TEXT,
    last_used_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    last_used_by_tweet_agent TIMESTAMPTZ
);

-- =====================================================
-- TABLE: tweet_replies
-- Tweet reply tracking and management
-- =====================================================
CREATE TABLE IF NOT EXISTS tweet_replies (
    id SERIAL PRIMARY KEY,
    tweet_id TEXT NOT NULL,
    reply_to_tweet_id TEXT NOT NULL,
    reply_content TEXT NOT NULL,
    knowledge_used JSONB,
    status TEXT DEFAULT 'posted',
    posted_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: blog_posts
-- Main content storage for blog articles
-- =====================================================
CREATE TABLE IF NOT EXISTS blog_posts (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    word_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    review_status TEXT DEFAULT 'pending_fact_check',
    fact_checked_at TIMESTAMP,
    metadata JSONB,
    persona TEXT,
    topic TEXT,
    tweetified BOOLEAN DEFAULT FALSE
);

-- =====================================================
-- TABLE: blog_critique
-- Blog review and critique system
-- =====================================================
CREATE TABLE IF NOT EXISTS blog_critique (
    id SERIAL PRIMARY KEY,
    blog_id INTEGER,
    critique TEXT,
    summary TEXT,
    decision TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (blog_id) REFERENCES blog_posts(id),
    CONSTRAINT blog_critique_decision_check CHECK (decision IN ('approve', 'reject', 'revise'))
);

-- =====================================================
-- TABLE: potential_tweets
-- Tweet scheduling and management
-- =====================================================
CREATE TABLE IF NOT EXISTS potential_tweets (
    id SERIAL PRIMARY KEY,
    blog_post_id INTEGER,
    content TEXT NOT NULL,
    position INTEGER NOT NULL,
    status TEXT DEFAULT 'scheduled',
    scheduled_for TIMESTAMPTZ,
    posted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (blog_post_id) REFERENCES blog_posts(id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Agent logs indexes
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_name ON agent_logs(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_logs_level ON agent_logs(level);
CREATE INDEX IF NOT EXISTS idx_agent_logs_timestamp ON agent_logs(timestamp);

-- Blog posts indexes
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON blog_posts(created_at);

-- Engagement metrics indexes
CREATE INDEX IF NOT EXISTS idx_engagement_metrics_score ON engagement_metrics(engagement_score);
CREATE INDEX IF NOT EXISTS idx_engagement_metrics_category ON engagement_metrics(category);
CREATE INDEX IF NOT EXISTS idx_engagement_metrics_last_used_at ON engagement_metrics(last_used_at);

-- Potential tweets indexes
CREATE INDEX IF NOT EXISTS idx_potential_tweets_status ON potential_tweets(status);
CREATE INDEX IF NOT EXISTS idx_potential_tweets_scheduled_for ON potential_tweets(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_potential_tweets_blog_post_id ON potential_tweets(blog_post_id);

-- Tweet insights indexes
CREATE INDEX IF NOT EXISTS idx_tweet_insights_tweet_id ON tweet_insights(tweet_id);
CREATE INDEX IF NOT EXISTS idx_tweet_insights_main_topic ON tweet_insights(main_topic);

-- Tweet replies indexes
CREATE INDEX IF NOT EXISTS idx_tweet_replies_tweet_id ON tweet_replies(tweet_id);
CREATE INDEX IF NOT EXISTS idx_tweet_replies_reply_to_tweet_id ON tweet_replies(reply_to_tweet_id);

-- Tweets cache indexes
CREATE INDEX IF NOT EXISTS idx_tweets_cache_author ON tweets_cache(author);
CREATE INDEX IF NOT EXISTS idx_tweets_cache_analyzed ON tweets_cache(analyzed);

-- X accounts indexes
CREATE INDEX IF NOT EXISTS idx_x_accounts_priority ON x_accounts(priority);

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert default system configuration
INSERT INTO system_config (key, value, description) VALUES
('setup_completed', '"true"', 'Indicates if initial setup is complete'),
('agent_check_interval', '"300"', 'Agent health check interval in seconds'),
('max_tweets_per_hour', '"10"', 'Maximum tweets to post per hour'),
('default_persona', '"professional"', 'Default writing persona')
ON CONFLICT (key) DO NOTHING;

-- Insert default persona
INSERT INTO personas (name, description, tone, humor, enthusiasm, assertiveness) VALUES
('Professional', 'Professional and informative writing style', 7, 3, 6, 7),
('Casual', 'Casual and friendly writing style', 5, 6, 8, 5),
('Technical', 'Technical and detailed writing style', 8, 2, 7, 8)
ON CONFLICT DO NOTHING;

-- Insert sample engagement metrics
INSERT INTO engagement_metrics (topic, engagement_score, topic_description, category) VALUES
('AI Technology', 85, 'Artificial Intelligence and Machine Learning topics', 'Technology'),
('Social Media', 75, 'Social media trends and platform updates', 'Social'),
('Programming', 80, 'Software development and programming topics', 'Technology')
ON CONFLICT (topic) DO NOTHING;

-- Insert agent status entries for all agents
INSERT INTO agent_status (agent_name, status, health, last_activity) VALUES
('Tweet Scraping Agent', 'stopped', 0, 'Agent initialized during setup'),
('Tweet Research Agent', 'stopped', 0, 'Agent initialized during setup'),
('Hot Topic Agent', 'stopped', 0, 'Agent initialized during setup'),
('Blog Writing Agent', 'stopped', 0, 'Agent initialized during setup'),
('Blog Critique Agent', 'stopped', 0, 'Agent initialized during setup'),
('Blog to Tweet Agent', 'stopped', 0, 'Agent initialized during setup'),
('X Reply Agent', 'stopped', 0, 'Agent initialized during setup'),
('Twitter Posting Agent', 'stopped', 0, 'Agent initialized during setup')
ON CONFLICT (agent_name) DO UPDATE SET
  status = EXCLUDED.status,
  health = EXCLUDED.health,
  last_activity = EXCLUDED.last_activity,
  updated_at = NOW();

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these queries after setup to verify everything is working:

-- Check all tables exist:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- Check table row counts:
-- SELECT 
--   'agent_status' as table_name, COUNT(*) as row_count FROM agent_status
-- UNION ALL SELECT 'agent_logs', COUNT(*) FROM agent_logs
-- UNION ALL SELECT 'system_config', COUNT(*) FROM system_config
-- UNION ALL SELECT 'personas', COUNT(*) FROM personas
-- UNION ALL SELECT 'x_accounts', COUNT(*) FROM x_accounts
-- UNION ALL SELECT 'tweets_cache', COUNT(*) FROM tweets_cache
-- UNION ALL SELECT 'tweet_insights', COUNT(*) FROM tweet_insights
-- UNION ALL SELECT 'engagement_metrics', COUNT(*) FROM engagement_metrics
-- UNION ALL SELECT 'tweet_replies', COUNT(*) FROM tweet_replies
-- UNION ALL SELECT 'blog_posts', COUNT(*) FROM blog_posts
-- UNION ALL SELECT 'blog_critique', COUNT(*) FROM blog_critique
-- UNION ALL SELECT 'potential_tweets', COUNT(*) FROM potential_tweets;

-- =====================================================
-- SETUP COMPLETE
-- =====================================================
-- Your Supabase database is now ready for the 
-- Coral Social Media Infrastructure system!
-- 
-- Next steps:
-- 1. Configure your .env file with Supabase credentials
-- 2. Add your API keys (OpenAI, Twitter, etc.)
-- 3. Run the agent connectivity test
-- =====================================================
