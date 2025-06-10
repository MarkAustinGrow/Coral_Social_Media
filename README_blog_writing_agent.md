# Blog Writing Agent for Coral Protocol

This agent is responsible for creating blog content based on research and insights from tweets. It's part of a larger social media agentive system built on the Coral Protocol.

## Prerequisites

- Python 3.12.10
- Access to an OpenAI API key
- Access to an Anthropic API key
- Supabase account and project
- Qdrant vector database (local or cloud)

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

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_api_key_if_needed
```

### 2. Install Dependencies

Install the required Python packages:

```bash
pip install -r requirements.txt
```

### 3. Supabase Setup

Run the SQL commands in `supabase_schema.sql` in the Supabase SQL editor to create the necessary tables:
- `blog_posts` - for storing blog posts
- `engagement_metrics` - for storing topic engagement metrics

You can also uncomment and modify the sample data insertion statements to add some initial engagement metrics.

## Running the Agent

### 1. Start the Coral Server

First, start the Coral Server:

```bash
cd coral-server-master
./gradlew run
```

### 2. Run the Tweet Scraping and Research Agents

The Blog Writing Agent depends on insights gathered by the Tweet Research Agent, which in turn depends on tweets collected by the Tweet Scraping Agent, so make sure they're running:

```bash
python 2_langchain_tweet_scraping_agent.py
python 3_langchain_tweet_research_agent.py
```

### 3. Run the Blog Writing Agent

In a new terminal window, run:

```bash
python 4_langchain_blog_writing_agent.py
```

## How It Works

The Blog Writing Agent performs the following tasks:

1. **Topic Generation**: The agent:
   - Analyzes engagement metrics to identify popular topics
   - Searches for relevant tweet insights in Qdrant
   - Generates blog topics that align with high-engagement areas
   - Ensures topics are timely, relevant, and have SEO potential

2. **Content Creation**: The agent:
   - Uses Claude from Anthropic to write comprehensive blog posts
   - Incorporates insights from tweet research
   - Structures content with proper headings, formatting, and SEO optimization
   - Ensures content is engaging and informative

3. **Content Management**: The agent:
   - Saves blog posts to Supabase with appropriate metadata
   - Tracks blog post status (draft, review, published)
   - Notifies the Blog to Tweet Agent when new posts are created

4. **Agent Communication**: The agent can:
   - Receive instructions from other agents via the Coral Protocol
   - Process these instructions (e.g., write a blog post on a specific topic)
   - Send responses back to the requesting agents

## Agent Tools

The agent has the following tools:

1. `get_engagement_metrics`: Gets engagement metrics from Supabase to determine popular topics
2. `search_tweet_insights`: Searches for tweet insights in Qdrant based on a query
3. `get_recent_blog_posts`: Gets recent blog posts from Supabase
4. `generate_blog_topic`: Generates a blog topic based on engagement metrics and tweet insights
5. `write_blog_post`: Writes a blog post using Claude from Anthropic
6. `save_blog_post`: Saves a blog post to Supabase

## Extending the Agent

To extend the agent's functionality:

1. Add new tools by creating additional `@tool` decorated functions
2. Update the agent's prompt to include instructions for using the new tools
3. Add the new tools to the `agent_tools` list in the `main` function

## Troubleshooting

- **Anthropic API Errors**: Check your Anthropic API key and ensure you have the necessary permissions
- **Qdrant Errors**: Verify your Qdrant URL and ensure the service is running
- **Supabase Errors**: Verify your Supabase URL and key, and ensure the tables exist
- **Agent Communication Issues**: Make sure the Coral Server is running and the agent is connected to it
