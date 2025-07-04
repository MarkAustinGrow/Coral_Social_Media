# Tweet Scraping Agent for Coral Protocol

This agent is responsible for monitoring Twitter accounts and collecting tweets based on priorities. It's part of a larger social media agentive system built on the Coral Protocol.

## Prerequisites

- Python 3.12.10
- Access to an OpenAI API key
- Twitter/X API credentials (API key, API secret, bearer token, access token, access token secret)
- Supabase account and project

## Setup

### 1. Environment Variables

Copy the `.env.sample` file to `.env` and fill in your API keys:

```bash
cp .env.sample .env
```

Then edit the `.env` file with your actual API keys:

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

1. Create a new Supabase project
2. Run the SQL commands in `supabase_schema.sql` in the Supabase SQL editor to create the necessary tables
3. Add some Twitter accounts to monitor by uncommenting and modifying the sample INSERT statement in `supabase_schema.sql`

## Running the Agent

### 1. Start the Coral Server

First, start the Coral Server:

```bash
cd coral-server-master
./gradlew run
```

### 2. Run the Tweet Scraping Agent

In a new terminal window, run:

```bash
python 2_langchain_tweet_scraping_agent.py
```

## How It Works

The Tweet Scraping Agent performs the following tasks:

1. **Scheduled Scraping**: Every 30 minutes (configurable), the agent:
   - Checks which Twitter accounts to monitor from Supabase
   - Fetches tweets from these accounts using the Twitter API
   - Stores the tweets in Supabase
   - Updates the last fetch time for each account
   - Notifies the Tweet Research Agent about new tweets

2. **Rate Limiting**: The agent respects Twitter API rate limits by:
   - Checking current API usage before fetching tweets
   - Adjusting scraping frequency based on remaining API calls
   - Prioritizing high-priority accounts when API usage is high

3. **Agent Communication**: The agent can:
   - Receive instructions from other agents via the Coral Protocol
   - Process these instructions (e.g., scrape specific accounts, adjust frequency)
   - Send responses back to the requesting agents

## Agent Tools

The agent has the following tools:

1. `fetch_tweets`: Fetches tweets from specified Twitter accounts
2. `get_api_usage`: Checks current Twitter API usage and rate limits
3. `store_tweets`: Stores tweets in Supabase
4. `get_accounts_to_monitor`: Gets the list of Twitter accounts to monitor from Supabase
5. `update_account_fetch_time`: Updates the last fetch time for accounts
6. `adjust_scrape_frequency`: Adjusts the scraping frequency based on API usage
7. `should_execute_now`: Checks if it's time to perform scheduled scraping

## Extending the Agent

To extend the agent's functionality:

1. Add new tools by creating additional `@tool` decorated functions
2. Update the agent's prompt to include instructions for using the new tools
3. Add the new tools to the `agent_tools` list in the `main` function

## Troubleshooting

- **Twitter API Errors**: Check your Twitter API credentials and ensure you have the necessary permissions
- **Supabase Errors**: Verify your Supabase URL and key, and ensure the tables exist
- **Agent Communication Issues**: Make sure the Coral Server is running and the agent is connected to it

## Recent Updates

The agent has been updated to fix issues with the Twitter API rate limit checking. The main changes include:

1. Simplified the get_api_usage function to use default values for rate limits since Tweepy doesn't provide direct access to rate limit status in newer versions
2. Updated error handling to use TweepyException consistently

If you encounter any issues with the Twitter API, make sure you have valid API credentials and that they have the necessary permissions.
