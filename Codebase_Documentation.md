# Coral Social Media Infrastructure - Codebase Documentation

This document provides a comprehensive overview of the Coral Social Media Infrastructure codebase, its architecture, components, and how they work together.

## Table of Contents

1. [System Overview](#system-overview)
2. [Deployment Environment](#deployment-environment)
3. [Architecture](#architecture)
4. [Core Components](#core-components)
5. [LangChain Agents](#langchain-agents)
6. [MCP Client Compatibility](#mcp-client-compatibility)
7. [Web Interface](#web-interface)
8. [State Management and Error Handling](#state-management-and-error-handling)
9. [Coral Protocol Integration](#coral-protocol-integration)
10. [Database Schema](#database-schema)
11. [Setup and Configuration](#setup-and-configuration)
12. [Development Workflow](#development-workflow)
13. [Troubleshooting](#troubleshooting)
14. [Future Enhancements](#future-enhancements)

## System Overview

The Coral Social Media Infrastructure is a comprehensive **multiuser system** that combines the Coral Protocol for agent orchestration with LangChain for creating specialized AI agents that handle various aspects of social media management. The system has been enhanced with a robust authentication system and multiuser support, allowing multiple users to manage their own social media automation workflows.

Key capabilities include:
- **Multiuser Authentication**: Secure user registration, login, and session management
- **Tenant-based Data Isolation**: Each user's data is securely isolated using Row Level Security (RLS)
- **User Profile Management**: Comprehensive user profile system with customizable settings
- Automated tweet collection and analysis
- Content generation based on social media trends
- Tweet thread creation from blog content
- Automated replies to mentions and comments
- Scheduled posting of content
- Comprehensive web dashboard for monitoring and control
- **Secure API Endpoints**: Protected API routes with user authentication
- **Real-time Session Management**: Automatic session handling and refresh

## Deployment Environment

The Coral Social Media Infrastructure is deployed on a **Linode server** using a Git-based development workflow that separates local development from server deployment.

### Server Infrastructure

**Linode Server Details:**
- **Server Location**: `/home/coraluser/Coral_Social_Media/`
- **Access Method**: SSH access for server management and deployment
- **Environment Type**: Production environment with Git-based deployment
- **Operating System**: Linux-based Linode server

### Git-Based Development Workflow

The system uses a standard Git-based development workflow:
- **Local Development**: Code changes made on local development machines
- **Version Control**: GitHub repository for code management and collaboration
- **Server Deployment**: Changes pulled from GitHub to the Linode server
- **Repository URL**: `https://github.com/MarkAustinGrow/Coral_Social_Media.git`

This setup provides:
- **Controlled Deployment**: Changes are reviewed and tested before deployment
- **Version Control**: Full Git history and rollback capabilities
- **Collaboration**: Multiple developers can work on the codebase safely
- **Staging Capability**: Local testing before server deployment
- **Change Tracking**: Complete audit trail of all modifications

### Development Environment Characteristics

**Git-Based Development Setup:**
- **Local Development**: All code changes made locally on development machines
- **Version Control**: Git tracks all changes with proper commit history
- **Deployment Process**: Controlled deployment through Git pull operations
- **Server Execution**: Agents and services run on the Linode server after deployment
- **Monitoring**: System status monitored through web interface and server logs

### Safety Considerations

**Git-Based Development Safety:**
- **Change Management**: All modifications go through Git workflow with proper commits
- **Backup Procedures**: Git repository serves as primary backup with full history
- **Version Control**: Complete version history with ability to rollback to any previous state
- **Testing Protocol**: Local testing before pushing to repository
- **Deployment Control**: Controlled deployment process with verification steps

### File System Structure

The complete system is available at the server root:
```
/home/coraluser/Coral_Social_Media/
├── 0_langchain_interface.py              # Base LangChain integration
├── 2_langchain_tweet_scraping_agent_simple.py
├── 3_langchain_tweet_research_agent_simple.py
├── 3.5_langchain_hot_topic_agent_simple.py
├── 4_langchain_blog_writing_agent.py
├── 4_langchain_blog_critique_agent.py
├── 5_langchain_blog_to_tweet_agent.py
├── 6_langchain_x_reply_agent_simple.py
├── 7_langchain_twitter_posting_agent_v3.py
├── coral-server-master/                  # Coral Protocol server
├── Web_Interface/                        # Next.js web dashboard
├── agent_status_*.py                     # Agent monitoring tools
├── Codebase_Documentation.md             # This documentation
├── supabase_schema.sql                   # Database schema
├── requirements.txt                      # Python dependencies
└── [Additional configuration and utility files]
```

### Advantages of Current Setup

**Development Benefits:**
- **Immediate Feedback**: Changes can be tested instantly on the live system
- **Real Environment Testing**: No discrepancy between development and production
- **Simplified Deployment**: No separate deployment process required
- **Direct Debugging**: Can debug issues directly in the live environment
- **Resource Access**: Full access to server resources and capabilities

**Operational Benefits:**
- **Persistent Operation**: Agents can run continuously on the server
- **Better Resource Management**: Server-grade resources for AI processing
- **Network Stability**: Stable server connection for external API calls
- **Centralized Management**: All components running on a single, managed server

### Git Workflow Benefits

**Development Benefits:**
- **Version Control**: Complete history of all changes with rollback capabilities
- **Collaboration**: Multiple developers can work safely on the same codebase
- **Branch Management**: Feature branches allow isolated development
- **Code Review**: Pull request process ensures code quality
- **Local Testing**: Full testing capability before deployment

**Operational Benefits:**
- **Controlled Deployment**: Changes are deployed only after testing and approval
- **Rollback Capability**: Easy rollback to previous versions if issues arise
- **Change Tracking**: Complete audit trail of all modifications
- **Backup Security**: Git repository serves as distributed backup system
- **Environment Separation**: Clear separation between development and production

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

The web interface is built with Next.js 14, React, and Tailwind CSS with shadcn/ui components, featuring a **complete authentication system** and multiuser support. It's organized as follows:

### Directory Structure

```
Web_Interface/
├── app/                  # Next.js app router pages
│   ├── auth/             # Authentication pages
│   │   ├── login/        # User login page
│   │   ├── signup/       # User registration page
│   │   └── callback/     # Auth callback handler
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication API endpoints
│   │   └── user/         # User management API endpoints
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
├── contexts/             # React contexts
│   └── AuthContext.tsx   # Authentication context provider
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
│   ├── supabase.ts       # Supabase client configuration
│   └── crypto.ts         # Cryptographic utilities
├── types/                # TypeScript type definitions
│   └── database.ts       # Database type definitions
├── middleware.ts         # Next.js middleware for auth
├── public/               # Static assets
└── styles/               # Global styles
```

### Key Pages

#### Authentication Pages
- **Login** (`app/auth/login/page.tsx`): User authentication with email/password
- **Signup** (`app/auth/signup/page.tsx`): User registration with profile creation
- **Auth Callback** (`app/auth/callback/page.tsx`): Handles authentication redirects

#### Main Application Pages
- **Dashboard** (`app/page.tsx`): Main dashboard with system overview (protected)
- **Setup Wizard** (`app/setup/page.tsx`): Multi-step configuration wizard (protected)
- **Logs** (`app/logs/page.tsx`): System logs and activity monitoring (protected)
- **Config** (`app/config/page.tsx`): System configuration management (protected)
- **Persona** (`app/persona/page.tsx`): Persona management for content generation (protected)
- **Calendar** (`app/calendar/page.tsx`): Content scheduling calendar (protected)
- **Accounts** (`app/accounts/page.tsx`): Twitter account management (protected)
- **Debug** (`app/debug/page.tsx`): System debugging tools (protected)

#### API Endpoints
- **User Profile** (`app/api/user/profile/route.ts`): User profile management API
- **Authentication APIs**: Various endpoints for user authentication and session management

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

## Authentication System

The system implements a comprehensive authentication system using Supabase Auth with the following components:

### Authentication Flow

1. **User Registration**: New users can create accounts through the signup page
2. **Email/Password Login**: Secure authentication with email and password
3. **Session Management**: Automatic session handling with refresh tokens
4. **Protected Routes**: All application pages require authentication
5. **Middleware Protection**: Next.js middleware ensures unauthenticated users are redirected

### Authentication Components

- **AuthContext** (`contexts/AuthContext.tsx`): React context providing authentication state and methods
- **Supabase Client** (`lib/supabase.ts`): Configured Supabase client with authentication
- **Middleware** (`middleware.ts`): Next.js middleware for route protection
- **Login Page** (`app/auth/login/page.tsx`): User authentication interface
- **Signup Page** (`app/auth/signup/page.tsx`): User registration interface
- **Auth Callback** (`app/auth/callback/page.tsx`): Handles authentication redirects

### Security Features

- **Row Level Security (RLS)**: Database-level security ensuring users only access their own data
- **Session Validation**: Automatic session validation and refresh
- **Secure Redirects**: Proper handling of authentication redirects
- **CSRF Protection**: Built-in CSRF protection through Supabase Auth
- **Password Security**: Secure password handling through Supabase Auth

### User Profile Management

- **Extended Profiles**: Additional user data beyond basic authentication
- **Profile API**: RESTful API for profile management (`app/api/user/profile/route.ts`)
- **Customizable Settings**: User-specific configuration and preferences

## State Management and Error Handling

The system implements robust state management and error handling to provide a better user experience, especially when dealing with database connections, external services, and authentication.

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

The system uses Supabase for structured data storage with a **multiuser architecture** implementing Row Level Security (RLS) for data isolation. The schema has been significantly enhanced through multiple migration phases and includes:

### Authentication & User Management

- **auth.users**: Supabase authentication users (managed by Supabase Auth)
- **public.users**: Extended user profiles with additional metadata
- **user_profiles**: Comprehensive user profile information including preferences and settings

### Core Data Tables (Tenant-Isolated)

- **tweets**: Stores collected tweets with metadata (user-specific via RLS)
- **tweets_cache**: Stores collected tweets for processing by the Hot Topic Agent
- **engagement_metrics**: Stores topic engagement metrics tracked by the Hot Topic Agent
- **blogs**: Stores generated blog content (user-specific)
- **tweet_threads**: Stores generated tweet threads (user-specific)
- **x_accounts**: Stores monitored Twitter accounts with priority and status information (user-specific)
- **agent_logs**: Stores agent activity logs (user-specific)
- **system_config**: Stores system configuration (user-specific)
- **personas**: Stores content generation personas (user-specific)

### Security Implementation

- **Row Level Security (RLS)**: All user data tables implement RLS policies to ensure data isolation
- **User-based Filtering**: All queries automatically filter data based on the authenticated user
- **Secure API Access**: All API endpoints require authentication and respect user boundaries
- **Session Management**: Automatic session handling with refresh token rotation

### Database Migrations

The system has undergone multiple migration phases:

1. **Phase 1**: Initial multiuser schema implementation with RLS
2. **Phase 1 Corrected**: Bug fixes and schema refinements
3. **Final Migration**: Complete multiuser implementation with all security policies

### Relationships

- All user data is linked to `auth.users.id` for proper tenant isolation
- Tweets belong to user-specific accounts (x_accounts)
- Blog posts are based on user-specific tweet research
- Tweet threads are based on user-specific blog posts
- Agent logs reference specific agents and user actions
- User profiles extend the base authentication user data

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

### Git-Based Development Environment

The system uses a **Git-based development workflow** that separates local development from server deployment, providing better version control and safer development practices.

### Development Workflow Steps

**1. Local Development:**
```bash
# Clone the repository locally
git clone https://github.com/MarkAustinGrow/Coral_Social_Media.git
cd Coral_Social_Media

# Create a new branch for your changes
git checkout -b feature/your-feature-name

# Make your code changes locally
# Edit files using your preferred IDE/editor
```

**2. Version Control:**
```bash
# Stage your changes
git add .

# Commit with descriptive message
git commit -m "Add feature: description of changes"

# Push to GitHub
git push origin feature/your-feature-name
```

**3. Server Deployment:**
```bash
# SSH into the Linode server
ssh coraluser@your-server-ip

# Navigate to the project directory
cd /home/coraluser/Coral_Social_Media

# Pull the latest changes from GitHub
git pull origin main

# If using a feature branch, merge it first:
# git checkout main
# git merge feature/your-feature-name
```

**4. Server Execution:**
```bash
# Activate the virtual environment
source coral_env/bin/activate

# Restart affected services
# For agents:
python 2_langchain_tweet_scraping_agent.py

# For web interface:
cd Web_Interface
npm run dev

# For Coral server:
cd ../coral-server-master
./gradlew run
```

### Git Workflow Best Practices

**Branch Management:**
- **main**: Stable production-ready code
- **feature/**: Feature development branches
- **hotfix/**: Critical bug fixes
- **Macro**: Specialized branch for Macro Economics persona

**Commit Guidelines:**
- Use descriptive commit messages
- Make atomic commits (one logical change per commit)
- Test changes locally before committing
- Include relevant documentation updates

**Pull Request Process:**
1. Create feature branch from main
2. Make changes and test locally
3. Push branch to GitHub
4. Create pull request for review
5. Merge to main after approval
6. Deploy to server

### Server Environment Considerations

**Virtual Environment Management:**
- All Python agents must run in the `coral_env` virtual environment on the server
- Virtual environment location: `/home/coraluser/Coral_Social_Media/coral_env/`
- Activation command on server: `source coral_env/bin/activate`

**Process Management:**
- Agents run as server processes after deployment
- Use server-side process monitoring tools
- Background processes persist after SSH disconnection
- Monitor agent status through the web interface dashboard

**Deployment Verification:**
- **Test locally:** Verify changes work in local development environment
- **Deploy to server:** Pull changes and restart affected services
- **Monitor system:** Use web interface to verify system health
- **Check logs:** Review agent logs for any errors after deployment

### Development Best Practices for Git Workflow

**Local Development:**
1. **Set up local environment:** Install dependencies and configure local development setup
2. **Test thoroughly:** Test all changes locally before pushing to repository
3. **Use feature branches:** Create separate branches for each feature or bug fix
4. **Keep commits focused:** Make small, focused commits with clear messages

**Version Control:**
1. **Commit frequently:** Make regular commits to track progress
2. **Write clear messages:** Use descriptive commit messages explaining what and why
3. **Review before pushing:** Double-check changes before pushing to remote repository
4. **Keep history clean:** Use interactive rebase to clean up commit history if needed

**Server Deployment:**
1. **Plan deployments:** Schedule deployments during low-activity periods
2. **Backup before changes:** Ensure recent backups exist before major deployments
3. **Deploy incrementally:** Deploy and test small changes rather than large batches
4. **Monitor after deployment:** Watch system health and logs after each deployment

**Safety Protocols:**
1. **Stop agents safely:** Use the web interface to stop agents before major updates
2. **Test database connections:** Verify database connectivity after configuration changes
3. **Verify API credentials:** Ensure external service connections work after updates
4. **Monitor system resources:** Check server resources during and after deployment

**Server Management Commands:**
```bash
# Check running Python processes on server
ps aux | grep python

# Monitor system resources
htop

# Check disk space
df -h

# View system logs
tail -f /var/log/syslog

# Check Git status
git status
git log --oneline -10

# View recent commits
git log --graph --oneline --all -10
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
1. Always activate the `coral_env` virtual environment before running agents on the server
2. Verify the environment has all required packages installed
3. If packages are missing, install them in the activated environment:

**On Server (Linux):**
```bash
cd /home/coraluser/Coral_Social_Media
source coral_env/bin/activate
pip install -r requirements.txt
```

**Local Development (Windows - for reference):**
```bash
coral_env\Scripts\activate
pip install -r requirements.txt
```

### Git Workflow Issues

**Problem**: Can't push changes to GitHub

**Solution**:
1. Verify you have proper Git credentials configured
2. Check if you have write access to the repository
3. Ensure you're on the correct branch: `git branch`
4. Try authenticating again: `git config --global user.name "Your Name"`
5. Use personal access token if using HTTPS: `git config --global credential.helper store`

**Problem**: Changes made locally don't appear on the server after deployment

**Solution**:
1. Verify changes were committed and pushed to GitHub: `git status`
2. Check if the correct branch was pushed: `git log --oneline -5`
3. SSH to server and pull the latest changes: `git pull origin main`
4. Verify you're on the correct branch on the server: `git branch`
5. Check if there are any merge conflicts: `git status`

**Problem**: Server processes not responding to configuration changes

**Solution**:
1. Server processes need to be restarted after configuration changes
2. Use the web interface to stop and restart affected agents
3. SSH to server and restart services manually if needed
4. Check if the process is reading from cached configuration
5. Verify the `.env` file was updated correctly on the server

**Problem**: Can't SSH into the server

**Solution**:
1. Verify server IP address and SSH credentials
2. Check network connectivity to the server
3. Ensure SSH service is running on the server
4. Try using different SSH client or connection method
5. Contact server administrator if access issues persist

**Problem**: Git merge conflicts during deployment

**Solution**:
1. Check for conflicts: `git status`
2. Resolve conflicts manually in affected files
3. Stage resolved files: `git add <filename>`
4. Complete the merge: `git commit`
5. Consider using feature branches to avoid conflicts on main branch

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

## Current Implementation Status

### ✅ Completed Features

1. **✅ Multiuser Authentication**: Complete user authentication and multi-user support implemented
2. **✅ Database Schema**: Comprehensive multiuser database schema with Row Level Security
3. **✅ User Registration/Login**: Full authentication flow with signup and login pages
4. **✅ Session Management**: Automatic session handling and refresh token rotation
5. **✅ Protected Routes**: All application pages protected with authentication middleware
6. **✅ User Profile System**: Extended user profiles with API endpoints
7. **✅ Data Isolation**: Secure tenant-based data isolation using RLS policies
8. **✅ Authentication Context**: React context for authentication state management

### 🚧 Recent Deployments

- **Middleware Fixes**: Recent fixes to authentication middleware for proper session handling
- **Database Migrations**: Multiple phases of database migration completed
- **Supabase Integration**: Full integration with Supabase Auth and database
- **API Security**: All API endpoints secured with user authentication

### 📋 Future Enhancements

Planned enhancements for the system include:

1. **Advanced Analytics**: Enhanced metrics and performance tracking
2. **Content Approval Workflow**: Human-in-the-loop approval for generated content
3. **Additional Platforms**: Support for more social media platforms beyond Twitter
4. **Enhanced Personalization**: More advanced persona configuration
5. **Team Collaboration**: Multi-user team features and role-based access
6. **Enhanced Account Management**: More sophisticated account prioritization and filtering
7. **Offline Mode**: Support for working without database connectivity
8. **Real-time Updates**: WebSocket integration for live data updates
9. **Comprehensive Testing**: Automated tests for error states and edge cases
10. **Advanced Debugging Tools**: More sophisticated debugging and troubleshooting capabilities
11. **Mobile App**: Native mobile application for iOS and Android
12. **Advanced Security**: Two-factor authentication and advanced security features

---

This documentation provides a high-level overview of the Coral Social Media Infrastructure codebase. For more detailed information on specific components, refer to the individual README files and code documentation.
