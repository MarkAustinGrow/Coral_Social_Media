# Blog to Tweet Agent for Coral Protocol

This agent is responsible for converting blog posts into tweet threads. It's part of a larger social media agentive system built on the Coral Protocol.

## Prerequisites

- Python 3.12.10
- Access to an OpenAI API key
- Supabase account and project

## Setup

### 1. Environment Variables

Ensure your `.env` file includes the following variables:

```
# OpenAI API
OPENAI_API_KEY=your_openai_api_key

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
- `blog_posts` - for storing blog posts
- `potential_tweets` - for storing tweet threads generated from blog posts

## Running the Agent

### 1. Start the Coral Server

First, start the Coral Server:

```bash
cd coral-server-master
./gradlew run
```

### 2. Run the Prerequisite Agents

The Blog to Tweet Agent depends on blog posts created by the Blog Writing Agent, which in turn depends on insights gathered by the Tweet Research Agent and tweets collected by the Tweet Scraping Agent, so make sure they're running:

```bash
python 2_langchain_tweet_scraping_agent.py
python 3_langchain_tweet_research_agent.py
python 4_langchain_blog_writing_agent.py
```

### 3. Run the Blog to Tweet Agent

In a new terminal window, run:

```bash
python 5_langchain_blog_to_tweet_agent.py
```

## How It Works

The Blog to Tweet Agent performs the following tasks:

1. **Blog Post Conversion**: The agent:
   - Checks for approved blog posts that haven't been converted to tweets yet
   - Converts each blog post into an engaging tweet thread
   - Ensures tweets are within the 280 character limit
   - Adds appropriate numbering, hashtags, and engaging final tweets
   - Creates community-focused content rather than promotional content
   - Prevents duplicate tweet generation for the same blog post

2. **Tweet Thread Management**: The agent:
   - Saves tweet threads to Supabase with appropriate metadata
   - Schedules tweets for posting (default: 24 hours from creation)
   - Tracks the status of tweet threads (scheduled, posted, failed)

3. **Agent Communication**: The agent can:
   - Receive instructions from other agents via the Coral Protocol
   - Process these instructions (e.g., convert a specific blog post to tweets)
   - Send responses back to the requesting agents
   - Notify the Twitter Posting Agent about new tweet threads

## Agent Tools

The agent has the following tools:

1. `get_unconverted_blog_posts`: Gets blog posts that haven't been converted to tweets yet
2. `get_blog_post_by_id`: Gets a specific blog post by ID
3. `convert_blog_to_tweets`: Converts a blog post into a tweet thread
4. `save_tweet_thread`: Saves a tweet thread to Supabase

## Extending the Agent

To extend the agent's functionality:

1. Add new tools by creating additional `@tool` decorated functions
2. Update the agent's prompt to include instructions for using the new tools
3. Add the new tools to the `agent_tools` list in the `main` function

## Troubleshooting

- **OpenAI API Errors**: Check your OpenAI API key and ensure you have the necessary permissions
- **Supabase Errors**: Verify your Supabase URL and key, and ensure the tables exist
- **Agent Communication Issues**: Make sure the Coral Server is running and the agent is connected to it
- **Tweet Conversion Issues**: If tweets are too long, the agent will automatically truncate them to fit within the 280 character limit
- **Duplicate Tweet Issues**: If you see duplicate tweets for the same blog post, check if the SQL function `execute_sql` is properly defined in your Supabase database

## Recent Improvements

### 1. Duplicate Tweet Prevention

The agent now has robust mechanisms to prevent generating duplicate tweets for the same blog post:

- Uses a LEFT JOIN query to check for existing tweets
- Implements a fallback query that explicitly excludes blog posts that already have tweets
- Handles race conditions that could occur when multiple instances run simultaneously

### 2. Community-Focused Final Tweets

The final tweet in each thread has been improved to:

- Focus on building community rather than promoting content
- End with thought-provoking questions or insights that encourage discussion
- Avoid promotional language like "read my blog" or "link in bio"
- Invite followers to share their own experiences and perspectives

### 3. Persona-Based Content Generation

The agent now fully integrates with the persona system to:

- Maintain consistent voice and tone across all tweets
- Adapt content style based on persona parameters (tone, humor, enthusiasm, assertiveness)
- Create more authentic and engaging content that resonates with the target audience
