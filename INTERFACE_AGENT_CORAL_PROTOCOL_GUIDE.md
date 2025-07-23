# Interface Agent Coral Protocol Communication Guide

## Overview

This guide documents the exact process for connecting the Interface Agent to the Coral Protocol server and enabling multi-agent communication. Based on successful implementation and testing of the Mode Switch Architecture.

## 1. Connection Architecture

### Server Infrastructure
- **Coral Server**: `coral.8interns.com:5555`
- **Application Server**: `8interns.com` (where agents run)
- **Protocol**: Server-Sent Events (SSE) with HTTP message posting

### Critical Requirements
- Coral server must be running with "83% EXECUTING" status
- Interface Agent connects from application server to coral server
- User-specific isolation maintained throughout

## 2. SSE Endpoint Configuration

### Primary SSE Endpoint
```
http://coral.8interns.com/devmode/exampleApplication/privkey/session1/sse?waitForAgents=2&agentId=user_interface_agent_99d3ff50-dcb5-4389-8e76-2ecd626902bc&agentDescription=You+are+user_interface_agent+for+user+99d3ff50-dcb5-4389-8e76-2ecd626902bc%2C+responsible+for+engaging+with+users%2C+processing+instructions%2C+and+coordinating+with+other+agents
```

### Key Components
- **Application**: `exampleApplication` (NOT `app` - this is critical!)
- **Privacy Key**: `privkey` 
- **Session**: `session1`
- **Wait Parameter**: `waitForAgents=2` (waits for 2 agents to connect)
- **Agent ID**: `user_interface_agent_{USER_ID}`
- **Description**: URL-encoded agent description

### Message Endpoint Pattern
```
http://coral.8interns.com/devmode/exampleApplication/privkey/session1/message?sessionId={DYNAMIC_SESSION_ID}
```

## 3. Available Coral Tools

The Interface Agent receives these tools upon successful connection:

```python
['list_agents', 'create_thread', 'add_participant', 'remove_participant', 'close_thread', 'send_message', 'wait_for_mentions']
```

### Tool Functions

#### `list_agents({'includeDetails': True})`
- Lists all registered agents in the Coral Protocol
- Returns agent IDs, descriptions, and status
- Essential for discovering available agents

#### `create_thread({'threadName': 'Thread Name', 'participantIds': ['agent_id_1', 'agent_id_2']})`
- Creates a new conversation thread
- Returns thread ID for message routing
- Automatically adds creator as participant

#### `send_message({'threadId': 'thread_id', 'content': 'message', 'mentions': ['target_agent_id']})`
- Sends message to specific thread
- Mentions array targets specific agents
- Returns message ID and delivery confirmation

#### `wait_for_mentions({'timeoutMs': 30000})`
- Listens for incoming messages mentioning this agent
- Timeout in milliseconds (30000 = 30 seconds)
- Returns received messages or timeout

## 4. Multi-Agent Communication Workflow

### Successful Communication Pattern

1. **Agent Discovery**
   ```python
   # Interface Agent discovers available agents
   agents = list_agents({'includeDetails': True})
   # Returns: tweet_scraping_agent_99d3ff50-dcb5-4389-8e76-2ecd626902bc, user_interface_agent_99d3ff50-dcb5-4389-8e76-2ecd626902bc
   ```

2. **Thread Creation**
   ```python
   # Create dedicated conversation thread
   thread = create_thread({
       'threadName': 'Macroeconomics Tweets', 
       'participantIds': ['tweet_scraping_agent_99d3ff50-dcb5-4389-8e76-2ecd626902bc']
   })
   # Returns: Thread ID c7b31fb6-e5f0-429e-9cd3-4ca28e786b3f
   ```

3. **Message Sending**
   ```python
   # Send instruction to target agent
   message = send_message({
       'threadId': 'c7b31fb6-e5f0-429e-9cd3-4ca28e786b3f',
       'content': 'Please find tweets related to macroeconomics.',
       'mentions': ['tweet_scraping_agent_99d3ff50-dcb5-4389-8e76-2ecd626902bc']
   })
   # Returns: Message ID bbbc5884-02c6-4975-b76e-fcb218403681
   ```

4. **Message Reception**
   ```xml
   <!-- Target agent receives via wait_for_mentions -->
   <ResolvedMessage id="bbbc5884-02c6-4975-b76e-fcb218403681" 
                    threadId="c7b31fb6-e5f0-429e-9cd3-4ca28e786b3f" 
                    senderId="user_interface_agent_99d3ff50-dcb5-4389-8e76-2ecd626902bc" 
                    content="Please find tweets related to macroeconomics." 
                    timestamp="1753261483182" 
                    userId="99d3ff50-dcb5-4389-8e76-2ecd626902bc">
   <mentions>tweet_scraping_agent_99d3ff50-dcb5-4389-8e76-2ecd626902bc</mentions>
   </ResolvedMessage>
   ```

## 5. Message Routing and Delivery

### HTTP Response Codes
- **HTTP/1.1 200 OK**: Successful SSE connection
- **HTTP/1.1 202 Accepted**: Message successfully queued for delivery
- **HTTP/1.1 502 Bad Gateway**: Coral server not running

### Session Management
- **Dynamic Session IDs**: Each connection gets unique session ID
- **Auto-Reconnection**: Agents automatically reconnect on connection drops
- **Session Isolation**: Each user gets separate session context

### Message Flow Confirmation
```
Interface Agent → create_thread → HTTP 202 Accepted
Interface Agent → send_message → HTTP 202 Accepted  
Target Agent → wait_for_mentions → Receives ResolvedMessage
```

## 6. Error Handling and Recovery

### Common Errors and Solutions

#### `ClosedResourceError`
```
2025-07-23 09:01:32,792 - ERROR - ClosedResourceError on attempt 1:
2025-07-23 09:01:32,895 - INFO - Retrying in 5 seconds...
```
**Solution**: Automatic retry with exponential backoff. Normal behavior.

#### `502 Bad Gateway`
```
HTTP/1.1 502 Bad Gateway for url 'http://coral.8interns.com/devmode/...'
```
**Solution**: Coral server not running. Start server manually with `./gradlew run`.

#### `404 Not Found`
```
HTTP/1.1 404 Not Found
```
**Solution**: Wrong endpoint URL. Ensure using `exampleApplication` not `app`.

### Auto-Reconnection Pattern
```python
# Agents automatically reconnect on connection drops
2025-07-23 09:01:37,936 - INFO - HTTP Request: GET http://coral.8interns.com/devmode/exampleApplication/privkey/session1/sse?waitForAgents=2&agentId=... "HTTP/1.1 200 OK"
2025-07-23 09:01:37,939 - INFO - Received endpoint URL: http://coral.8interns.com/devmode/exampleApplication/privkey/session1/message?sessionId=552ff333-4fe7-45a7-9ee4-796b31fe1f7b
```

## 7. Troubleshooting Checklist

### Before Starting Interface Agent

1. **Verify Coral Server Status**
   ```bash
   # SSH to coral.8interns.com
   ssh root@coral.8interns.com
   cd /root/Coral-Server-user-isolation
   ./gradlew run
   # Look for: <==========---> 83% EXECUTING [Xm Xs]
   ```

2. **Test Server Connectivity**
   ```bash
   # From application server
   ping coral.8interns.com
   # Should respond successfully
   ```

### During Interface Agent Operation

1. **Check Connection Logs**
   ```
   ✅ Good: "HTTP/1.1 200 OK"
   ✅ Good: "Connected to MCP server"
   ✅ Good: "Available Coral tools: ['list_agents', ...]"
   ❌ Bad: "502 Bad Gateway"
   ❌ Bad: "404 Not Found"
   ```

2. **Verify Agent Registration**
   ```python
   # Interface Agent should see itself and other agents
   list_agents({'includeDetails': True})
   # Should return multiple agents
   ```

### Multi-Agent Communication Issues

1. **Message Not Delivered**
   - Check HTTP response: Should be "202 Accepted"
   - Verify target agent is running `wait_for_mentions`
   - Confirm correct agent ID in mentions array

2. **Timeout on wait_for_mentions**
   - Normal if no messages within timeout period
   - Increase timeout if needed: `{'timeoutMs': 60000}`
   - Check if sending agent is actually sending messages

## 8. Working Examples

### Complete Interface Agent Startup
```python
export USER_ID="99d3ff50-dcb5-4389-8e76-2ecd626902bc"
python3 0_langchain_interface.py

# Expected output:
# 🔗 Using centralized MCP server: http://coral.8interns.com/devmode/exampleApplication/privkey/session1/sse?waitForAgents=2&agentId=user_interface_agent_99d3ff50-dcb5-4389-8e76-2ecd626902bc&agentDescription=...
# HTTP Request: GET ... "HTTP/1.1 200 OK"
# Connected to MCP server
# Available Coral tools: ['list_agents', 'create_thread', 'add_participant', 'remove_participant', 'close_thread', 'send_message', 'wait_for_mentions']
```

### Successful Multi-Agent Task
```
User: "find tweets on macroeconomics"
Interface Agent: create_thread('Macroeconomics Tweets', ['tweet_scraping_agent_...'])
Interface Agent: send_message('Please find tweets related to macroeconomics.', mentions=['tweet_scraping_agent_...'])
Tweet Scraping Agent: Receives message via wait_for_mentions
Tweet Scraping Agent: Executes tweet fetching for RealJimRickards, spomboy
```

## 9. Critical Configuration Notes

### Application Name
- **MUST USE**: `exampleApplication`
- **DO NOT USE**: `app` (will result in 404)

### User ID Format
- Pattern: `{agent_type}_{user_id}`
- Example: `user_interface_agent_99d3ff50-dcb5-4389-8e76-2ecd626902bc`

### URL Encoding
- Agent descriptions must be URL-encoded in SSE endpoint
- Spaces become `+`, special characters encoded

### Session Persistence
- Sessions are temporary and dynamic
- Each reconnection gets new session ID
- Thread IDs persist across sessions

## 10. Success Indicators

### Interface Agent Connected Successfully
```
✅ HTTP/1.1 200 OK on SSE connection
✅ Received endpoint URL with sessionId
✅ Available Coral tools listed
✅ Agent appears in list_agents output
```

### Multi-Agent Communication Working
```
✅ create_thread returns thread ID
✅ send_message returns HTTP 202 Accepted
✅ Target agent receives ResolvedMessage
✅ Target agent executes requested task
```

### Production Ready
```
✅ Auto-reconnection on connection drops
✅ User-specific agent isolation
✅ Database logging integration
✅ Rate limit handling
```

---

**Last Updated**: July 23, 2025
**Status**: Production Ready - Multi-Agent Communication Confirmed Working
**Architecture**: Mode Switch Architecture with Coral Protocol Integration
