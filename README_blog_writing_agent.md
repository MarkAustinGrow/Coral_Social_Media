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

### 2. Run the Tweet Scraping, Research, and Hot Topic Agents

The Blog Writing Agent depends on insights gathered by the Tweet Research Agent and engagement metrics from the Hot Topic Agent, which in turn depend on tweets collected by the Tweet Scraping Agent, so make sure they're running:

```bash
python 2_langchain_tweet_scraping_agent.py
python 3_langchain_tweet_research_agent.py
python 3.5_langchain_hot_topic_agent.py
```

### 3. Run the Blog Writing Agent

In a new terminal window, run:

```bash
python 4_langchain_blog_writing_agent.py
```

## How It Works

The Blog Writing Agent performs the following tasks:

1. **Topic Generation**: The agent:
   - Uses engagement metrics (populated by the Hot Topic Agent) to identify popular topics
   - Selects the highest-engagement topic (or filters by a specified topic area)
   - Searches for relevant tweet insights in Qdrant specifically related to the selected topic
   - Generates a blog topic that is directly focused on the selected high-engagement topic
   - Ensures topics are timely, relevant, and have SEO potential

2. **Content Creation**: The agent:
   - Uses Claude from Anthropic to write comprehensive blog posts
   - Directly incorporates specific insights and quotes from tweet research
   - Maintains focus on the selected high-engagement topic throughout the content
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

## Relationship with Hot Topic Agent

The Blog Writing Agent works in tandem with the Hot Topic Agent:

1. The Hot Topic Agent:
   - Analyzes tweets for engagement and extracts meaningful topics
   - Calculates engagement scores based on likes, retweets, and replies
   - Populates the `engagement_metrics` table with rich topic data

2. The Blog Writing Agent:
   - Consumes the engagement metrics data to identify trending topics
   - Uses these insights to generate relevant blog content
   - Focuses solely on content creation, while topic discovery is handled by the Hot Topic Agent

This separation of concerns allows each agent to specialize in its core functionality, resulting in a more robust and maintainable system.

## Extending the Agent

To extend the agent's functionality:

1. Add new tools by creating additional `@tool` decorated functions
2. Update the agent's prompt to include instructions for using the new tools
3. Add the new tools to the `agent_tools` list in the `main` function

## Recent Improvements

The Blog Writing Agent has been updated with the following improvements:

1. **Fixed Qdrant Vector Search**: Corrected the parameter name in the `search_tweet_insights` function to use `query_vector` instead of `vector`, ensuring proper retrieval of tweet insights from the Qdrant database.

2. **Enhanced Topic Focus**: Improved the agent's ability to select high-engagement topics and generate blog content that directly addresses these topics, resulting in more relevant and focused blog posts.

3. **Better Tweet Insight Integration**: The agent now successfully incorporates specific quotes and insights from tweets into the blog content, making the posts more data-driven and engaging.

4. **Improved Agent Communication**: Enhanced the agent's ability to create threads and send messages to other agents, particularly the Blog to Tweet Agent, facilitating better coordination in the social media pipeline.

## Future Improvements

The following improvements are planned for future updates:

1. **Update to Qdrant's `query_points` Method**: Replace the deprecated `search` method with the newer `query_points` method in the `search_tweet_insights` function to future-proof the agent against Qdrant API changes.

2. **Enhanced Error Handling**: Implement more robust error handling for API calls and database operations to improve the agent's resilience and reliability.

3. **Improved Thread Management**: Enhance the agent's ability to manage and track communication threads with other agents to prevent errors when sending messages.

4. **Performance Optimization**: Optimize the vector search operations to improve response time and reduce resource usage, particularly for large collections of tweet insights.

## Troubleshooting

- **Anthropic API Errors**: Check your Anthropic API key and ensure you have the necessary permissions
- **Qdrant Errors**: Verify your Qdrant URL and ensure the service is running
- **Supabase Errors**: Verify your Supabase URL and key, and ensure the tables exist
- **Agent Communication Issues**: Make sure the Coral Server is running and the agent is connected to it
- **LangChain Deprecation Warnings**: If you see deprecation warnings about OpenAIEmbeddings, ensure you're using the updated import from langchain_openai instead of langchain.embeddings
- **Tool Invocation Errors**: When calling tools within other tools, use the .invoke() method with a dictionary of parameters rather than direct function calls. For example:
  ```python
  # Correct way to call a tool from another tool
  result = some_tool.invoke({"param1": "value1", "param2": "value2"})
  
  # Incorrect way (will cause errors)
  result = some_tool(param1="value1", param2="value2")
  ```
- **Qdrant Vector Search Parameters**: When using Qdrant for vector search, make sure to use the correct parameter names:
  ```python
  # Correct method and parameters
  results = qdrant_client.search(
      collection_name="collection",
      query_vector=query_embedding,  # Use 'query_vector' parameter name
      limit=10
  )
  ```
  
  Note: The Qdrant client's `search` method is deprecated and will be removed in future versions. You may see this deprecation warning:
  ```
  DeprecationWarning: `search` method is deprecated and will be removed in the future. Use `query_points` instead.
  ```
  
  For future-proofing, consider updating to the `query_points` method, but be aware that the parameter names may differ.
- **Topic Relevance Issues**: If blog posts are being generated about topics unrelated to the engagement metrics, check that:
  1. The engagement_metrics table contains valid topics with engagement scores
  2. The `generate_blog_topic` function is correctly selecting the highest-engagement topic
  3. The prompt to the language model explicitly instructs it to focus on the selected topic
