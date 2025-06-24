# Coral Social Media Infrastructure - Codebase Documentation

This document provides a comprehensive overview of the Coral Social Media Infrastructure codebase, its architecture, components, and how they work together.

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [LangChain Agents](#langchain-agents)
5. [MCP Client Compatibility](#mcp-client-compatibility)
6. [Web Interface](#web-interface)
7. [State Management and Error Handling](#state-management-and-error-handling)
8. [Coral Protocol Integration](#coral-protocol-integration)
9. [Database Schema](#database-schema)
10. [Setup and Configuration](#setup-and-configuration)
11. [Development Workflow](#development-workflow)
12. [Troubleshooting](#troubleshooting)
13. [Future Enhancements](#future-enhancements)

## System Overview

The Coral Social Media Infrastructure is a comprehensive system that combines the Coral Protocol for agent orchestration with LangChain for creating specialized AI agents that handle various aspects of social media management. The system automates content creation, research, and engagement across social media platforms.

Key capabilities include:
- Automated tweet collection and analysis
- Content generation based on social media trends
- Tweet thread creation from blog content
- Automated replies to mentions and comments
- Scheduled posting of content
- Comprehensive web dashboard for monitoring and control

## Architecture

The system follows a modular architecture with three main layers:

1. **Agent Layer**: LangChain-based agents that perform specific tasks
2. **Orchestration Layer**: Coral Protocol server that manages agent communication
3. **Interface Layer**: Next.js web application for user interaction

```
┌─────────────────────────────────────────────────────────────┐
│                      Web Interface                          │
│  (Next.js, React, Tailwind CSS, shadcn/ui components)       │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Coral Protocol Server                     │
│  (Agent orchestration, thread management, message passing)  │
└───────┬───────────────────┬────────────────────┬────────────┘
        │                   │                    │
        ▼                   ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────────┐
│ Data Storage  │   │ LangChain     │   │ External Services │
│ (Supabase,    │◄──┤ Agents        │◄──┤ (Twitter API,     │
│  Qdrant)      │   │               │   │  OpenAI API)      │
└───────────────┘   └───────────────┘   └───────────────────┘
```

## Core Components

### Coral Protocol Server

Located in `coral-server-master/`, this is a Kotlin-based server that implements the Model Context Protocol (MCP) for agent orchestration. Key components include:

- **Thread Management**: Creates and manages conversation threads between agents
- **Message Passing**: Handles message routing between agents
- **Agent Registry**: Maintains a registry of available agents
- **MCP Tools**: Provides tools for agent interaction (e.g., `CreateThreadTool`, `SendMessageTool`)

### LangChain Integration

The system uses LangChain for creating and managing AI agents. The integration is handled through:

- **Interface Module** (`0_langchain_interface.py`): Provides base classes and utilities for LangChain agents
- **Agent Modules**: Individual Python modules for each specialized agent

### Database Layer

The system uses two database technologies:

- **Supabase**: PostgreSQL-based database for structured data (tweets, blogs, user settings)
- **Qdrant**: Vector database for semantic search and knowledge storage with the following capabilities:
  - **Enhanced Metadata Schema**: Structured payload format with standardized fields for improved searchability
  - **Macrobot Schema Alignment**: Compatibility with the macrobot schema for consistent data representation
  - **Multi-parameter Filtering**: Advanced search capabilities by topic, sentiment, author, and date
  - **Engagement Metrics**: Storage of engagement data (likes, retweets, replies) for relevance scoring
  - **Topic Categorization**: Automatic extraction and indexing of topics from content
  - **Sentiment Analysis**: Classification of content sentiment (positive, negative, neutral)
  - **Vector Embeddings**: OpenAI embeddings for semantic similarity search

## LangChain Agents

The system includes several specialized LangChain agents, each with a specific role:

### 1. Tweet Scraping Agent (`2_langchain_tweet_scraping_agent.py`)

Collects tweets from specified accounts and hashtags.

- **Inputs**: Twitter accounts, hashtags, search criteria
- **Outputs**: Structured tweet data stored in Supabase
- **Key Features**:
  - Rate limiting protection
  - Metadata extraction
  - Filtering based on engagement metrics

### 2. Tweet Research Agent (`3_langchain_tweet_research_agent_simple.py`)

Analyzes collected tweets to extract insights, identify patterns, and store enriched data in the Qdrant vector database.

- **Inputs**: Tweet collections from the Tweet Scraping Agent
- **Outputs**: Analysis reports, topic clusters, sentiment analysis, vector embeddings
- **Key Features**:
  - Automatic research question generation for focused analysis
  - In-depth content analysis using Perplexity API
  - Sentiment analysis (positive, negative, neutral)
  - Topic extraction and categorization
  - Engagement metrics calculation (based on likes, retweets, replies)
  - Enhanced metadata storage for improved searchability
  - Structured schema alignment with macrobot format
  - Advanced vector search with multi-parameter filtering
  - Persona-based analysis customization

### 3. Hot Topic Agent (`3.5_langchain_hot_topic_agent.py`)

Analyzes tweets for engagement and identifies trending topics.

- **Inputs**: Unprocessed tweets from the Tweet Scraping Agent
- **Outputs**: Topic engagement metrics, trending topic notifications
- **Key Features**:
  - Topic extraction using Claude AI
  - Engagement scoring based on likes, retweets, and replies
  - Topic categorization and subtopic tracking
  - Trending topic identification
  - Integration with Blog Writing Agent for content suggestions

### 4. Blog Writing Agent (`4_langchain_blog_writing_agent.py`)

Creates long-form content based on insights from the Tweet Research Agent.

- **Inputs**: Research reports, topic clusters
- **Outputs**: Complete blog posts with SEO optimization
- **Key Features**:
  - Structured content generation
  - SEO optimization
  - Multiple writing styles through persona configuration
  - Topic rotation system for content diversity
  - Engagement-based topic selection

### 5. Blog Critique Agent (`4_langchain_blog_critique_agent.py`)

Reviews and fact-checks blog content before publication.

- **Inputs**: Blog posts from the Blog Writing Agent
- **Outputs**: Critique reports, fact-checking results, and improvement suggestions
- **Key Features**:
  - Fact verification using Perplexity API
  - Content quality assessment
  - Logical flow and argument evaluation
  - Citation and source verification

### 6. Blog to Tweet Agent (`5_langchain_blog_to_tweet_agent.py`)

Converts blog posts into engaging tweet threads.

- **Inputs**: Blog posts from the Blog Writing Agent
- **Outputs**: Tweet threads ready for posting
- **Key Features**:
  - Content chunking for tweet-sized pieces
  - Narrative flow maintenance
  - Hashtag optimization
  - Duplicate tweet prevention
  - Community-focused final tweets
  - Persona-based content generation

### 7. X Reply Agent (`6_langchain_x_reply_agent.py`)

Generates and posts replies to tweets and mentions.

- **Inputs**: Mentions and relevant conversations
- **Outputs**: Contextually appropriate replies
- **Key Features**:
  - Priority-based reply generation
  - Brand voice consistency
  - Escalation for complex inquiries

### 8. Twitter Posting Agent (`7_langchain_twitter_posting_agent_v3.py`)

Handles the scheduling and posting of tweets and threads.

- **Inputs**: Tweet content, scheduling parameters
- **Outputs**: Posted tweets with tracking information
- **Key Features**:
  - Scheduling optimization
  - Media attachment support
  - Performance monitoring
  - Twitter API v2 integration with OAuth 1.0a
  - Rate limiting protection
  - Thread posting with proper sequencing

## Agent Status Summary

**All 8 Agents Currently Working (100% Operational):**
- ✅ Tweet Scraping Agent - Collecting tweets from specified accounts
- ✅ Tweet Research Agent - Analyzing tweets and storing insights in Qdrant
- ✅ Hot Topic Agent - Identifying trending topics and engagement metrics
- ✅ Blog Writing Agent - Creating long-form content based on research
- ✅ Blog Critique Agent - Fact-checking and reviewing blog content
- ✅ Blog to Tweet Agent - Converting blog posts into tweet threads
- ✅ X Reply Agent - Generating and posting replies to mentions
- ✅ Twitter Posting Agent v3 - Scheduling and posting tweets/threads

## MCP Client Compatibility

The system has been updated to ensure compatibility with the latest version of langchain-mcp-adapters (0.1.0+). This section documents the important changes made to maintain agent communication through the Coral MCP server.

### MCP Client Pattern Update

**Previous Pattern (Deprecated):**
```python
# OLD - No longer supported
async with MultiServerMCPClient(
    connections={
        "coral": {
            "transport": "sse",
            "url": MCP_SERVER_URL,
            "timeout": 300,
            "sse_read_timeout": 300,
        }
    }
) as client:
    tools = client.get_tools() + agent_tools
```

**New Pattern (Current):**
```python
# NEW - Compatible with langchain-mcp-adapters 0.1.0+
client = MultiServerMCPClient(
    connections={
        "coral": {
            "transport": "sse",
            "url": MCP_SERVER_URL,
            "timeout": 300,
            "sse_read_timeout": 300,
        }
    }
)

# Get Coral tools using the new pattern
coral_tools = await client.get_tools()

# Combine Coral tools with agent-specific tools
tools = coral_tools + agent_tools
```

### Import Updates

Several agents required import updates to use the correct LangChain modules:

**Updated Imports:**
```python
# Correct import for OpenAI embeddings
from langchain_openai import OpenAIEmbeddings

# Instead of the deprecated:
# from langchain_community.embeddings import OpenAIEmbeddings
```

### Affected Files

The following agent files were updated with the new MCP client pattern:

1. `2_langchain_tweet_scraping_agent_simple.py`
2. `3_langchain_tweet_research_agent_simple.py`
3. `3.5_langchain_hot_topic_agent_simple.py`
4. `4_langchain_blog_critique_agent.py`
5. `4_langchain_blog_writing_agent.py`
6. `5_langchain_blog_to_tweet_agent.py`
7. `6_langchain_x_reply_agent_simple.py`
8. `7_langchain_twitter_posting_agent_v3.py`

### Virtual Environment Requirements

**Important:** All agents must be run in the `coral_env` virtual environment to ensure proper dependency management:

```bash
# Activate the virtual environment
coral_env\Scripts\activate

# Then run any agent
python 3_langchain_tweet_research_agent_simple.py
```

### Compatibility Notes

- **langchain-mcp-adapters**: Version 0.1.0+ required
- **Context Manager**: No longer supported for MultiServerMCPClient
- **Tool Access**: Must use `await client.get_tools()` pattern
- **Error Handling**: Improved error handling for MCP connection issues

### Testing MCP Compatibility

To verify MCP client compatibility:

1. **Check Connection**: Agents should successfully connect to Coral server
2. **Tool Access**: Agents should be able to access Coral tools (wait_for_mentions, send_message)
3. **Agent Communication**: Agents should be able to send and receive messages through threads
4. **No Context Manager Errors**: No "NotImplementedError" related to context manager usage

## Web Interface

The web interface is built with Next.js, React, and Tailwind CSS with shadcn/ui components. It's organized as follows:

### Directory Structure

```
Web_Interface/
├── app/                  # Next.js app router pages
│   ├── accounts/         # Account management
│   ├── blogs/            # Blog content management
│   ├── calendar/         # Content calendar
│   ├── config/           # System configuration
│   ├── logs/             # System logs
│   ├── metrics/          # Performance metrics
│   ├── persona/          # Persona management
│   ├── setup/            # Setup wizard
│   └── tweets/           # Tweet management
├── components/           # Reusable React components
│   ├── setup-steps/      # Setup wizard steps
│   ├── ui/               # UI components (shadcn/ui)
│   └── ...               # Other components
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
├── public/               # Static assets
└── styles/               # Global styles
```

### Key Pages

- **Dashboard** (`app/page.tsx`): Main dashboard with system overview
- **Setup Wizard** (`app/setup/page.tsx`): Multi-step configuration wizard
- **Logs** (`app/logs/page.tsx`): System logs and activity monitoring
- **Config** (`app/config/page.tsx`): System configuration management
- **Persona** (`app/persona/page.tsx`): Persona management for content generation
- **Calendar** (`app/calendar/page.tsx`): Content scheduling calendar
- **Accounts** (`app/accounts/page.tsx`): Twitter account management
- **Debug** (`app/debug/page.tsx`): System debugging tools

### Setup Wizard

The setup wizard (`app/setup/page.tsx` and `components/setup-wizard.tsx`) guides users through the initial configuration process:

1. **Welcome**: Introduction and overview
2. **API Keys**: Configuration of external service credentials
   - **OpenAI**: API key for content generation
   - **AI Services**: Perplexity and Anthropic API keys for fact-checking and advanced reasoning
   - **Twitter**: API credentials for social media interaction
3. **Database**: Database connection setup
4. **Agent Configuration**: Agent selection and settings
5. **Persona**: Content style and tone configuration
6. **Finish**: Review and completion

### Account Management

The account management system (`app/accounts/page.tsx` and related components) provides functionality for managing Twitter accounts:

- **Account List** (`components/account-list.tsx`): Displays and manages monitored Twitter accounts
- **Add Account Dialog** (`components/add-account-dialog.tsx`): Interface for adding new accounts to monitor
- **Import Followed Accounts**: Functionality to import accounts the user follows on Twitter
- **Account Prioritization**: Ability to set priority levels for different accounts
- **Account Status**: Tracking of when account data was last fetched

The account management system integrates with Supabase for data storage and the Twitter API for account information retrieval.

### Debug Tools

The debug tools (`app/debug/page.tsx` and related components) provide functionality for troubleshooting the application:

- **Supabase Debug** (`components/supabase-debug.tsx`): Tests connection to Supabase and displays account data
- **API Endpoint** (`app/api/debug/supabase/route.ts`): Backend support for Supabase connection testing
- **Error Visualization**: Clear display of connection errors and troubleshooting information

### Memory Dashboard

The memory dashboard (`app/memory/page.tsx` and related components) provides a comprehensive interface for accessing and managing the knowledge stored in the Qdrant vector database:

- **Memory Dashboard** (`components/memory-dashboard.tsx`): Main interface for searching, filtering, and browsing stored knowledge with the following features:
  - **Advanced Search**: Full-text search across tweet content, analysis, topics, and related entities
  - **Multi-parameter Filtering**: Filter by topic, sentiment, persona, and date range
  - **Detailed Memory View**: Dialog with comprehensive display of memory content and metadata
  - **Memory Management**: Delete individual memories when they're no longer needed
  - **Data Export**: Export search results as JSON for external analysis or backup
  - **Pagination**: Load more results with automatic offset tracking
  - **Responsive Design**: Optimized for both desktop and mobile viewing

- **API Endpoints**:
  - **Collection Management** (`app/api/qdrant-collections/route.ts`): Manages Qdrant collections
  - **Memory Retrieval** (`app/api/qdrant-memory/route.ts`): Retrieves stored memories with advanced filtering options and field mapping
  - **Memory Detail** (`app/api/qdrant-memory/[id]/route.ts`): Retrieves detailed information about specific memories

- **Data Integration**:
  - **Macrobot Schema Compatibility**: Automatically maps between the macrobot schema and the UI display format
  - **Field Mapping**: Intelligently maps between different field names (e.g., "tags" to "topics", "alignment_explanation" to "analysis")
  - **Fallback Handling**: Provides sample data when Qdrant is unavailable or returns no results
  - **Error Handling**: Graceful error handling with informative messages

- **Memory Data Model** (`hooks/use-memory-data.ts`):
  - **Structured Types**: TypeScript interfaces for memory data and filter parameters
  - **Custom React Hooks**: Encapsulated data fetching logic with loading, error, and pagination states
  - **Client-side Filtering**: Additional filtering capabilities beyond what the Qdrant API provides
  - **Memory Management**: Functions for searching, loading more, and deleting memories

- **Memory Display**:
  - **Tabular View**: Compact table showing key memory attributes
  - **Detail Dialog**: Comprehensive view of all memory data including:
    - Original tweet content
    - Analysis from Perplexity API
    - Topics and related entities
    - Sentiment analysis
    - Persona information
    - Confidence scores
    - Engagement metrics (likes, retweets, replies)
    - Metadata including author and timestamps
  - **Visual Indicators**: Color-coded badges for sentiment and topics

## Agent Status Monitoring

The system includes a comprehensive agent status monitoring system that tracks the health and activity of all agents. This system helps identify and fix issues with agents that may become stuck or unresponsive. The "Start All Agents" functionality includes a 2-second delay between each agent startup to prevent system overload and ensure proper status registration.

### Agent Status Table

The `agent_status` table in the Supabase database stores the current status of each agent:

```sql
CREATE TABLE agent_status (
  id SERIAL PRIMARY KEY,
  agent_name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'stopped',
  health INTEGER NOT NULL DEFAULT 0,
  last_heartbeat TIMESTAMPTZ,
  last_error TEXT,
  last_activity TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Each agent updates its status in this table as it runs, providing real-time information about its health and activity.

### Agent Status Updater

The `agent_status_updater.py` module provides functions for agents to update their status:

- `mark_agent_started(agent_name)`: Mark an agent as started
- `mark_agent_stopped(agent_name)`: Mark an agent as stopped
- `update_agent_status(agent_name, status, health, last_activity)`: Update an agent's status
- `send_heartbeat(agent_name)`: Send a heartbeat to indicate the agent is still running
- `report_error(agent_name, error_message)`: Report an error
- `report_warning(agent_name, warning_message, health)`: Report a warning

### Agent Status Monitoring Tools

The system includes several tools for monitoring and fixing agent status issues:

1. **Agent Status Lock** (`agent_status_lock.py`): A utility for manually controlling agent statuses
   - `force_agent_status(agent_name, status, health, last_activity)`: Force an agent's status
   - `get_agent_status(agent_name)`: Get the current status of an agent
   - `list_all_agents()`: List all agents and their statuses

2. **Agent Status Monitor** (`agent_status_monitor.py`): A service that continuously monitors agent statuses
   - Automatically detects agents that are stuck in the "running" state
   - Checks if agent processes are actually running
   - Monitors for agents that have been inactive for too long
   - Automatically fixes agent statuses when issues are detected

3. **Fix Agent Status** (`fix_agent_status.py`): A simple script for manually fixing agent statuses

### Known Issues and Workarounds

#### Agent Status Visibility Issue

There was a situation where the Tweet Scraping Agent appeared to be stuck in the "running" state in the database, but was actually running properly in a background window. This created a discrepancy between the actual agent state and what was displayed in the web interface.

The issue was primarily about visibility and process management rather than the agent being truly stuck:

1. The agent was running in a background window that wasn't immediately visible
2. Attempts to stop the agent through the web interface were ineffective because the process was still running
3. The database showed the agent as "running" (which was technically correct), but the web interface couldn't properly manage it

**Tools for Managing Agent Status:**

1. **Manual Status Control**: Use the `agent_status_lock.py` utility to view or force an agent's status:
   ```bash
   # View all agent statuses
   python agent_status_lock.py
   
   # Force an agent's status
   python agent_status_lock.py "Tweet Scraping Agent" stopped 0
   ```

2. **Process Monitoring**: Run the `agent_status_monitor.py` script as a background service:
   ```bash
   # On Windows (PowerShell):
   Start-Process -NoNewWindow python -ArgumentList "agent_status_monitor.py"
   ```
   This script monitors agent processes and ensures their database status accurately reflects their actual running state.

3. **Process Verification**: Before starting any agents, check if they're already running in the background:
   ```bash
   # On Windows
   tasklist | findstr python
   
   # On Linux/Mac
   ps aux | grep python
   ```

These tools help maintain consistency between the actual running state of agents and their representation in the database and web interface.

## State Management and Error Handling

The system implements robust state management and error handling to provide a better user experience, especially when dealing with database connections and external services.

### DataState Component

The `DataState` component (`components/ui/data-state.tsx`) provides a standardized way to handle different states in data-fetching components:

- **Loading State**: Shows loading skeletons or spinners while data is being fetched
- **Error State**: Displays error messages with details and retry options
- **Empty State**: Shows appropriate messaging when no data is available
- **Data State**: Renders the actual data when successfully fetched

This component is used throughout the dashboard to provide consistent error handling and loading states.

### Supabase Integration

The Supabase integration is handled through several key components:

- **Supabase Client** (`lib/supabase.ts`): Creates and manages the Supabase client instance with robust error handling
- **Environment Variable Loader** (`lib/env-loader.ts`): Loads environment variables from the root `.env` file
- **API Endpoint** (`app/api/env/route.ts`): Provides environment variables to client-side code
- **Database Hooks** (`hooks/use-supabase-data.ts`): Custom React hooks for data fetching with proper state management
- **Fallback Data Handling**: Support for fallback data when Supabase is not available
- **Connection Testing**: Tools for testing and debugging Supabase connections

The system now includes enhanced error handling for Supabase operations, with clear error messages and recovery options. The `useSupabaseData` hook provides a standardized way to fetch data with proper loading, error, and empty states.

### Environment Variable Management

The system uses a multi-layered approach to environment variable management:

1. **Root `.env` File**: Primary source of configuration, created by the setup wizard
2. **API Endpoint**: Server-side API that securely provides environment variables to client-side code
3. **Environment Loader**: Utility that reads and parses the `.env` file on the server side
4. **Configuration Saving**: API endpoint (`app/api/save-config/supabase/route.ts`) for updating the `.env` file

### Error Handling in Dashboard Components

Dashboard components implement comprehensive error handling:

- **Stats Cards** (`components/stats-cards.tsx`): Shows error states for database statistics
- **System Status Panel** (`components/system-status-panel.tsx`): Displays system status with error handling
- **Recent Activity** (`components/recent-activity.tsx`): Shows activity feed with proper error states
- **Account List** (`components/account-list.tsx`): Handles database connection errors gracefully
- **Supabase Debug** (`components/supabase-debug.tsx`): Provides detailed error information for troubleshooting

Each component uses the `DataState` component to handle loading, error, and empty states consistently. The system now includes more sophisticated error recovery mechanisms and clearer error messaging for users.

## Coral Protocol Integration

The system integrates with the Coral Protocol through:

1. **Agent Registration**: Each LangChain agent registers with the Coral server
2. **Thread Creation**: Agents create threads for specific tasks
3. **Message Passing**: Agents communicate by sending messages through threads
4. **Tool Usage**: Agents use MCP tools provided by the Coral server

Key integration files:
- `0_langchain_interface.py`: Base integration with Coral Protocol
- `coral-server-master/src/main/kotlin/org/coralprotocol/coralserver/server/CoralServer.kt`: Server implementation

## Database Schema

The system uses Supabase for structured data storage. The schema is defined in `supabase_schema.sql` and includes:

### Main Tables

- **tweets**: Stores collected tweets with metadata
- **tweets_cache**: Stores collected tweets for processing by the Hot Topic Agent
- **engagement_metrics**: Stores topic engagement metrics tracked by the Hot Topic Agent
- **blogs**: Stores generated blog content
- **tweet_threads**: Stores generated tweet threads
- **x_accounts**: Stores monitored Twitter accounts with priority and status information
- **agent_logs**: Stores agent activity logs
- **system_config**: Stores system configuration
- **personas**: Stores content generation personas

### Relationships

- Tweets belong to accounts (x_accounts)
- Blog posts are based on tweet research
- Tweet threads are based on blog posts
- Agent logs reference specific agents and actions

## Setup and Configuration

The system uses a multi-step setup process:

1. **Environment Variables**: Defined in `.env` file (template in `.env.sample`)
2. **Setup Wizard**: Web-based configuration wizard
3. **Configuration Storage**: Stored in browser localStorage and Supabase

### Environment Variable Management

The system now uses a centralized approach to environment variables:

1. **Root `.env` File**: All configuration is stored in a single `.env` file at the root of the project
2. **Setup Wizard Integration**: The setup wizard writes directly to the root `.env` file
3. **Web Interface Access**: The web interface accesses the root `.env` file through a secure API endpoint
4. **Cross-Component Access**: Both Python agents and the Next.js web interface read from the same configuration source

### Configuration API

The system includes API endpoints for managing configuration:

- **`/api/env`**: Retrieves environment variables for client-side use
- **`/api/save-config/supabase`**: Updates Supabase configuration in the root `.env` file
- **`/api/save-config`**: General configuration saving endpoint

### Key Configuration Parameters

The system requires several key configuration parameters:

- **API Keys**:
  - OpenAI API key for content generation
  - Perplexity API key for fact-checking and research
  - Anthropic API key for advanced reasoning and analysis
  - Twitter API credentials for social media interaction
  - Supabase credentials for database access

- **Database Configuration**:
  - Supabase URL and API key
  - Connection pooling settings
  - Qdrant vector database settings

- **Agent Settings**:
  - Enabled/disabled status for each agent
  - Scheduling parameters
  - Concurrency limits

- **Persona Configuration**:
  - Name and description
  - Tone and style parameters
  - Content preferences

## Development Workflow

### Running the System

1. Start the Coral server:
   ```
   cd coral-server-master
   ./gradlew run
   ```

2. Start the web interface:
   ```
   cd Web_Interface
   npm run dev
   ```

3. Run individual agents:
   ```
   python 2_langchain_tweet_scraping_agent.py
   ```

### Git Branches

The project uses Git for version control with several branches:

- **main**: Stable production-ready code
- **Macro**: Branch for the Macro Economics persona implementation
- **supabase-integration**: Branch for Supabase integration and error handling improvements

To work with the Supabase integration branch:

```bash
git checkout supabase-integration
cd Web_Interface
npm install --legacy-peer-deps
npm run dev
```

### Adding New Agents

1. Create a new agent file following the pattern of existing agents
2. Implement the required methods from the base classes in `0_langchain_interface.py`
3. Register the agent with the Coral server
4. Update the web interface to include the new agent

### Modifying the Web Interface

The web interface follows Next.js conventions:
- Pages are in the `app/` directory
- Components are in the `components/` directory
- Global styles are in `styles/globals.css`
- Utility functions are in `lib/utils.ts`

### Working with Supabase

When working with Supabase:

1. Ensure the root `.env` file contains valid Supabase credentials
2. Use the `useSupabaseData` hook for data fetching with proper error handling
3. Wrap components with the `DataState` component to handle loading, error, and empty states
4. Test error states by temporarily using invalid credentials

Example usage of the `DataState` component:

```tsx
<DataState
  isLoading={isLoading}
  error={error}
  data={data}
  onRetry={handleRefresh}
>
  {(data) => (
    // Render your component with the data
  )}
</DataState>
```

## Troubleshooting

This section provides solutions to common issues encountered when running the Coral Social Media Infrastructure system.

### MCP Client Issues

**Problem**: `NotImplementedError: As of langchain-mcp-adapters 0.1.0, MultiServerMCPClient cannot be used as a context manager`

**Solution**: Update the agent to use the new MCP client pattern:
```python
# Replace this pattern:
async with MultiServerMCPClient(...) as client:

# With this pattern:
client = MultiServerMCPClient(...)
coral_tools = await client.get_tools()
```

### Import Errors

**Problem**: `ModuleNotFoundError: No module named 'langchain_community'`

**Solution**: Update imports to use the correct LangChain modules:
```python
# Use this:
from langchain_openai import OpenAIEmbeddings

# Instead of:
from langchain_community.embeddings import OpenAIEmbeddings
```

**Problem**: `ModuleNotFoundError: No module named 'supabase'`

**Solution**: Ensure you're running in the correct virtual environment:
```bash
# Activate the coral_env virtual environment
coral_env\Scripts\activate

# Then run the agent
python your_agent.py
```

### Virtual Environment Issues

**Problem**: Agents fail to start due to missing dependencies

**Solution**: 
1. Always activate the `coral_env` virtual environment before running agents
2. Verify the environment has all required packages installed
3. If packages are missing, install them in the activated environment:
```bash
coral_env\Scripts\activate
pip install -r requirements.txt
```

### Agent Communication Issues

**Problem**: Agents can't communicate through Coral MCP server

**Solution**:
1. Verify the Coral server is running: `cd coral-server-master && ./gradlew run`
2. Check that agents are using the correct MCP server URL
3. Ensure agents are properly registered with the Coral server
4. Verify no firewall is blocking localhost:5555

### Database Connection Issues

**Problem**: Agents can't connect to Supabase or Qdrant

**Solution**:
1. Verify environment variables are set correctly in the `.env` file
2. Test database connections using the debug tools in the web interface
3. Check network connectivity to external services
4. Verify API keys and credentials are valid

### Agent Status Issues

**Problem**: Agents appear stuck in "running" state

**Solution**:
1. Check if the agent process is actually running:
```bash
# Windows
tasklist | findstr python

# Linux/Mac
ps aux | grep python
```

2. Use the agent status tools to manually fix status:
```bash
# View all agent statuses
python agent_status_lock.py

# Force an agent's status
python agent_status_lock.py "Agent Name" stopped 0
```

3. Run the agent status monitor to automatically detect and fix issues:
```bash
python agent_status_monitor.py
```

### Twitter API Issues

**Problem**: Twitter API authentication failures

**Solution**:
1. Verify all Twitter API credentials are set in the `.env` file
2. Ensure the Twitter app has the correct permissions (read/write)
3. Check that API keys haven't expired or been revoked
4. Verify rate limits haven't been exceeded

### Performance Issues

**Problem**: Agents running slowly or timing out

**Solution**:
1. Check API rate limits for external services (OpenAI, Perplexity, Twitter)
2. Verify database connections aren't being throttled
3. Monitor system resources (CPU, memory, network)
4. Consider adjusting timeout values in agent configurations

### Web Interface Issues

**Problem**: Web interface shows connection errors

**Solution**:
1. Verify the `.env` file exists and contains valid configuration
2. Check that the web interface can access the API endpoints
3. Use the debug tools to test individual service connections
4. Restart the web interface development server

### Common Error Messages

**Error**: `HTTP Request: POST ... "HTTP/2 429 Too Many Requests"`
**Solution**: API rate limit exceeded. Wait for the rate limit to reset or implement rate limiting in the agent.

**Error**: `Connection refused to localhost:5555`
**Solution**: Coral MCP server is not running. Start it with `cd coral-server-master && ./gradlew run`

**Error**: `Invalid API key`
**Solution**: Check that API keys in the `.env` file are correct and haven't expired.

### Getting Help

If you encounter issues not covered in this troubleshooting guide:

1. Check the agent logs in the web interface for detailed error messages
2. Review the console output when running agents directly
3. Use the debug tools in the web interface to test individual components
4. Verify all dependencies are installed and up to date

## Future Enhancements

Planned enhancements for the system include:

1. **Authentication**: User authentication and multi-user support
2. **Advanced Analytics**: Enhanced metrics and performance tracking
3. **Content Approval Workflow**: Human-in-the-loop approval for generated content
4. **Additional Platforms**: Support for more social media platforms beyond Twitter
5. **Enhanced Personalization**: More advanced persona configuration
6. **API Endpoints**: REST API for external integration
7. **Enhanced Account Management**: More sophisticated account prioritization and filtering
8. **Offline Mode**: Support for working without database connectivity
9. **Real-time Updates**: WebSocket integration for live data updates
10. **Comprehensive Testing**: Automated tests for error states and edge cases
11. **Advanced Debugging Tools**: More sophisticated debugging and troubleshooting capabilities

---

This documentation provides a high-level overview of the Coral Social Media Infrastructure codebase. For more detailed information on specific components, refer to the individual README files and code documentation.
