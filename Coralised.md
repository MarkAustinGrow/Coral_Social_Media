# Coralised Agents Documentation

## Overview

"Coralised" agents are versions of our social media automation agents that have been specifically adapted to work with the **Coral Protocol** for multi-agent coordination. This document explains the architectural differences between Coral Protocol versions (`_coral.py`) and standard versions (`.py`) of our agents.

## What is "Coralisation"?

**Coralisation** is the process of adapting an independent agent to work within the Coral Protocol ecosystem for coordinated multi-agent workflows. Instead of operating autonomously, coralised agents:

- Listen for instructions from other agents
- Respond via structured inter-agent communication
- Participate in coordinated workflows
- Optimize for event-driven execution

## Dual Architecture System

Our system supports **two operational modes** via the **Agent Mode Selector**:

### 🟢 **Coral Mode** (Multi-Agent Coordination)
- Uses `*_coral.py` versions of agents
- Pure event-driven execution
- Agents communicate via Coral Protocol
- Optimized for complex multi-agent workflows

### 🔵 **Auto Mode** (Independent Operation)
- Uses standard `*.py` versions of agents
- Hybrid execution (reactive + scheduled)
- Agents work independently with optional coordination
- Optimized for autonomous operation

---

## Core Architectural Differences

### 1. **Execution Model**

#### Coral Version (`_coral.py`)
```python
# Single execution - let agent handle its own conversation flow
await agent_executor.ainvoke({})
```
- **Event-driven**: Only acts when mentioned by other agents
- **Single execution**: Agent manages its own conversation loop internally
- **Pure reactive**: No autonomous scheduled operations

#### Standard Version (`.py`)
```python
# Continuous loop with optimized OpenAI usage
while True:
    # Listen for mentions
    mention_result = await wait_for_mentions_tool.ainvoke({"timeoutMs": 8000})
    
    if mention_result and mention_result["mentions"]:
        # Process mentions with OpenAI
        await agent_executor.ainvoke({"mentions": mention_result["mentions"]})
    else:
        # Check for scheduled work
        should_execute_result = should_execute_now.invoke({})
        if should_execute_result.get("result", False):
            # Perform scheduled work with OpenAI
            await agent_executor.ainvoke({"scheduled_task": "scraping"})
```
- **Hybrid**: Responds to mentions AND performs scheduled operations
- **Continuous loop**: Explicit main loop management
- **Proactive + Reactive**: Both event-driven and time-based execution

### 2. **OpenAI API Optimization**

Both versions are optimized to prevent unnecessary API calls:

#### Coral Version
- Only calls OpenAI when mentions are received
- Maximum efficiency through pure event-driven architecture
- No background API usage during idle periods

#### Standard Version
- Calls `wait_for_mentions` and `should_execute_now` directly (no OpenAI)
- Only invokes OpenAI when there's actual work to process
- Optimized main loop prevents API waste during idle time

### 3. **Agent Prompt Engineering**

#### Coral Version Prompt
```python
f"""You are a Tweet Scraping Agent operating in CORAL PROTOCOL mode for user {user_id}.

CORAL PROTOCOL BEHAVIOR:
You listen for instructions from other agents and respond via the Coral Protocol.

Follow these steps in order:
1. Call `wait_for_mentions` from coral tools (timeoutMs: 30000) to receive mentions from other agents.
2. When you receive a mention, keep the thread ID and the sender ID.
3. Parse the instruction in the message content. Look for requests like:
   - "scrape tweets from [usernames]"
   - "fetch recent tweets"
   - "get tweets from followed accounts"
   - "collect tweets for analysis"
4. Based on the instruction, use your tools to:
   a. Get accounts to monitor using `get_accounts_to_monitor` (if no specific usernames provided)
   b. Check API usage using `get_api_usage`
   c. Fetch tweets from requested accounts using `fetch_tweets`
   d. Store the fetched tweets using `store_tweets`
   e. Update the last_fetched_at timestamp using `update_account_fetch_time`
5. Prepare a response with the results (number of tweets fetched, accounts processed, etc.)
6. Use `send_message` from coral tools to send your response back to the sender in the same thread.
7. Always respond back to the sender agent, even if there's an error.
8. Wait for 2 seconds and repeat the process from step 1.

If no mentions are received (timeout), simply continue waiting - do NOT perform autonomous actions.
"""
```

#### Standard Version Prompt
```python
f"""You are an agent interacting with the tools from Coral Server and having your own tools. Your task is to perform any instructions coming from any agent.

Follow these steps in order:
1. Call wait_for_mentions from coral tools (timeoutMs: 8000) to receive mentions from other agents.
2. When you receive a mention, keep the thread ID and the sender ID.
3. Take 2 seconds to think about the content (instruction) of the message and check only from the list of your tools available for you to action.
4. Check the tool schema and make a plan in steps for the task you want to perform.
5. Only call the tools you need to perform for each step of the plan to complete the instruction in the content.
6. Take 3 seconds and think about the content and see if you have executed the instruction to the best of your ability and the tools. Make this your response as "answer".
7. Use `send_message` from coral tools to send a message in the same thread ID to the sender Id you received the mention from, with content: "answer".
8. If any error occurs, use `send_message` to send a message in the same thread ID to the sender Id you received the mention from, with content: "error".
9. Always respond back to the sender agent even if you have no answer or error.
10. Wait for 2 seconds and repeat the process from step 1.

If no mentions are received (timeout), you should:
1. Check if it's time to perform scheduled scraping using should_execute_now
2. If it is time, perform the scraping operation:
   a. Get accounts to monitor using get_accounts_to_monitor
   b. Check API usage using get_api_usage
   c. Based on API usage, decide which accounts to fetch (prioritize high priority accounts)
   d. Fetch tweets from selected accounts using fetch_tweets
   e. Store the fetched tweets using store_tweets
   f. Update the last_fetched_at timestamp for processed accounts using update_account_fetch_time
3. If new tweets were found, create a thread with tweet_research_agent and notify them
"""
```

### 4. **Tool Availability**

#### Common Tools (Both Versions)
- `fetch_tweets` - Get tweets from specified accounts
- `get_api_usage` - Check rate limits
- `store_tweets` - Save tweets to database
- `get_accounts_to_monitor` - Get user's account list
- `update_account_fetch_time` - Update timestamps

#### Standard Version Additional Tools
- `adjust_scrape_frequency` - Dynamically adjust timing based on API usage
- `should_execute_now` - Check if it's time for scheduled work

#### Coral Protocol Tools (Both Versions)
- `wait_for_mentions` - Listen for messages from other agents
- `send_message` - Send messages to other agents
- `create_thread` - Start new conversation threads
- `add_participant` / `remove_participant` - Manage thread participants
- `close_thread` - End conversations

### 5. **Timeout Behavior**

#### Coral Version
- `wait_for_mentions(timeoutMs: 30000)` - 30 second timeout
- **On timeout**: Continue waiting, no autonomous actions
- **Pure reactive**: Only responds to external stimuli

#### Standard Version
- `wait_for_mentions(timeoutMs: 8000)` - 8 second timeout
- **On timeout**: Check for scheduled work, perform if needed
- **Hybrid reactive**: Responds to mentions AND performs scheduled tasks

---

## Multi-User Support

Both architectures maintain **identical multi-user support**:

### User Context Isolation
```python
# Get user context for user-specific operations
user_id = amu.get_user_context()

# User-specific MCP server connection
params = {
    "waitForAgents": 2,
    "agentId": f"tweet_scraping_agent_{user_id}",
    "agentDescription": f"You are tweet_scraping_agent for user {user_id}, responsible for..."
}
```

### User-Specific Resources
- **Twitter Credentials**: Each user has their own API keys and rate limits
- **Database Isolation**: All operations filtered by `user_id`
- **MCP Headers**: User isolation via `{"X-User-ID": user_id}` headers
- **Logging**: User-specific activity tracking

---

## Coral Protocol Features

### Inter-Agent Communication Pattern

```python
# 1. Listen for mentions
mention_result = await wait_for_mentions_tool.ainvoke({"timeoutMs": 30000})

# 2. Process instruction
if mention_result and mention_result["mentions"]:
    for mention in mention_result["mentions"]:
        thread_id = mention["threadId"]
        sender_id = mention["senderId"]
        content = mention["content"]
        
        # 3. Execute requested task
        result = await execute_task(content)
        
        # 4. Respond back to sender
        await send_message_tool.ainvoke({
            "threadId": thread_id,
            "recipientId": sender_id,
            "content": result
        })
```

### Thread Management
- **Thread Creation**: Agents can create new conversation threads
- **Participant Management**: Add/remove agents from conversations
- **Thread Lifecycle**: Proper opening and closing of conversations
- **Message Routing**: Direct messages to specific agents

### Response Protocols
- **Always Respond**: Agents must always respond to mentions, even on errors
- **Structured Responses**: Clear success/error message formats
- **Thread Continuity**: Maintain conversation context across messages

---

## Use Case Guidelines

### When to Use Coral Mode (`_coral.py`)

✅ **Perfect for:**
- **Complex Workflows**: Multi-step processes requiring coordination
- **Sequential Operations**: Tweet scraping → Research → Writing → Posting
- **Resource Optimization**: Maximum OpenAI API efficiency
- **Orchestrated Tasks**: When other agents control the workflow
- **Quality Control**: Multi-agent review and approval processes

📋 **Example Workflow:**
```
Interface Agent → Tweet Scraping Agent → Tweet Research Agent → Blog Writing Agent → Blog Critique Agent → Blog to Tweet Agent → Twitter Posting Agent
```

### When to Use Auto Mode (`.py`)

✅ **Perfect for:**
- **Independent Operation**: Agents working without coordination
- **Scheduled Tasks**: Regular, time-based operations
- **Autonomous Monitoring**: Continuous background processing
- **Simple Workflows**: Single-agent tasks
- **Fallback Operation**: When coordination isn't available

📋 **Example Workflow:**
```
Tweet Scraping Agent (scheduled) → Database → Dashboard
Blog Writing Agent (on-demand) → Database → Dashboard
```

---

## Agent-by-Agent Comparison

### Tweet Scraping Agent

| Feature | Coral Version | Standard Version |
|---------|---------------|------------------|
| **Execution** | Event-driven only | Event-driven + Scheduled |
| **Timeout** | 30s wait for mentions | 8s wait + scheduled check |
| **Autonomous** | No scheduled scraping | Yes, based on intervals |
| **Tools** | Core scraping tools | Core + frequency adjustment |
| **Use Case** | Part of workflow | Independent monitoring |

### Blog Writing Agent

| Feature | Coral Version | Standard Version |
|---------|---------------|------------------|
| **Trigger** | Mentions from research agent | Mentions + scheduled checks |
| **Content Source** | Provided by other agents | Self-sourced from database |
| **Output** | Responds to requester | Stores + notifies |
| **Workflow** | Coordinated pipeline | Independent operation |

### Twitter Posting Agent

| Feature | Coral Version | Standard Version |
|---------|---------------|------------------|
| **Trigger** | Mentions with content | Mentions + scheduled posting |
| **Content** | Provided by other agents | Self-sourced from database |
| **Approval** | Part of review workflow | Independent posting |
| **Timing** | On-demand via mentions | Scheduled intervals |

---

## File Naming Conventions

### Standard Agents
```
1_langchain_world_news_agent.py
2_langchain_tweet_scraping_agent.py
3_langchain_tweet_research_agent_multiuser.py
4_langchain_blog_writing_agent.py
5_langchain_blog_to_tweet_agent.py
6_langchain_x_reply_agent.py
7_langchain_twitter_posting_agent.py
```

### Coral Protocol Versions
```
2_langchain_tweet_scraping_agent_coral.py
3_langchain_tweet_research_agent_multiuser_coral.py
4_langchain_blog_writing_agent_coral.py
5_langchain_blog_to_tweet_agent_coral.py
6_langchain_x_reply_agent_coral.py
7_langchain_twitter_posting_agent_coral.py
```

### Process Manager Mapping
```python
# In Web_Interface/lib/process-manager.ts
const agentMappings = {
    coral: {
        "Tweet Scraping Agent": "2_langchain_tweet_scraping_agent_coral.py",
        "Blog Writing Agent": "4_langchain_blog_writing_agent_coral.py",
        // ... other coral versions
    },
    auto: {
        "Tweet Scraping Agent": "2_langchain_tweet_scraping_agent.py", 
        "Blog Writing Agent": "4_langchain_blog_writing_agent.py",
        // ... other standard versions
    }
}
```

---

## Developer Guide

### How to "Coralize" an Existing Agent

1. **Copy the Standard Version**
   ```bash
   cp 4_langchain_blog_writing_agent.py 4_langchain_blog_writing_agent_coral.py
   ```

2. **Update the Agent Description**
   ```python
   # Change from:
   "agentDescription": f"You are agent for user {user_id}, responsible for writing blogs based on priorities"
   
   # To:
   "agentDescription": f"You are agent for user {user_id}, responsible for writing blogs based on instructions from other agents"
   ```

3. **Modify the Prompt**
   - Add "CORAL PROTOCOL mode" declaration
   - Focus on `wait_for_mentions` → process → `send_message` flow
   - Remove autonomous scheduling logic
   - Increase timeout to 30000ms
   - Add explicit "no autonomous actions" instruction

4. **Simplify the Main Loop**
   ```python
   # Replace complex while loop with:
   async with MultiServerMCPClient(...) as client:
       # ... setup ...
       agent_executor = await create_agent(client, tools, agent_tools)
       await agent_executor.ainvoke({})  # Single execution
   ```

5. **Remove Scheduling Tools**
   - Remove `should_execute_now`
   - Remove `adjust_frequency` type tools
   - Keep core functional tools

6. **Update Process Manager**
   - Add mapping in `Web_Interface/lib/process-manager.ts`
   - Ensure both versions are available

### Best Practices for Dual Architecture

#### 1. **Maintain Tool Compatibility**
- Keep core functional tools identical between versions
- Only differ in scheduling/coordination tools
- Ensure same input/output formats

#### 2. **Consistent User Experience**
- Both versions should handle user context identically
- Same error handling and logging patterns
- Identical multi-user isolation

#### 3. **Clear Separation of Concerns**
- Coral versions: Pure coordination and response
- Standard versions: Coordination + autonomous operation
- No hybrid behavior within a single version

#### 4. **Testing Strategy**
```python
# Test both versions with same inputs
def test_agent_functionality():
    # Test coral version with mentions
    coral_result = test_coral_agent_with_mention(test_instruction)
    
    # Test standard version with same instruction
    standard_result = test_standard_agent_with_mention(test_instruction)
    
    # Results should be functionally equivalent
    assert coral_result.core_functionality == standard_result.core_functionality
```

### Deployment Considerations

#### 1. **Resource Management**
- Coral mode: Lower resource usage (event-driven)
- Auto mode: Higher resource usage (continuous loops)
- Plan infrastructure accordingly

#### 2. **Monitoring**
- Both versions use same logging infrastructure
- Monitor OpenAI API usage patterns
- Track inter-agent communication in Coral mode

#### 3. **Scaling**
- Coral mode: Scales with workflow complexity
- Auto mode: Scales with user count and scheduling frequency
- Consider hybrid deployments for different user tiers

---

## Performance Characteristics

### OpenAI API Usage

#### Coral Mode
- **Idle State**: 0 API calls (pure waiting)
- **Active State**: Only when processing mentions
- **Efficiency**: Maximum (event-driven)
- **Cost**: Lowest (pay-per-use)

#### Auto Mode
- **Idle State**: Minimal API calls (optimized loops)
- **Active State**: Mentions + scheduled operations
- **Efficiency**: High (optimized continuous operation)
- **Cost**: Higher (background processing)

### Resource Utilization

#### Coral Mode
```
CPU: Low (event-driven waiting)
Memory: Low (single execution context)
Network: Burst (when processing)
Latency: Low (immediate response to mentions)
```

#### Auto Mode
```
CPU: Medium (continuous loops)
Memory: Medium (persistent state)
Network: Steady (regular operations)
Latency: Variable (depends on scheduling)
```

---

## Troubleshooting

### Common Issues

#### 1. **Agent Not Responding to Mentions**
```python
# Check timeout settings
await wait_for_mentions_tool.ainvoke({"timeoutMs": 30000})  # Coral
await wait_for_mentions_tool.ainvoke({"timeoutMs": 8000})   # Standard

# Verify MCP connection
logger.info(f"Connected to MCP server at {MCP_SERVER_URL}")
```

#### 2. **Excessive OpenAI API Usage**
```python
# Ensure optimized main loop in standard version
if mention_result and mention_result["mentions"]:
    # Only NOW call OpenAI
    await agent_executor.ainvoke({"mentions": mention_result["mentions"]})
else:
    # Check scheduling without OpenAI
    should_execute_result = should_execute_now.invoke({})
```

#### 3. **User Context Issues**
```python
# Verify user context is available
user_id = amu.get_user_context()
if not user_id:
    logger.error("No user context available")
    return
```

### Debugging Tools

#### 1. **Coral Inspector**
- Use `/coral-inspector` page to monitor inter-agent communication
- Track message flow between agents
- Verify thread management

#### 2. **Agent Logs**
```python
# Both versions use same logging
log_to_database("info", f"Agent action for user {user_id}", metadata)
```

#### 3. **Process Manager**
```typescript
// Check which version is running
const agentFile = mode === 'coral' 
    ? agentMappings.coral[agentName]
    : agentMappings.auto[agentName]
```

---

## Future Enhancements

### Planned Features

1. **Dynamic Mode Switching**
   - Runtime switching between Coral and Auto modes
   - Per-agent mode configuration
   - Workflow-based mode selection

2. **Enhanced Coordination**
   - Agent capability discovery
   - Dynamic workflow generation
   - Load balancing across agents

3. **Advanced Monitoring**
   - Real-time coordination visualization
   - Performance analytics per mode
   - Cost optimization recommendations

4. **Hybrid Agents**
   - Agents that can operate in both modes simultaneously
   - Context-aware mode switching
   - Intelligent coordination decisions

---

## Conclusion

The **Coralised agent architecture** provides a powerful dual-mode system that enables both coordinated multi-agent workflows and independent autonomous operation. By maintaining both `_coral.py` and `.py` versions of each agent, users can choose the optimal execution model for their specific use cases.

The **Agent Mode Selector** makes this choice seamless, allowing users to switch between:
- **Coral Mode**: Maximum coordination and efficiency for complex workflows
- **Auto Mode**: Independent operation with optional coordination for autonomous tasks

This architecture provides the flexibility to handle everything from simple automated tasks to complex multi-agent orchestration, all while maintaining optimal resource utilization and user experience.
