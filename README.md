# Coral Social Media Infrastructure

A comprehensive social media management system built on the Coral Protocol, featuring LangChain agents for automated content creation, research, and engagement.

## Project Overview

This project combines the Coral Protocol for agent orchestration with LangChain for creating specialized AI agents that handle various aspects of social media management. The system includes:

1. A set of specialized LangChain agents for different social media tasks
2. A modern web interface for monitoring and controlling the agents
3. Integration with the Coral Protocol for agent communication and coordination

## Components

### LangChain Agents

<details>
<summary><b>Tweet Scraping Agent</b></summary>

The Tweet Scraping Agent is responsible for collecting tweets from specified accounts and hashtags. It:

- Monitors specified Twitter accounts and hashtags in real-time
- Filters tweets based on configurable criteria (engagement metrics, keywords, etc.)
- Extracts metadata including engagement statistics, posting time, and user information
- Stores collected tweets in the database for further processing
- Provides rate limiting protection to avoid Twitter API restrictions
- Supports scheduled scraping at configurable intervals
- Handles pagination and historical tweet collection

**Technologies used:**
- Twitter API v2
- LangChain for orchestration
- Qdrant for vector storage of tweet embeddings
- Supabase for structured data storage

</details>

<details>
<summary><b>Tweet Research Agent</b></summary>

The Tweet Research Agent analyzes collected tweets to extract insights and identify patterns. It:

- Performs sentiment analysis on tweet content
- Identifies key topics and themes using NLP techniques
- Tracks engagement patterns and trending topics
- Generates embeddings for semantic search capabilities
- Creates summaries of tweet collections
- Identifies influential accounts and potential collaboration opportunities
- Analyzes hashtag effectiveness and reach
- Provides competitive analysis of similar accounts

**Technologies used:**
- OpenAI embeddings for semantic analysis
- Qdrant for vector search
- LangChain for agent orchestration
- NLP libraries for text analysis
- Supabase for data storage

</details>

<details>
<summary><b>Blog Writing Agent</b></summary>

The Blog Writing Agent creates long-form content based on insights from the Tweet Research Agent. It:

- Generates complete blog posts based on trending topics and tweet insights
- Structures content with proper headings, paragraphs, and formatting
- Incorporates relevant statistics and data points from tweet analysis
- Optimizes content for SEO with appropriate keywords
- Creates engaging titles and meta descriptions
- Generates accompanying images using AI image generation (optional)
- Supports multiple writing styles and tones through persona configuration
- Allows for human review and editing before publication

**Technologies used:**
- OpenAI GPT models for content generation
- LangChain for orchestration and prompt management
- Supabase for content storage
- Markdown for content formatting
- SEO optimization libraries

</details>

<details>
<summary><b>Blog to Tweet Agent</b></summary>

The Blog to Tweet Agent converts long-form blog content into engaging tweet threads. It:

- Breaks down blog posts into tweet-sized chunks
- Maintains narrative flow across the thread
- Optimizes each tweet for engagement
- Adds appropriate hashtags and mentions
- Creates engaging hooks for the first tweet
- Includes calls-to-action in the thread
- Generates thread maps for longer threads
- Schedules threads for optimal posting times
- Supports media attachment suggestions

**Technologies used:**
- LangChain for content processing
- OpenAI models for content optimization
- Twitter API for posting (optional)
- Supabase for storing thread content
- Scheduling algorithms for timing optimization

</details>

<details>
<summary><b>X Reply Agent</b></summary>

The X Reply Agent generates and posts replies to tweets, focusing on engagement and community building. It:

- Monitors mentions and relevant conversations
- Generates contextually appropriate replies
- Maintains consistent brand voice and persona
- Prioritizes replies based on account influence and engagement potential
- Handles common questions with templated responses
- Escalates complex inquiries to human operators
- Tracks reply performance and engagement
- Adapts tone based on the conversation context
- Supports multiple languages

**Technologies used:**
- Twitter API for monitoring and posting
- OpenAI models for response generation
- LangChain for orchestration
- Sentiment analysis for context awareness
- Supabase for tracking conversations

</details>

<details>
<summary><b>Twitter Posting Agent</b></summary>

The Twitter Posting Agent handles the scheduling and posting of tweets and threads. It:

- Manages a content calendar of scheduled posts
- Optimizes posting times based on audience activity
- Handles posting of single tweets and threads
- Supports media attachments (images, videos, polls)
- Provides posting confirmation and status updates
- Reschedules failed posts automatically
- Monitors post performance after publishing
- Supports recurring post schedules
- Integrates with content approval workflows

**Technologies used:**
- Twitter API for posting
- Scheduling algorithms for timing optimization
- LangChain for orchestration
- Supabase for content and schedule storage
- Analytics tools for performance tracking

</details>

### Web Interface

A Next.js-based dashboard with:

- Agent status monitoring
- Log viewing and filtering
- System configuration
- Persona management
- Engagement metrics and analytics
- Content calendar and scheduling

### Coral Protocol Integration

The system leverages the Coral Protocol for:

- Agent communication
- Thread management
- Message passing
- Orchestration of complex workflows

## Getting Started

### Prerequisites

- Node.js 18+ for the web interface
- Python 3.10+ for the LangChain agents
- Java 17+ for the Coral Protocol server

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/MarkAustinGrow/Coral_Social_Media.git
   cd Coral_Social_Media
   ```

2. Install dependencies for the web interface:
   ```
   cd Web_Interface
   npm install
   ```

3. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   ```
   cp .env.sample .env
   # Edit .env with your API keys and configuration
   ```

5. Start the Coral server:
   ```
   cd coral-server-master
   ./gradlew run
   ```

6. Start the web interface:
   ```
   cd Web_Interface
   npm run dev
   ```

## Architecture

The system follows a modular architecture where:

1. LangChain agents handle specific tasks and communicate through the Coral Protocol
2. The Coral server orchestrates agent interactions and manages threads
3. The web interface provides monitoring and control capabilities

## Database Schema

The system uses Supabase for data storage with the following main tables:

- Tweets
- Blogs
- Accounts
- Engagement metrics
- Agent logs
- System configuration

See `supabase_schema.sql` for the complete database schema.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
