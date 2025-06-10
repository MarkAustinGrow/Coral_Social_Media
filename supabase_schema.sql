-- Create tweets_cache table
CREATE TABLE IF NOT EXISTS tweets_cache (
  id SERIAL PRIMARY KEY,
  tweet_id TEXT UNIQUE NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE,
  author TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  retweets INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  conversation_id TEXT,
  analyzed BOOLEAN DEFAULT FALSE,
  inserted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for tweets_cache
CREATE INDEX IF NOT EXISTS idx_tweets_cache_analyzed ON tweets_cache(analyzed);
CREATE INDEX IF NOT EXISTS idx_tweets_cache_author ON tweets_cache(author);

-- Create x_accounts table
CREATE TABLE IF NOT EXISTS x_accounts (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  priority INTEGER DEFAULT 1,
  last_fetched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for x_accounts
CREATE INDEX IF NOT EXISTS idx_x_accounts_priority ON x_accounts(priority);

-- Create tweet_insights table for storing analysis results
CREATE TABLE IF NOT EXISTS tweet_insights (
  id SERIAL PRIMARY KEY,
  tweet_id TEXT UNIQUE NOT NULL,
  tweet_text TEXT NOT NULL,
  main_topic TEXT,
  key_claims JSONB,
  context TEXT,
  implications TEXT,
  raw_analysis JSONB,
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (tweet_id) REFERENCES tweets_cache(tweet_id) ON DELETE CASCADE
);

-- Create index for tweet_insights
CREATE INDEX IF NOT EXISTS idx_tweet_insights_tweet_id ON tweet_insights(tweet_id);
CREATE INDEX IF NOT EXISTS idx_tweet_insights_main_topic ON tweet_insights(main_topic);

-- Create blog_posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  word_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft', -- draft, review, published
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for blog_posts
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON blog_posts(created_at);

-- Create potential_tweets table for storing tweet threads
CREATE TABLE IF NOT EXISTS potential_tweets (
  id SERIAL PRIMARY KEY,
  blog_post_id INTEGER,
  content TEXT NOT NULL,
  position INTEGER NOT NULL,
  status TEXT DEFAULT 'scheduled', -- scheduled, posted, failed
  scheduled_for TIMESTAMP WITH TIME ZONE,
  posted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (blog_post_id) REFERENCES blog_posts(id) ON DELETE CASCADE
);

-- Create index for potential_tweets
CREATE INDEX IF NOT EXISTS idx_potential_tweets_blog_post_id ON potential_tweets(blog_post_id);
CREATE INDEX IF NOT EXISTS idx_potential_tweets_status ON potential_tweets(status);
CREATE INDEX IF NOT EXISTS idx_potential_tweets_scheduled_for ON potential_tweets(scheduled_for);

-- Create tweet_replies table for storing replies to tweets
CREATE TABLE IF NOT EXISTS tweet_replies (
  id SERIAL PRIMARY KEY,
  tweet_id TEXT NOT NULL,
  reply_to_tweet_id TEXT NOT NULL,
  reply_content TEXT NOT NULL,
  knowledge_used JSONB,
  status TEXT DEFAULT 'posted', -- posted, failed
  posted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for tweet_replies
CREATE INDEX IF NOT EXISTS idx_tweet_replies_tweet_id ON tweet_replies(tweet_id);
CREATE INDEX IF NOT EXISTS idx_tweet_replies_reply_to_tweet_id ON tweet_replies(reply_to_tweet_id);

-- Create engagement_metrics table
CREATE TABLE IF NOT EXISTS engagement_metrics (
  id SERIAL PRIMARY KEY,
  topic TEXT UNIQUE NOT NULL,
  engagement_score INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for engagement_metrics
CREATE INDEX IF NOT EXISTS idx_engagement_metrics_score ON engagement_metrics(engagement_score);

-- Insert sample accounts (uncomment and modify as needed)
-- INSERT INTO x_accounts (username, display_name, priority) VALUES
--   ('OpenAI', 'OpenAI', 10),
--   ('elonmusk', 'Elon Musk', 9),
--   ('Microsoft', 'Microsoft', 8),
--   ('Google', 'Google', 7),
--   ('Apple', 'Apple', 6);

-- Insert sample engagement metrics (uncomment and modify as needed)
-- INSERT INTO engagement_metrics (topic, engagement_score) VALUES
--   ('AI', 95),
--   ('Machine Learning', 90),
--   ('Data Science', 85),
--   ('Python', 80),
--   ('JavaScript', 75);
