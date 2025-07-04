# X Reply Agent for Coral Protocol

This agent is responsible for generating and posting replies to tweets using knowledge from Qdrant. It's part of a larger social media agentive system built on the Coral Protocol.

## Prerequisites

- Python 3.12.10
- Access to an OpenAI API key
- Twitter/X API credentials (API key, API secret, bearer token, access token, access token secret)
- Supabase account and project
- Qdrant vector database (local or cloud)

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

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_api_key_if_needed
```

### 2. Install Dependencies

Install the required Python packages:

```bash
pip install -r requirements.txt
```

### 3. Supabase and Qdrant Setup

1. Run the SQL commands in `supabase_schema.sql` in the Supabase SQL editor to create the necessary tables:
   - `tweet_replies` - for storing replies to tweets
   - `x_accounts` - for storing Twitter accounts to monitor

2. Ensure Qdrant is running and the `tweet_insights` collection exists (created by the Tweet Research Agent)

## Running the Agent

### 1. Start the Coral Server

First, start the Coral Server:

```bash
cd coral-server-master
./gradlew run
```

### 2. Run the Prerequisite Agents

The X Reply Agent depends on insights gathered by the Tweet Research Agent, which in turn depends on tweets collected by the Tweet Scraping Agent, so make sure they're running:

```bash
python 2_langchain_tweet_scraping_agent.py
python 3_langchain_tweet_research_agent.py
```

### 3. Run the X Reply Agent

In a new terminal window, run:

```bash
python 6_langchain_x_reply_agent.py
```

## How It Works

The X Reply Agent performs the following tasks:

1. **Mention Monitoring**: The agent:
   - Checks for new mentions and replies to your Twitter accounts
   - Filters out mentions that have already been replied to
   - Retrieves the full conversation context for each mention

2. **Knowledge Retrieval**: The agent:
   - Searches Qdrant for relevant knowledge based on the tweet content
   - Uses semantic similarity to find the most relevant insights
   - Retrieves analysis of tweets including main topics, key claims, context, and implications

3. **Reply Generation**: The agent:
   - Uses the retrieved knowledge to generate contextually appropriate replies
   - Ensures replies are helpful, informative, and engaging
   - Maintains a conversational and friendly tone
   - Formats replies to fit within Twitter's character limits

4. **Reply Posting**: The agent:
   - Posts replies to Twitter using the Twitter API
   - Tracks replies in Supabase for future reference
   - Avoids replying to the same tweet multiple times

## Agent Tools

The agent has the following tools:

1. `get_mentions_and_replies`: Gets recent mentions and replies to your Twitter accounts
2. `get_conversation_context`: Gets the conversation context for a tweet
3. `search_knowledge_for_reply`: Searches Qdrant for relevant knowledge to use in a reply
4. `generate_reply`: Generates a reply to a tweet using knowledge from Qdrant
5. `post_reply`: Posts a reply to a tweet

## Extending the Agent

To extend the agent's functionality:

1. Add new tools by creating additional `@tool` decorated functions
2. Update the agent's prompt to include instructions for using the new tools
3. Add the new tools to the `agent_tools` list in the `main` function

## Troubleshooting

- **Twitter API Errors**: Check your Twitter API credentials and ensure you have the necessary permissions
- **Qdrant Errors**: Verify your Qdrant URL and ensure the service is running
- **Supabase Errors**: Verify your Supabase URL and key, and ensure the tables exist
- **Agent Communication Issues**: Make sure the Coral Server is running and the agent is connected to it
- **Rate Limiting**: If you encounter rate limiting issues with the Twitter API, adjust the frequency of mention checking
