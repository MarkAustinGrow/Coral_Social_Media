# Interface Agent Timeout Debugging - Enhanced Logging Implementation

## Overview
Implemented comprehensive logging system to diagnose Interface Agent timeout issues that occur only when accessed through the web interface, not when run from command line.

## Problem Description
- Interface Agent works fine when run directly from SSH terminal
- When accessed via web interface, agent eventually crashes with:
  - `Failed to load resource: net::ERR_INCOMPLETE_CHUNKED_ENCODING`
  - `Interface Agent error: TypeError: network error`
  - Error message in chat: `❌ Error: network error`

## Root Cause Analysis
The issue appears to be in the **web-to-Python bridge** - specifically how the Node.js route handles the Python process and SSE streaming, rather than a fundamental agent problem.

## Enhanced Logging Implementation

### 1. Node.js Route Logging (`Web_Interface/app/api/coral/interface-agent/route.ts`)

#### Added Enhanced Logging Utility:
```typescript
function logWithTimestamp(level: string, message: string, data?: any) {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] [${level}] [Interface Agent API] ${message}`
  
  if (data) {
    console.log(logMessage, data)
  } else {
    console.log(logMessage)
  }
}
```

#### Comprehensive Request Tracking:
- **POST Request Lifecycle**: Full tracking from request receipt to response
- **Session Management**: Detailed logging of session creation and retrieval
- **Python Process Spawning**: Complete process lifecycle tracking
- **SSE Stream Management**: Detailed stream creation and data flow logging
- **Error Handling**: Enhanced error logging with context and stack traces

#### Python Process Event Logging:
- **stdout Processing**: Line-by-line processing with content analysis
- **stderr Handling**: Error stream processing with detailed error context
- **Process Exit**: Exit code tracking and cleanup logging
- **Process Errors**: Comprehensive error handling with cleanup tracking

### 2. Python Agent Logging (`0_langchain_interface.py`)

#### Added Web Debug Logging Function:
```python
def web_debug_log(level: str, message: str, data: dict = None):
    """Enhanced logging specifically for web interface debugging"""
    timestamp = datetime.now().isoformat()
    log_data = {"timestamp": timestamp, "level": level, "message": message}
    if data:
        log_data.update(data)
    
    # Print to stdout for Node.js to capture
    print(f"[WEB_DEBUG] [{level}] {message}", flush=True)
    if data:
        print(f"[WEB_DEBUG] Data: {data}", flush=True)
    
    # Also log normally
    if level == "ERROR":
        logger.error(f"{message} - Data: {data}")
    elif level == "WARN":
        logger.warning(f"{message} - Data: {data}")
    else:
        logger.info(f"{message} - Data: {data}")
```

#### Comprehensive Execution Tracking:
- **Startup Detection**: Web interface vs command line execution detection
- **User Context**: User ID retrieval and validation logging
- **MCP Connection**: Detailed connection attempt and success/failure logging
- **Tool Discovery**: Coral tools retrieval and validation
- **Agent Execution**: Step-by-step agent executor creation and invocation
- **Error Handling**: Detailed error logging with retry attempt tracking

### 3. Frontend SSE Stream Logging (`Web_Interface/app/coral-inspector/page.tsx`)

#### Enhanced Stream Processing:
- **Request Initiation**: Detailed HTTP request logging
- **Response Analysis**: Response headers and status code logging
- **Stream Reading**: Chunk-by-chunk processing with size tracking
- **Data Processing**: Line-by-line SSE data parsing with error handling
- **Error Tracking**: Comprehensive error logging with type and stack trace analysis

#### Key Logging Points:
```typescript
console.log('[FRONTEND] Starting Interface Agent session for user:', user.id)
console.log('[FRONTEND] Response received:', {
  status: response.status,
  statusText: response.statusText,
  ok: response.ok,
  headers: Object.fromEntries(response.headers.entries())
})
console.log('[FRONTEND] Chunk', chunkCount, 'received, size:', value?.length)
```

## Diagnostic Capabilities

### 1. Request Flow Tracking
- Complete request lifecycle from frontend to Python agent
- Session management and state tracking
- Process spawning and lifecycle management

### 2. Data Flow Analysis
- SSE stream chunk processing
- Python stdout/stderr capture and forwarding
- JSON parsing and error handling

### 3. Error Isolation
- Distinguish between Node.js, Python, and frontend errors
- Track exact failure points in the communication chain
- Identify timeout vs connection vs parsing issues

### 4. Performance Monitoring
- Chunk processing times
- Response latency tracking
- Process startup and connection times

## Expected Log Output

### Successful Flow:
```
[2025-07-28T14:01:00.000Z] [INFO] [Interface Agent API] POST request received
[2025-07-28T14:01:00.001Z] [INFO] [Interface Agent API] Request data parsed { message: "Hello", userId: "user123" }
[2025-07-28T14:01:00.002Z] [INFO] [Interface Agent API] Creating new session... { userId: "user123" }
[2025-07-28T14:01:00.003Z] [INFO] [Interface Agent API] Python process spawned { userId: "user123", pid: 12345 }
[WEB_DEBUG] [INFO] Interface Agent starting { is_web_interface: true, user_id_env: "user123" }
[WEB_DEBUG] [INFO] MCP client connected successfully { user_id: "user123" }
[FRONTEND] Chunk 1 received, size: 156
[FRONTEND] Received SSE data: { type: "status", message: "Connected to Coral server successfully!" }
```

### Error Flow:
```
[2025-07-28T14:01:30.000Z] [ERROR] [Interface Agent API] Python stderr received { userId: "user123", error: "Connection timeout" }
[WEB_DEBUG] [ERROR] Unexpected error on attempt 1 { user_id: "user123", error: "Connection timeout", type: "TimeoutError" }
[FRONTEND] Stream reading error: TypeError: network error
[FRONTEND] Error type: TypeError
[FRONTEND] Error message: network error
```

## Next Steps for Diagnosis

### 1. Log Analysis
- Monitor server logs during web interface usage
- Compare successful command line execution logs
- Identify exact failure point in the communication chain

### 2. Timeout Investigation
- Check for specific timeout patterns
- Analyze chunk processing delays
- Monitor Python process lifecycle

### 3. Connection Stability
- Monitor SSE connection health
- Check for network-level issues
- Analyze browser timeout behavior

### 4. Process Management
- Monitor Python process resource usage
- Check for process hanging or zombie processes
- Analyze stdin/stdout buffer management

## Files Modified

### Node.js Backend:
- `Web_Interface/app/api/coral/interface-agent/route.ts` - Enhanced logging throughout

### Python Agent:
- `0_langchain_interface.py` - Added web debug logging and execution tracking

### Frontend:
- `Web_Interface/app/coral-inspector/page.tsx` - Enhanced SSE stream logging

## Usage Instructions

### 1. Enable Logging
All logging is automatically enabled when the enhanced files are deployed.

### 2. Monitor Logs
- **Server Logs**: Check PM2 logs or console output for Node.js and Python logging
- **Browser Console**: Monitor frontend logging for SSE stream processing
- **Network Tab**: Check for HTTP request/response details

### 3. Reproduce Issue
1. Access Interface Agent via web interface
2. Send a message that typically causes timeout
3. Monitor all three logging sources simultaneously
4. Identify exact failure point and error sequence

### 4. Analysis
- Compare web interface logs with command line execution
- Look for timeout patterns, connection drops, or parsing errors
- Identify if issue is in Node.js → Python communication or Python → Node.js response

## Expected Outcome

This enhanced logging system will provide complete visibility into the Interface Agent timeout issue, allowing for:

1. **Precise Error Identification**: Exact point of failure in the communication chain
2. **Root Cause Analysis**: Whether issue is timeout, connection, parsing, or process management
3. **Targeted Fix Development**: Specific solution based on identified root cause
4. **Verification**: Ability to confirm fix effectiveness through detailed logging

The comprehensive logging covers every aspect of the web interface → Node.js → Python → Coral server communication flow, ensuring no failure point goes undetected.
