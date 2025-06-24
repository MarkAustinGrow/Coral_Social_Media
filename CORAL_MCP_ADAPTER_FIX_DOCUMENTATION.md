# Coral Protocol MCP Adapter Fix Documentation

## Problem Summary

When using `langchain-mcp-adapters==0.0.10` with Coral Protocol, agents experience "Error in post_writer" issues that cause them to get stuck in error loops and fail to receive mentions reliably.

### Symptoms:
- "Error in post_writer" messages appearing every ~5 seconds
- Agents stuck in continuous error loops
- `wait_for_mentions` operations timing out
- Unreliable message reception between agents
- Connection degradation over time

### Root Cause:
- SSE connection keepalive issues in the MCP adapter
- Connection timeout bug triggered by long `wait_for_mentions` operations (8000ms+)
- Connection degradation after sustained activity

## Minimal Fix Solution (Recommended)

This approach requires only **2 small changes** to your existing Coral Protocol agents while maintaining your original code structure.

### 1. Fix the Timeout (CRITICAL - 1 line change)

**In your agent's system prompt, change the timeout value:**

```python
# BEFORE (in your agent prompt):
"Call wait_for_mentions from coral tools (timeoutMs: 8000)"

# AFTER (in your agent prompt):
"Call wait_for_mentions from coral tools (timeoutMs: 3000)"
```

### 2. Add Simple Connection Refresh (Minimal main function change)

**Replace your main function with this minimal wrapper:**

```python
# BEFORE:
async def main():
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
        logger.info(f"Connected to MCP server at {MCP_SERVER_URL}")
        tools = client.get_tools() + [YourCustomTool]
        agent_tool = [YourCustomTool]
        agent_executor = await create_your_agent(client, tools, agent_tool)
        
        while True:
            try:
                logger.info("Starting new agent invocation")
                await agent_executor.ainvoke({"agent_scratchpad": []})
                logger.info("Completed agent invocation, restarting loop")
                await asyncio.sleep(1)
            except Exception as e:
                logger.error(f"Error in agent loop: {str(e)}")
                await asyncio.sleep(5)

# AFTER:
async def main():
    max_operations_before_refresh = 10  # Refresh connection every 10 operations
    
    while True:
        try:
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
                logger.info(f"Connected to MCP server at {MCP_SERVER_URL}")
                tools = client.get_tools() + [YourCustomTool]  # Your tools here
                agent_tool = [YourCustomTool]  # Your specific tools
                agent_executor = await create_your_agent(client, tools, agent_tool)
                
                # Run operations with this connection
                current_operations = 0
                while current_operations < max_operations_before_refresh:
                    try:
                        logger.info("Starting new agent invocation")
                        await agent_executor.ainvoke({"agent_scratchpad": []})
                        logger.info("Completed agent invocation, restarting loop")
                        current_operations += 1
                        await asyncio.sleep(1)
                    except Exception as e:
                        logger.error(f"Error in agent loop: {str(e)}")
                        await asyncio.sleep(5)
                        break  # Break inner loop to refresh connection
                
                logger.info(f"Refreshing connection after {current_operations} operations")
                
        except Exception as e:
            logger.error(f"Connection error: {str(e)}")
            await asyncio.sleep(10)
```

## That's It! 

**Only 2 changes needed:**
1. Change `timeoutMs: 8000` to `timeoutMs: 3000` in your agent prompt
2. Wrap your main function with the simple connection refresh logic

**Everything else stays exactly the same:**
- ✅ Keep all your imports
- ✅ Keep your agent creation function unchanged
- ✅ Keep your tools unchanged
- ✅ Keep your logging style unchanged
- ✅ Keep your error handling unchanged

## Advanced Solution (If You Want More Features)

If you want more sophisticated connection management, you can implement the full solution with detailed tracking, but the minimal fix above is sufficient for most use cases.

### Advanced Features (Optional):
- Detailed operation counting and logging
- Consecutive error tracking
- Global connection health monitoring
- Enhanced error recovery

See the "Complete Advanced Solution" section below if you need these features.

---

## Complete Advanced Solution (Optional)

### 1. Add Enhanced Tracking

**Add these imports and variables at the top of your agent file:**

```python
import time

# Connection health tracking
connection_start_time = None
successful_operations = 0
max_operations_before_refresh = 10  # Refresh connection after 10 successful operations
```

### 2. Implement Advanced Connection Refresh Logic

**Replace your main agent loop with this enhanced wrapper:**

```python
async def run_agent_with_connection_refresh():
    """Run the agent with periodic connection refresh to avoid timeout issues."""
    global connection_start_time, successful_operations
    
    while True:
        try:
            logger.info("Creating new MCP client connection")
            connection_start_time = time.time()
            successful_operations = 0
            
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
                logger.info(f"Connected to MCP server at {MCP_SERVER_URL}")
                tools = client.get_tools() + [YourCustomTool]  # Add your tools here
                agent_tool = [YourCustomTool]  # Your specific tools
                agent_executor = await create_your_agent(client, tools, agent_tool)
                
                # Run agent operations with this connection
                operation_count = 0
                consecutive_errors = 0
                max_consecutive_errors = 3
                
                while operation_count < max_operations_before_refresh:
                    try:
                        logger.info(f"Starting agent invocation #{operation_count + 1}")
                        await agent_executor.ainvoke({"agent_scratchpad": []})
                        logger.info("Completed agent invocation successfully")
                        
                        operation_count += 1
                        successful_operations += 1
                        consecutive_errors = 0  # Reset error counter on success
                        
                        # Short pause between operations
                        await asyncio.sleep(1)
                        
                    except Exception as e:
                        consecutive_errors += 1
                        logger.error(f"Error in agent operation #{operation_count + 1}: {str(e)}")
                        
                        if consecutive_errors >= max_consecutive_errors:
                            logger.warning(f"Too many consecutive errors ({consecutive_errors}), refreshing connection")
                            break
                        
                        # Longer pause after error
                        await asyncio.sleep(3)
                
                logger.info(f"Completed {operation_count} operations, refreshing connection")
                
        except Exception as e:
            logger.error(f"Connection error: {str(e)}")
            logger.info("Waiting 10 seconds before reconnecting...")
            await asyncio.sleep(10)
```

### 3. Update Main Function for Advanced Solution

```python
async def main():
    logger.info("Starting [Your Agent Name] with connection refresh capability")
    await run_agent_with_connection_refresh()
```

## Implementation Checklist

For each agent in your system, apply these changes:

- [ ] **Update timeout values**: Change `timeoutMs: 8000` to `timeoutMs: 3000` in agent prompts
- [ ] **Add connection tracking**: Add the global variables for connection health tracking
- [ ] **Implement refresh wrapper**: Replace main loop with `run_agent_with_connection_refresh()`
- [ ] **Update main function**: Use the new main function that calls the refresh wrapper
- [ ] **Update agent prompt**: Use the new system prompt with shorter timeouts and wait times
- [ ] **Add proper logging**: Ensure you have operation counting and error tracking logs
- [ ] **Test thoroughly**: Verify the agent works without "Error in post_writer" messages

## Expected Results

### Before Fix:
- ❌ "Error in post_writer" every ~5 seconds
- ❌ Agents stuck in error loops
- ❌ Unreliable message reception
- ❌ Connection degradation over time

### After Fix:
- ✅ No "Error in post_writer" messages
- ✅ Stable message reception and processing
- ✅ Automatic connection refresh every 10 operations
- ✅ Reliable long-term operation
- ✅ Clean operation cycles with proper logging
- ✅ Graceful error recovery

## Configuration Parameters

You can adjust these parameters based on your specific needs:

```python
max_operations_before_refresh = 10    # How many operations before refreshing connection
max_consecutive_errors = 3            # How many errors before forcing connection refresh
timeout_ms = 3000                     # wait_for_mentions timeout in milliseconds
operation_sleep = 1                   # Seconds to sleep between operations
error_sleep = 3                       # Seconds to sleep after errors
connection_error_sleep = 10           # Seconds to sleep after connection errors
```

## Monitoring and Debugging

The fix includes comprehensive logging to help you monitor your agents:

- `"Creating new MCP client connection"` - New connection being established
- `"Starting agent invocation #X"` - Operation counter for tracking
- `"Completed agent invocation successfully"` - Successful operation
- `"Completed X operations, refreshing connection"` - Planned connection refresh
- `"Too many consecutive errors, refreshing connection"` - Error-triggered refresh

## Compatibility

This fix is specifically designed for:
- `langchain-mcp-adapters==0.0.10`
- Coral Protocol servers
- Python asyncio-based agents
- SSE transport connections

The fix maintains full backward compatibility with existing agent functionality while adding connection resilience.

## Notes

- The fix works around the MCP adapter's connection timeout limitations rather than fixing the underlying library issue
- All agent functionality remains intact - this only improves connection stability
- The shorter timeouts actually make the system more responsive
- Connection refresh is proactive, preventing issues before they occur
- The fix has been tested and confirmed to eliminate "Error in post_writer" issues completely

---

**Last Updated:** June 23, 2025  
**Tested With:** langchain-mcp-adapters==0.0.10, Coral Protocol  
**Status:** Production Ready ✅
