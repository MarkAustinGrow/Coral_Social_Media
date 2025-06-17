# Twitter Posting Agent for Coral Protocol

This agent is responsible for posting scheduled tweets to Twitter. It's part of a larger social media agentive system built on the Coral Protocol.

## Prerequisites

- Python 3.12.10
- Access to an OpenAI API key
- Twitter/X API credentials (API key, API secret, bearer token, access token, access token secret)
- Supabase account and project

## Setup

### 1. Environment Variables

Ensure your `.env` file includes the following variables:

```
# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Twitter/X API
TWITTER_BEARER_TOKEN=your_twitter_bearer_token
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_SECRET=your_twitter_access_secret

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
- `potential_tweets` - for storing tweet threads scheduled for posting

## Running the Agent

### 1. Start the Coral Server

First, start the Coral Server:

```bash
cd coral-server-master
./gradlew run
```

### 2. Run the Prerequisite Agents

The Twitter Posting Agent depends on tweet threads created by the Blog to Tweet Agent, which in turn depends on blog posts created by the Blog Writing Agent, insights gathered by the Tweet Research Agent, and tweets collected by the Tweet Scraping Agent, so make sure they're running:

```bash
python 2_langchain_tweet_scraping_agent.py
python 3_langchain_tweet_research_agent.py
python 4_langchain_blog_writing_agent.py
python 5_langchain_blog_to_tweet_agent.py
```

### 3. Run the Twitter Posting Agent

In a new terminal window, run:

```bash
python 7_langchain_twitter_posting_agent.py
```

## How It Works

The Twitter Posting Agent performs the following tasks:

1. **Tweet Scheduling**: The agent:
   - Checks for tweets scheduled for posting in Supabase
   - Respects the scheduled posting time
   - Groups tweets by blog post ID to identify threads

2. **Rate Limit Management**: The agent:
   - Checks Twitter API rate limits before posting
   - Adjusts posting frequency based on remaining rate limits
   - Waits between posts to avoid rate limiting

3. **Thread Posting**: The agent:
   - Posts tweet threads in the correct order
   - Ensures replies are properly connected to the original tweet
   - Updates the status of tweets in Supabase after posting

4. **Error Handling**: The agent:
   - Handles Twitter API errors gracefully
   - Updates the status of failed tweets in Supabase
   - Continues with the next thread if one fails

## Agent Tools

The agent has the following tools:

1. `get_scheduled_tweets`: Gets tweets scheduled for posting
2. `post_tweet`: Posts a single tweet to Twitter
3. `post_tweet_thread`: Posts a thread of tweets to Twitter
4. `check_api_rate_limits`: Checks Twitter API rate limits

## Extending the Agent

To extend the agent's functionality:

1. Add new tools by creating additional `@tool` decorated functions
2. Update the agent's prompt to include instructions for using the new tools
3. Add the new tools to the `agent_tools` list in the `main` function

## Troubleshooting

- **Twitter API Errors**: Check your Twitter API credentials and ensure you have the necessary permissions
- **Rate Limiting**: If you encounter rate limiting issues, adjust the frequency of posting or add more sophisticated rate limit handling
- **Supabase Errors**: Verify your Supabase URL and key, and ensure the tables exist
- **Agent Communication Issues**: Make sure the Coral Server is running and the agent is connected to it
