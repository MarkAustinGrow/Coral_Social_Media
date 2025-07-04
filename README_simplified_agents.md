# Simplified Agents

This document explains the simplified versions of the agents that have been created to address connection issues with the Coral server.

## Background

The original agents were experiencing connection issues with the Coral server, particularly related to the agent status monitoring system. The agents would connect to the server but then disconnect after about a minute with an "Error in sse_reader" message.

After investigation, we found that the World News Agent, which doesn't use the status monitoring system, was able to maintain a stable connection to the Coral server. This led us to create simplified versions of the agents that follow the same pattern as the World News Agent.

## Key Changes

The simplified agents (`2_langchain_tweet_scraping_agent_simple.py`, `3_langchain_tweet_research_agent_simple.py`, `3.5_langchain_hot_topic_agent_simple.py`, `6_langchain_x_reply_agent_simple.py`, and `7_langchain_twitter_posting_agent_simple.py`) have the following changes:

1. **Removed Status Monitoring**: All code related to the agent status monitoring system has been removed, including imports of `agent_status_updater`, signal handlers, and calls to status update functions.

2. **Simplified Connection Parameters**: 
   - Changed `waitForAgents=7` to `waitForAgents=2` to match the World News Agent
   - Increased timeouts from 60 seconds to 300 seconds to match the World News Agent

3. **Simplified Prompt Structure**: The system prompt has been simplified to match the structure used by the World News Agent.

4. **Simplified Error Handling**: The error handling and reconnection logic has been simplified to match the World News Agent.

## Using the Simplified Agents

The web interface has been updated to use the simplified agents. When you click the "Start" button for any agent, it will now start the simplified version (if available).

### Running from the Web Interface

Simply use the "Start" button in the web interface to start each agent. The interface has been updated to point to the simplified versions.

### Running from the Command Line

You can run the simplified agents directly from the command line:

```bash
python 2_langchain_tweet_scraping_agent_simple.py
python 3_langchain_tweet_research_agent_simple.py
python 3.5_langchain_hot_topic_agent_simple.py
python 6_langchain_x_reply_agent_simple.py
python 7_langchain_twitter_posting_agent_simple.py
```

### Running Multiple Agents with the Helper Script

A helper script has been created to run multiple simplified agents at once:

```bash
# Run all simplified agents
python run_simplified_agents.py

# Run specific agents
python run_simplified_agents.py --agents 3.5_langchain_hot_topic_agent_simple.py 6_langchain_x_reply_agent_simple.py

# Adjust the wait time between starting agents
python run_simplified_agents.py --wait-time 10
```

The helper script will:
1. Start each agent in a separate process
2. Monitor the processes and restart them if they crash
3. Gracefully shut down all agents when you press Ctrl+C

## Advantages of the Simplified Agents

1. **Stable Connection**: The simplified agents maintain a stable connection to the Coral server without disconnecting after a minute.

2. **Simpler Code**: The code is simpler and easier to understand without the status monitoring system.

3. **Reduced Dependencies**: The agents no longer depend on the agent status monitoring system, which reduces the complexity of the system.

4. **Improved Error Handling**: The agents now have better error handling with detailed error messages and automatic retries with exponential backoff.

5. **OAuth 2.0 Support**: The Twitter Posting Agent now supports OAuth 2.0 authentication, which is the recommended authentication method for Twitter API v2. See [TWITTER_API_SETUP.md](TWITTER_API_SETUP.md) for details on setting up your Twitter API credentials.

## Limitations

1. **No Status Monitoring**: The simplified agents don't update their status in the database, so the web interface won't show accurate status information for them.

2. **Manual Restart Required**: If the agents crash, they won't be automatically restarted by the agent status monitor.

## Future Improvements

If these simplified agents prove to be more stable, we could:

1. **Simplify Other Agents**: Apply the same simplifications to the other agents in the system.

2. **Implement a Lighter Status System**: Develop a lighter-weight status monitoring system that doesn't interfere with the Coral server connection.

3. **Fix the Coral Server Bug**: Investigate and fix the bug in the Coral server that's causing the "Key method is missing in the map" error.

4. **Enhance OAuth Support**: Extend OAuth 2.0 support to other agents that interact with external APIs.

5. **Improve Error Recovery**: Implement more sophisticated error recovery mechanisms to handle API rate limits and network issues.

## Twitter API Authentication

The Twitter Posting Agent now supports two authentication methods:

1. **OAuth 2.0 User Context** (Recommended): This is the modern authentication method recommended by Twitter for API v2. It provides better security and is simpler to implement.

2. **OAuth 1.0a User Context** (Legacy): This is the traditional authentication method for Twitter API.

To configure your Twitter API credentials, see the [Twitter API Setup Guide](TWITTER_API_SETUP.md).
