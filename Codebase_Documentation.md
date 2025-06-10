# Coral Social Media Infrastructure - Codebase Documentation

This document provides a comprehensive overview of the Coral Social Media Infrastructure codebase, its architecture, components, and how they work together.

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [LangChain Agents](#langchain-agents)
5. [Web Interface](#web-interface)
6. [Coral Protocol Integration](#coral-protocol-integration)
7. [Database Schema](#database-schema)
8. [Setup and Configuration](#setup-and-configuration)
9. [Development Workflow](#development-workflow)
10. [Future Enhancements](#future-enhancements)

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
- **Qdrant**: Vector database for semantic search capabilities

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

### 2. Tweet Research Agent (`3_langchain_tweet_research_agent.py`)

Analyzes collected tweets to extract insights and identify patterns.

- **Inputs**: Tweet collections from the Tweet Scraping Agent
- **Outputs**: Analysis reports, topic clusters, sentiment analysis
- **Key Features**:
  - Sentiment analysis
  - Topic identification
  - Engagement pattern tracking

### 3. Blog Writing Agent (`4_langchain_blog_writing_agent.py`)

Creates long-form content based on insights from the Tweet Research Agent.

- **Inputs**: Research reports, topic clusters
- **Outputs**: Complete blog posts with SEO optimization
- **Key Features**:
  - Structured content generation
  - SEO optimization
  - Multiple writing styles through persona configuration

### 4. Blog to Tweet Agent (`5_langchain_blog_to_tweet_agent.py`)

Converts blog posts into engaging tweet threads.

- **Inputs**: Blog posts from the Blog Writing Agent
- **Outputs**: Tweet threads ready for posting
- **Key Features**:
  - Content chunking for tweet-sized pieces
  - Narrative flow maintenance
  - Hashtag optimization

### 5. X Reply Agent (`6_langchain_x_reply_agent.py`)

Generates and posts replies to tweets and mentions.

- **Inputs**: Mentions and relevant conversations
- **Outputs**: Contextually appropriate replies
- **Key Features**:
  - Priority-based reply generation
  - Brand voice consistency
  - Escalation for complex inquiries

### 6. Twitter Posting Agent (`7_langchain_twitter_posting_agent.py`)

Handles the scheduling and posting of tweets and threads.

- **Inputs**: Tweet content, scheduling parameters
- **Outputs**: Posted tweets with tracking information
- **Key Features**:
  - Scheduling optimization
  - Media attachment support
  - Performance monitoring

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

### Setup Wizard

The setup wizard (`app/setup/page.tsx` and `components/setup-wizard.tsx`) guides users through the initial configuration process:

1. **Welcome**: Introduction and overview
2. **API Keys**: Configuration of external service credentials
3. **Database**: Database connection setup
4. **Agent Configuration**: Agent selection and settings
5. **Persona**: Content style and tone configuration
6. **Finish**: Review and completion

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
- **blogs**: Stores generated blog content
- **tweet_threads**: Stores generated tweet threads
- **accounts**: Stores monitored Twitter accounts
- **agent_logs**: Stores agent activity logs
- **system_config**: Stores system configuration
- **personas**: Stores content generation personas

### Relationships

- Tweets belong to accounts
- Blog posts are based on tweet research
- Tweet threads are based on blog posts
- Agent logs reference specific agents and actions

## Setup and Configuration

The system uses a multi-step setup process:

1. **Environment Variables**: Defined in `.env` file (template in `.env.sample`)
2. **Setup Wizard**: Web-based configuration wizard
3. **Configuration Storage**: Stored in browser localStorage and Supabase

Key configuration parameters:
- API keys for external services
- Database connection details
- Agent settings and schedules
- Persona configuration

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

## Future Enhancements

Planned enhancements for the system include:

1. **Authentication**: User authentication and multi-user support
2. **Advanced Analytics**: Enhanced metrics and performance tracking
3. **Content Approval Workflow**: Human-in-the-loop approval for generated content
4. **Additional Platforms**: Support for more social media platforms
5. **Enhanced Personalization**: More advanced persona configuration
6. **API Endpoints**: REST API for external integration

---

This documentation provides a high-level overview of the Coral Social Media Infrastructure codebase. For more detailed information on specific components, refer to the individual README files and code documentation.
