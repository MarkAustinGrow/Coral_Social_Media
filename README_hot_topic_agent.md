# Hot Topic Agent for Coral Protocol

This agent is responsible for analyzing tweets for engagement and identifying trending topics. It's part of a larger social media agentive system built on the Coral Protocol.

## Prerequisites

- Python 3.12.10
- Access to an OpenAI API key
- Access to an Anthropic API key
- Supabase account and project

## Setup

### 1. Environment Variables

Ensure your `.env` file includes the following variables:

```
# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Anthropic API
ANTHROPIC_API_KEY=your_anthropic_api_key

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

### 2. Install Dependencies

Install the required Python packages:

```bash
pip install -r requirements.txt
```

### 3. Supabase Setup

Run the SQL commands in `supabase_schema.sql` in the Supabase SQL editor to create the necessary tables:
- `tweets_cache` - for storing collected tweets
- `engagement_metrics` - for storing topic engagement metrics

The `engagement_metrics` table should have the following structure:
```sql
CREATE TABLE IF NOT EXISTS engagement_metrics (
  id SERIAL PRIMARY KEY,
  topic TEXT UNIQUE NOT NULL,
  engagement_score INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  topic_description TEXT,
  subtopics JSONB,
  category TEXT
);
```

**Note:** The original schema in `supabase_schema.sql` may only include the basic columns (`id`, `topic`, `engagement_score`, `last_updated`). The additional columns (`topic_description`, `subtopics`, `category`) are used by the agent to store rich topic data and should be added if not present.

## Running the Agent

### 1. Start the Coral Server

First, start the Coral Server:

```bash
cd coral-server-master
./gradlew run
```

### 2. Run the Tweet Scraping Agent

The Hot Topic Agent depends on tweets collected by the Tweet Scraping Agent, so make sure it's running:

```bash
python 2_langchain_tweet_scraping_agent.py
```

### 3. Run the Hot Topic Agent

In a new terminal window, run:

```bash
python 3.5_langchain_hot_topic_agent.py
```

## How It Works

The Hot Topic Agent performs the following tasks:

1. **Tweet Analysis**: The agent:
   - Fetches unprocessed tweets from the `tweets_cache` table
   - Uses Claude to analyze each tweet and extract meaningful topic information
   - Calculates engagement scores based on likes, retweets, and replies
   - Updates the `engagement_metrics` table with topic data and engagement scores
   - Marks tweets as processed

2. **Topic Management**: The agent:
   - Maintains an up-to-date list of topics with engagement scores
   - Identifies trending topics based on engagement
   - Categorizes topics for better organization
   - Tracks subtopics for more comprehensive topic coverage

3. **Agent Communication**: The agent can:
   - Receive instructions from other agents via the Coral Protocol
   - Process these instructions (e.g., analyze specific tweets, get top topics)
   - Send responses back to the requesting agents
   - Notify the Blog Writing Agent about high-engagement topics

## Agent Tools

The agent has the following tools:

1. `get_unprocessed_tweets`: Fetches unprocessed tweets from the `tweets_cache` table
2. `analyze_tweet_for_topics`: Uses Claude to analyze a tweet and extract topic information
3. `calculate_engagement_score`: Calculates an engagement score for a tweet
4. `update_engagement_metrics`: Updates or inserts a topic in the `engagement_metrics` table
5. `mark_tweet_as_processed`: Marks a tweet as processed
6. `process_batch_of_tweets`: Processes a batch of unprocessed tweets
7. `get_top_topics`: Gets top topics by engagement score
8. `notify_blog_writing_agent`: Notifies the Blog Writing Agent about a hot topic

## Enhanced Topic Data

The agent extracts rich topic information from tweets, including:

- **Main Topic**: A concise phrase describing the primary topic (stored in the `topic` column)
- **Topic Description**: A brief description of what the topic is about (stored in the `topic_description` column)
- **Subtopics**: Related subtopics for more comprehensive coverage (stored in the `subtopics` column as JSONB)
- **Category**: The general category the topic falls under (stored in the `category` column)

This rich topic data provides better context for the Blog Writing Agent, resulting in more relevant and engaging blog content.

## Database Schema Notes

The agent code uses the following column mapping when interacting with the `engagement_metrics` table:

- The main topic extracted from tweets (referred to as `main_topic` in the code) is stored in the `topic` column in the database
- The agent extracts additional metadata (topic description, subtopics, category) which are stored in their respective columns

## Extending the Agent

To extend the agent's functionality:

1. Add new tools by creating additional `@tool` decorated functions
2. Update the agent's prompt to include instructions for using the new tools
3. Add the new tools to the `agent_tools` list in the `main` function

## Troubleshooting

- **Claude API Errors**: Check your Anthropic API key and ensure you have the necessary permissions
- **Supabase Errors**: Verify your Supabase URL and key, and ensure the tables exist
- **Column Name Mismatches**: If you see errors like `column engagement_metrics.main_topic does not exist`, ensure the code is using the correct column names that match your database schema (`topic` instead of `main_topic`)
- **Agent Communication Issues**: Make sure the Coral Server is running and the agent is connected to it
