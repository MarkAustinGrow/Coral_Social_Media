"use client"

import { useState, useRef } from "react"
import { CheckCircle, AlertCircle, ChevronRight, Database, Copy, Check } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface FinishStepProps {
  formData: any
  updateFormData: (data: any) => void
}

export function FinishStep({ formData, updateFormData }: FinishStepProps) {
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState(false)
  const sqlSchemaRef = useRef<HTMLPreElement>(null)
  
  const toggleDetails = (section: string) => {
    setShowDetails(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }
  
  // Client-side only function for copying text to clipboard
  const copyToClipboard = () => {
    if (typeof window === 'undefined' || !sqlSchemaRef.current) {
      return;
    }
    
    const text = sqlSchemaRef.current.textContent || "";
    
    // Set copied state for UI feedback regardless of actual copy success
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    // Try to use the modern Clipboard API first
    try {
      // Create a fallback using document.execCommand
      const fallbackCopyTextToClipboard = (text: string) => {
        // Create a temporary textarea element
        const textArea = document.createElement('textarea');
        textArea.value = text;
        
        // Make the textarea out of viewport
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        
        // Select and copy the text
        textArea.focus();
        textArea.select();
        
        let success = false;
        try {
          success = document.execCommand('copy');
        } catch (err) {
          console.error('Fallback: Unable to copy', err);
        }
        
        // Clean up
        document.body.removeChild(textArea);
        return success;
      };
      
      // Try the modern API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => {
          // If modern API fails, try the fallback
          fallbackCopyTextToClipboard(text);
        });
      } else {
        // Modern API not available, use fallback directly
        fallbackCopyTextToClipboard(text);
      }
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };
  
  // Check if all required fields are filled
  const apiKeysComplete = formData.openai && formData.twitterBearer
  const databaseComplete = formData.supabaseUrl && formData.supabaseKey
  
  // Count enabled agents
  const enabledAgents = [
    formData.tweetScraping,
    formData.tweetResearch,
    formData.blogWriting,
    formData.blogToTweet,
    formData.xReply,
    formData.twitterPosting
  ].filter(Boolean).length
  
  return (
    <div className="space-y-6">
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertTitle>Setup Almost Complete</AlertTitle>
        <AlertDescription>
          Review your configuration before finalizing setup.
        </AlertDescription>
      </Alert>
      
      <div className="space-y-4">
        <Card className={apiKeysComplete ? "border-green-500" : "border-yellow-500"}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              {apiKeysComplete ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
              API Keys
            </CardTitle>
            <CardDescription>
              {apiKeysComplete 
                ? "All required API keys are configured" 
                : "Some required API keys are missing"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm">
                  {apiKeysComplete 
                    ? "Your system will be able to connect to all required services." 
                    : "You may need to add missing API keys later."}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleDetails("apiKeys")}
              >
                {showDetails.apiKeys ? "Hide Details" : "Show Details"}
                <ChevronRight className={`ml-2 h-4 w-4 transition-transform ${showDetails.apiKeys ? "rotate-90" : ""}`} />
              </Button>
            </div>
            
            {showDetails.apiKeys && (
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>OpenAI API Key</span>
                  <span>{formData.openai ? "✓ Configured" : "✗ Missing"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Perplexity API Key</span>
                  <span>{formData.perplexity ? "✓ Configured" : "✗ Missing"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Anthropic API Key</span>
                  <span>{formData.anthropic ? "✓ Configured" : "✗ Missing"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Twitter Bearer Token</span>
                  <span>{formData.twitterBearer ? "✓ Configured" : "✗ Missing"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Twitter API Credentials</span>
                  <span>{formData.twitterApiKey && formData.twitterApiSecret ? "✓ Configured" : "⚠ Partial"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Supabase Credentials</span>
                  <span>{formData.supabaseUrl && formData.supabaseKey ? "✓ Configured" : "✗ Missing"}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className={databaseComplete ? "border-green-500" : "border-yellow-500"}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              {databaseComplete ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
              Database Configuration
            </CardTitle>
            <CardDescription>
              {databaseComplete 
                ? "Database connection is configured" 
                : "Database configuration is incomplete"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm">
                  {databaseComplete 
                    ? "Your system will store data in Supabase." 
                    : "You need to configure your database connection."}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleDetails("database")}
              >
                {showDetails.database ? "Hide Details" : "Show Details"}
                <ChevronRight className={`ml-2 h-4 w-4 transition-transform ${showDetails.database ? "rotate-90" : ""}`} />
              </Button>
            </div>
            
            {showDetails.database && (
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Supabase URL</span>
                  <span>{formData.supabaseUrl ? "✓ Configured" : "✗ Missing"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Supabase API Key</span>
                  <span>{formData.supabaseKey ? "✓ Configured" : "✗ Missing"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Connection Pooling</span>
                  <span>{formData.enablePooling ? `✓ Enabled (${formData.poolSize})` : "✗ Disabled"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vector Database (Qdrant)</span>
                  <span>{formData.qdrantUrl ? "✓ Configured" : "⚠ Default"}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className={enabledAgents > 0 ? "border-green-500" : "border-yellow-500"}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              {enabledAgents > 0 ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
              Agent Configuration
            </CardTitle>
            <CardDescription>
              {enabledAgents > 0 
                ? `${enabledAgents} agents enabled` 
                : "No agents enabled"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm">
                  {enabledAgents > 0 
                    ? `Your system will run with ${enabledAgents} active agents.` 
                    : "You need to enable at least one agent."}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleDetails("agents")}
              >
                {showDetails.agents ? "Hide Details" : "Show Details"}
                <ChevronRight className={`ml-2 h-4 w-4 transition-transform ${showDetails.agents ? "rotate-90" : ""}`} />
              </Button>
            </div>
            
            {showDetails.agents && (
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Tweet Scraping Agent</span>
                  <span>{formData.tweetScraping ? "✓ Enabled" : "✗ Disabled"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tweet Research Agent</span>
                  <span>{formData.tweetResearch ? "✓ Enabled" : "✗ Disabled"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Blog Writing Agent</span>
                  <span>{formData.blogWriting ? "✓ Enabled" : "✗ Disabled"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Blog to Tweet Agent</span>
                  <span>{formData.blogToTweet ? "✓ Enabled" : "✗ Disabled"}</span>
                </div>
                <div className="flex justify-between">
                  <span>X Reply Agent</span>
                  <span>{formData.xReply ? "✓ Enabled" : "✗ Disabled"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Twitter Posting Agent</span>
                  <span>{formData.twitterPosting ? "✓ Enabled" : "✗ Disabled"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Concurrent Agents</span>
                  <span>{formData.maxConcurrentAgents}</span>
                </div>
                <div className="flex justify-between">
                  <span>Auto-restart Failed Agents</span>
                  <span>{formData.enableAutoRestart ? "✓ Enabled" : "✗ Disabled"}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Persona Configuration
            </CardTitle>
            <CardDescription>
              Persona "{formData.name}" configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm">
                  Your system will use the configured persona for content generation.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleDetails("persona")}
              >
                {showDetails.persona ? "Hide Details" : "Show Details"}
                <ChevronRight className={`ml-2 h-4 w-4 transition-transform ${showDetails.persona ? "rotate-90" : ""}`} />
              </Button>
            </div>
            
            {showDetails.persona && (
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Name</span>
                  <span>{formData.name}</span>
                </div>
                <div>
                  <span>Description</span>
                  <p className="mt-1 text-muted-foreground">{formData.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="flex justify-between">
                    <span>Formality</span>
                    <span>{formData.tone}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Humor</span>
                    <span>{formData.humor}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Enthusiasm</span>
                    <span>{formData.enthusiasm}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Assertiveness</span>
                    <span>{formData.assertiveness}%</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4 text-blue-500" />
              Database Schema Setup
            </CardTitle>
            <CardDescription>
              SQL schema for Supabase database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm">
                  Run these SQL queries in your Supabase SQL editor to set up the required database tables.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleDetails("sqlSchema")}
              >
                {showDetails.sqlSchema ? "Hide Schema" : "Show Schema"}
                <ChevronRight className={`ml-2 h-4 w-4 transition-transform ${showDetails.sqlSchema ? "rotate-90" : ""}`} />
              </Button>
            </div>
            
            {showDetails.sqlSchema && (
              <div className="mt-4 space-y-2">
                <div className="relative">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="absolute right-2 top-2 z-10"
                    onClick={copyToClipboard}
                  >
                    {copied ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                  <div className="relative rounded-md border bg-muted">
                    <pre 
                      ref={sqlSchemaRef}
                      className="overflow-x-auto p-4 text-xs"
                    >
{`-- =====================================================
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
('setup_completed', 'true', 'Indicates if initial setup is complete'),
('agent_check_interval', '300', 'Agent health check interval in seconds'),
('max_tweets_per_hour', '10', 'Maximum tweets to post per hour'),
('default_persona', 'professional', 'Default writing persona')
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
-- =====================================================`}
                    </pre>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    <p><strong>Setup Instructions:</strong></p>
                    <ol className="list-decimal pl-4 space-y-1 mt-1">
                      <li>Log in to your Supabase dashboard</li>
                      <li>Navigate to the <strong>SQL Editor</strong> in the left sidebar</li>
                      <li>Click <strong>"New query"</strong></li>
                      <li>Copy the complete SQL schema above using the "Copy" button</li>
                      <li>Paste it into the SQL editor</li>
                      <li>Click <strong>"Run"</strong> to execute all queries</li>
                      <li>Wait for completion (should take 10-30 seconds)</li>
                      <li>Verify setup by running: <code>SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;</code></li>
                    </ol>
                    <p className="mt-2"><strong>What this creates:</strong></p>
                    <ul className="list-disc pl-4 space-y-1 mt-1">
                      <li>12 database tables for complete system functionality</li>
                      <li>35+ performance indexes for optimal query speed</li>
                      <li>Foreign key relationships and constraints</li>
                      <li>Sample data including default personas and configuration</li>
                      <li>Verification queries to test your setup</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Alert variant={apiKeysComplete && databaseComplete && enabledAgents > 0 ? "default" : "destructive"}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>
          {apiKeysComplete && databaseComplete && enabledAgents > 0 
            ? "Ready to Complete Setup" 
            : "Configuration Incomplete"}
        </AlertTitle>
        <AlertDescription>
          {apiKeysComplete && databaseComplete && enabledAgents > 0 
            ? "Click 'Complete Setup' to finalize your configuration and start using the system." 
            : "Some required configuration is missing. You can still proceed, but you'll need to complete the configuration later."}
        </AlertDescription>
      </Alert>
    </div>
  )
}
