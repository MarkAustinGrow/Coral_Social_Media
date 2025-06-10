# Tweet Research Agent for Coral Protocol

This agent is responsible for analyzing tweets, extracting insights, and storing them for future reference. It's part of a larger social media agentive system built on the Coral Protocol.

## Prerequisites

- Python 3.12.10
- Access to an OpenAI API key
- Perplexity API key
- Supabase account and project
- Qdrant vector database (local or cloud)

## Setup

### 1. Environment Variables

Ensure your `.env` file includes the following variables:

```
# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# Perplexity API
PERPLEXITY_API_KEY=your_perplexity_api_key

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

1. Run the SQL commands in `supabase_schema.sql` in the Supabase SQL editor to create the necessary tables
2. Ensure Qdrant is running (the agent will automatically create the required collection if it doesn't exist)

## Running the Agent

### 1. Start the Coral Server

First, start the Coral Server:

```bash
cd coral-server-master
./gradlew run
```

### 2. Run the Tweet Scraping Agent

The Tweet Research Agent depends on tweets collected by the Tweet Scraping Agent, so make sure it's running:

```bash
python 2_langchain_tweet_scraping_agent.py
```

### 3. Run the Tweet Research Agent

In a new terminal window, run:

```bash
python 3_langchain_tweet_research_agent.py
```

## How It Works

The Tweet Research Agent performs the following tasks:

1. **Tweet Analysis**: The agent:
   - Fetches unanalyzed tweets from Supabase
   - Generates research questions for each tweet
   - Uses Perplexity to analyze the tweet content based on these questions
   - Extracts insights about main topics, key claims, context, and implications
   - Stores the analysis in Qdrant as vector embeddings for semantic search
   - Marks the tweets as analyzed in Supabase
   - Notifies the Blog Writing Agent if interesting insights are found

2. **Semantic Search**: The agent can:
   - Search for similar insights in Qdrant using semantic similarity
   - Retrieve relevant tweet analyses based on queries
   - Provide context and background information for content generation

3. **Agent Communication**: The agent can:
   - Receive instructions from other agents via the Coral Protocol
   - Process these instructions (e.g., analyze specific tweets, search for insights)
   - Send responses back to the requesting agents

## Agent Tools

The agent has the following tools:

1. `fetch_tweets_from_supabase`: Fetches tweets from Supabase that need analysis
2. `mark_tweet_as_analyzed`: Marks tweets as analyzed in Supabase
3. `analyze_tweet_perplexity`: Uses Perplexity to analyze tweet content
4. `store_analysis_qdrant`: Stores tweet analysis in Qdrant vector database
5. `search_qdrant`: Searches for similar insights in Qdrant
6. `generate_research_questions`: Generates research questions for a tweet

## Extending the Agent

To extend the agent's functionality:

1. Add new tools by creating additional `@tool` decorated functions
2. Update the agent's prompt to include instructions for using the new tools
3. Add the new tools to the `agent_tools` list in the `main` function

## Troubleshooting

- **Perplexity API Errors**: Check your Perplexity API key and ensure you have the necessary permissions
- **Qdrant Errors**: Verify your Qdrant URL and ensure the service is running
- **Supabase Errors**: Verify your Supabase URL and key, and ensure the tables exist
- **Agent Communication Issues**: Make sure the Coral Server is running and the agent is connected to it
