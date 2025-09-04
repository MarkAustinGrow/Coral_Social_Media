import { NextRequest, NextResponse } from 'next/server'

// BASIC ROUTE TEST - This should appear in logs if route is called
console.log('🔥 [ROUTE TEST] Interface Agent route file loaded at:', new Date().toISOString())

// Enhanced logging utility
function logWithTimestamp(level: string, message: string, data?: any) {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] [${level}] [Interface Agent API] ${message}`
  
  if (data) {
    console.log(logMessage, data)
  } else {
    console.log(logMessage)
  }
}

// Store active agent sessions - simplified approach
const activeSessions = new Map<string, {
  writer: WritableStreamDefaultWriter,
  conversationState: 'waiting_for_user' | 'processing',
  agentProcess: any
}>()

export async function POST(request: NextRequest) {
  logWithTimestamp('INFO', 'POST request received')
  
  try {
    logWithTimestamp('INFO', 'Parsing request body...')
    const { message, userId } = await request.json()
    logWithTimestamp('INFO', `Request data parsed`, { message: message?.substring(0, 100), userId })

    if (!userId) {
      logWithTimestamp('ERROR', 'No userId provided')
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    logWithTimestamp('INFO', 'Checking for existing session...', { userId })
    // Create or get existing session
    let session = activeSessions.get(userId)
    
    if (!session) {
      logWithTimestamp('INFO', 'Creating new session...', { userId })
      // Start new Interface Agent session
      const stream = new TransformStream()
      const writer = stream.writable.getWriter()
      
      session = {
        writer,
        conversationState: 'processing',
        agentProcess: null
      }
      
      logWithTimestamp('INFO', 'Storing session in activeSessions...', { userId, sessionCount: activeSessions.size + 1 })
      activeSessions.set(userId, session)
      
      logWithTimestamp('INFO', 'Starting Python Interface Agent...', { userId })
      // Start the Python Interface Agent process directly
      setTimeout(() => {
        startPythonInterfaceAgent(userId, session, message).catch(error => {
          logWithTimestamp('ERROR', 'Error in startPythonInterfaceAgent', { userId, error: error.message })
        })
      }, 0)
      
      logWithTimestamp('INFO', 'Returning SSE stream...', { userId })
      // Return the stream for real-time communication with proper headers
      return new Response(stream.readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'X-Accel-Buffering': 'no', // Disable nginx buffering
          'Transfer-Encoding': 'chunked'
        },
      })
    }

    logWithTimestamp('INFO', 'Using existing session...', { userId, conversationState: session.conversationState })
    // Handle user response for existing session
    if (session.conversationState === 'waiting_for_user' && session.agentProcess) {
      logWithTimestamp('INFO', 'User response received for existing session', { userId, message: message?.substring(0, 100) })
      
      // Send the user input to the Python process
      try {
        logWithTimestamp('INFO', 'Writing to Python process stdin...', { userId })
        session.agentProcess.stdin.write(message + '\n')
        session.conversationState = 'processing'
        logWithTimestamp('INFO', 'Message sent to Python process successfully', { userId })
        
        return NextResponse.json({ success: true, sent: true })
      } catch (error: any) {
        logWithTimestamp('ERROR', 'Error sending to Python process', { userId, error: error.message })
        return NextResponse.json({ error: 'Failed to send message to agent' }, { status: 500 })
      }
    }

    logWithTimestamp('WARN', 'Agent not ready for user input', { 
      userId, 
      conversationState: session.conversationState, 
      hasAgentProcess: !!session.agentProcess 
    })
    return NextResponse.json({ error: 'Agent not ready or not waiting for response' }, { status: 503 })
    
  } catch (error: any) {
    logWithTimestamp('ERROR', 'Critical error in POST handler', { error: error.message, stack: error.stack })
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}

async function startPythonInterfaceAgent(userId: string, session: any, initialMessage: string) {
  const writer = session.writer
  const { spawn } = require('child_process')
  const path = require('path')
  
  try {
    logWithTimestamp('INFO', 'Starting Python Interface Agent', { userId })
    
    await writer.write(`data: ${JSON.stringify({
      type: 'status',
      message: 'Starting Interface Agent...',
      timestamp: new Date().toISOString()
    })}\n\n`)

    // Get the root directory (where the Python scripts are located)
    const rootDir = path.resolve(process.cwd(), '..')
    const pythonScript = path.join(rootDir, '0_langchain_interface.py')
    
    logWithTimestamp('INFO', 'Python script path resolved', { userId, rootDir, pythonScript })
    
    // Set environment variables for the Python process
    const env = { 
      ...process.env,
      AGENT_USER_ID: userId,
      PYTHONUNBUFFERED: '1' // Ensure real-time output
    }
    
    logWithTimestamp('INFO', 'Environment variables set', { userId, AGENT_USER_ID: userId })
    
    // Start the Python Interface Agent process using virtual environment
    logWithTimestamp('INFO', 'Spawning Python process with virtual environment...', { userId })
    const venvPythonPath = path.join(rootDir, 'coral_env', 'bin', 'python')
    logWithTimestamp('INFO', 'Virtual environment Python path', { userId, venvPythonPath })
    
    const agentProcess = spawn(venvPythonPath, [pythonScript], {
      cwd: rootDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: env
    })
    
    logWithTimestamp('INFO', 'Python process spawned', { userId, pid: agentProcess.pid })
    session.agentProcess = agentProcess
    
// Handle stdout (agent output) with improved error handling and reconnection logic
    agentProcess.stdout.on('data', async (data: Buffer) => {
      const output = data.toString()
      logWithTimestamp('INFO', 'Python stdout received', { userId, outputLength: output.length, preview: output.substring(0, 200) })
      
      try {
        // Parse the output and send appropriate SSE messages
        const lines = output.split('\n').filter(line => line.trim())
        logWithTimestamp('INFO', 'Processing stdout lines', { userId, lineCount: lines.length })
        
        for (const line of lines) {
          // Check if this is the agent asking a question
          if (line.includes('Agent asks:')) {
            const question = line.replace(/.*Agent asks:\s*/, '').trim()
            logWithTimestamp('INFO', 'Agent question detected', { userId, question: question.substring(0, 100) })
            
            await writer.write(`data: ${JSON.stringify({
              type: 'agent_question',
              question: question,
              timestamp: new Date().toISOString()
            })}\n\n`)
            
            session.conversationState = 'waiting_for_user'
            logWithTimestamp('INFO', 'Conversation state changed to waiting_for_user', { userId })
          }
          // Check for heartbeat messages
          else if (line.includes('[WEB_DEBUG] [INFO] Heartbeat successful')) {
            logWithTimestamp('INFO', 'Heartbeat successful', { userId })
            // No need to send this to the client, it's just for internal monitoring
          }
          // Check for heartbeat failure messages
          else if (line.includes('[WEB_DEBUG] [ERROR] Heartbeat failed')) {
            logWithTimestamp('WARN', 'Heartbeat failed, agent will attempt reconnection', { userId })
            await writer.write(`data: ${JSON.stringify({
              type: 'status',
              message: 'Connection issue detected, attempting to reconnect automatically...',
              timestamp: new Date().toISOString()
            })}\n\n`)
          }
          // Check for reconnection messages with more detailed information
          else if (line.includes('Retrying after ClosedResourceError')) {
            const attemptMatch = line.match(/attempt (\d+) of (\d+)/)
            const attempt = attemptMatch ? attemptMatch[1] : '?'
            const maxAttempts = attemptMatch ? attemptMatch[2] : '?'
            
            logWithTimestamp('INFO', `Agent reconnection attempt ${attempt}/${maxAttempts}`, { userId })
            await writer.write(`data: ${JSON.stringify({
              type: 'status',
              message: `Reconnecting to server (attempt ${attempt}/${maxAttempts})...`,
              timestamp: new Date().toISOString()
            })}\n\n`)
          }
          // Check for backoff messages
          else if (line.includes('Backing off for')) {
            const secondsMatch = line.match(/Backing off for ([\d\.]+) seconds/)
            const seconds = secondsMatch ? secondsMatch[1] : '?'
            
            logWithTimestamp('INFO', `Agent backing off for ${seconds} seconds`, { userId })
            await writer.write(`data: ${JSON.stringify({
              type: 'status',
              message: `Waiting ${seconds} seconds before reconnection attempt...`,
              timestamp: new Date().toISOString()
            })}\n\n`)
          }
          // Check for connection success messages
          else if (line.includes('Connected to MCP server')) {
            logWithTimestamp('INFO', 'MCP server connection detected', { userId })
            await writer.write(`data: ${JSON.stringify({
              type: 'status',
              message: 'Connected to Coral server successfully!',
              timestamp: new Date().toISOString()
            })}\n\n`)
          }
          else if (line.includes('Available Coral tools:')) {
            logWithTimestamp('INFO', 'Coral tools discovery detected', { userId })
            await writer.write(`data: ${JSON.stringify({
              type: 'status',
              message: 'Coral tools discovered and ready',
              timestamp: new Date().toISOString()
            })}\n\n`)
          }
          // Check for error messages with better categorization
          else if (line.includes('[WEB_DEBUG] [ERROR]')) {
            // This is a debug error from the agent
            logWithTimestamp('ERROR', 'Python agent debug error detected', { userId, error: line })
            
            // Check if it's a network error
            if (line.includes('network') || line.includes('connection') || line.includes('timeout')) {
              await writer.write(`data: ${JSON.stringify({
                type: 'status',
                message: 'Network issue detected. The system will attempt to reconnect automatically.',
                timestamp: new Date().toISOString()
              })}\n\n`)
            } else {
              // Other errors
              await writer.write(`data: ${JSON.stringify({
                type: 'error',
                message: line.replace(/\[WEB_DEBUG\] \[ERROR\] /, ''),
                timestamp: new Date().toISOString()
              })}\n\n`)
            }
          }
          else if (line.includes('ERROR') || line.includes('Error')) {
            logWithTimestamp('ERROR', 'Python agent error detected', { userId, error: line })
            await writer.write(`data: ${JSON.stringify({
              type: 'error',
              message: line,
              timestamp: new Date().toISOString()
            })}\n\n`)
          }
          else if (line.trim() && !line.includes('INFO') && !line.includes('HTTP Request')) {
            // Send other significant output
            logWithTimestamp('INFO', 'Sending agent output', { userId, output: line.substring(0, 100) })
            await writer.write(`data: ${JSON.stringify({
              type: 'agent_output',
              message: line,
              timestamp: new Date().toISOString()
            })}\n\n`)
          }
        }
      } catch (error: any) {
        logWithTimestamp('ERROR', 'Error processing stdout', { userId, error: error.message })
        
        // Try to notify the client about the error
        try {
          await writer.write(`data: ${JSON.stringify({
            type: 'error',
            message: `Error processing agent output: ${error.message}`,
            timestamp: new Date().toISOString()
          })}\n\n`)
        } catch (writeError: any) {
          logWithTimestamp('ERROR', 'Failed to send error to client', { userId, error: writeError.message })
        }
      }
    })

// Handle stderr (agent errors) with improved error categorization and recovery
    agentProcess.stderr.on('data', async (data: Buffer) => {
      const error = data.toString()
      logWithTimestamp('ERROR', 'Python stderr received', { userId, error: error.substring(0, 200) })
      
      try {
        // Check if this is a network-related error with more specific categorization
        const isNetworkError = error.includes('ClosedResourceError') || 
                              error.includes('ConnectionError') || 
                              error.includes('TimeoutError') ||
                              error.includes('network error') ||
                              error.includes('Connection refused') ||
                              error.includes('Cannot connect') ||
                              error.includes('SSLError') ||
                              error.includes('socket.timeout');
        
        const isAuthError = error.includes('Authentication') || 
                           error.includes('Unauthorized') || 
                           error.includes('Permission denied') ||
                           error.includes('403 Forbidden');
        
        const isServerError = error.includes('500 Internal Server Error') || 
                             error.includes('502 Bad Gateway') || 
                             error.includes('503 Service Unavailable') ||
                             error.includes('504 Gateway Timeout');
        
        if (isNetworkError) {
          // For network errors, send a more user-friendly message with recovery information
          await writer.write(`data: ${JSON.stringify({
            type: 'status',
            message: 'Network connection issue detected. The system will attempt to reconnect automatically.',
            timestamp: new Date().toISOString()
          })}\n\n`)
        } else if (isAuthError) {
          // For authentication errors
          await writer.write(`data: ${JSON.stringify({
            type: 'error',
            message: 'Authentication error. Please check your credentials or login again.',
            timestamp: new Date().toISOString()
          })}\n\n`)
        } else if (isServerError) {
          // For server errors
          await writer.write(`data: ${JSON.stringify({
            type: 'error',
            message: 'Coral server is experiencing issues. Please try again later.',
            timestamp: new Date().toISOString()
          })}\n\n`)
        } else {
          // For other errors, send a more structured error message
          // Extract the most relevant part of the error message
          let cleanError = error.trim()
          
          // If it's a traceback, try to extract the last line which usually has the error message
          if (error.includes('Traceback')) {
            const lines = error.split('\n').filter(line => line.trim())
            if (lines.length > 0) {
              cleanError = lines[lines.length - 1].trim()
            }
          }
          
          await writer.write(`data: ${JSON.stringify({
            type: 'error',
            message: `Agent Error: ${cleanError}`,
            timestamp: new Date().toISOString()
          })}\n\n`)
        }
      } catch (writeError: any) {
        logWithTimestamp('ERROR', 'Error writing stderr to SSE stream', { userId, error: writeError.message })
      }
    })

    // Handle process exit
    agentProcess.on('exit', async (code: number | null) => {
      logWithTimestamp('INFO', 'Python process exited', { userId, exitCode: code })
      
      try {
        await writer.write(`data: ${JSON.stringify({
          type: 'status',
          message: `Interface Agent session ended (exit code: ${code})`,
          timestamp: new Date().toISOString()
        })}\n\n`)
      } catch (writeError: any) {
        logWithTimestamp('ERROR', 'Error writing exit message to SSE stream', { userId, error: writeError.message })
      }
      
      // Clean up session
      logWithTimestamp('INFO', 'Cleaning up session after process exit', { userId })
      activeSessions.delete(userId)
      
      try {
        await writer.close()
        logWithTimestamp('INFO', 'SSE writer closed successfully', { userId })
      } catch (closeError: any) {
        logWithTimestamp('ERROR', 'Error closing SSE writer', { userId, error: closeError.message })
      }
    })

// Handle process error with improved error handling and recovery
    agentProcess.on('error', async (error: Error) => {
      logWithTimestamp('ERROR', 'Python process error', { userId, error: error.message, stack: error.stack })
      
      try {
        // More comprehensive error categorization
        const isNetworkError = error.message.includes('network') || 
                              error.message.includes('connection') || 
                              error.message.includes('timeout') ||
                              error.message.includes('closed') ||
                              error.message.includes('ECONNREFUSED') ||
                              error.message.includes('ENOTFOUND') ||
                              error.message.includes('ETIMEDOUT');
        
        const isPermissionError = error.message.includes('permission') || 
                                 error.message.includes('EACCES');
        
        const isResourceError = error.message.includes('resource') || 
                               error.message.includes('memory') || 
                               error.message.includes('ENOMEM');
        
        if (isNetworkError) {
          // For network errors, send a more user-friendly message with recovery information
          await writer.write(`data: ${JSON.stringify({
            type: 'status',
            message: 'Network connection issue detected. The system will attempt to reconnect automatically.',
            timestamp: new Date().toISOString()
          })}\n\n`)
          
          // Don't clean up the session yet, give the reconnection logic a chance to work
          logWithTimestamp('INFO', 'Network error detected, waiting for reconnection', { userId })
          
          // Set a timeout to clean up the session if reconnection doesn't happen
          setTimeout(async () => {
            // Check if the session still exists and the process is still in error state
            const currentSession = activeSessions.get(userId)
            if (currentSession && (!currentSession.agentProcess || currentSession.agentProcess.killed)) {
              logWithTimestamp('INFO', 'Reconnection timeout, cleaning up session', { userId })
              activeSessions.delete(userId)
              
              try {
                await writer.write(`data: ${JSON.stringify({
                  type: 'error',
                  message: 'Failed to reconnect after multiple attempts. Please try again later.',
                  timestamp: new Date().toISOString()
                })}\n\n`)
                
                await writer.close()
                logWithTimestamp('INFO', 'SSE writer closed after reconnection timeout', { userId })
              } catch (closeError: any) {
                logWithTimestamp('ERROR', 'Error closing SSE writer after reconnection timeout', { userId, error: closeError.message })
              }
            }
          }, 60000) // 60 second timeout for reconnection (increased from 30s)
          
        } else if (isPermissionError) {
          // For permission errors
          await writer.write(`data: ${JSON.stringify({
            type: 'error',
            message: `Permission error: ${error.message}. Please contact support.`,
            timestamp: new Date().toISOString()
          })}\n\n`)
          
          // Clean up session
          logWithTimestamp('INFO', 'Cleaning up session after permission error', { userId })
          activeSessions.delete(userId)
          
          try {
            await writer.close()
            logWithTimestamp('INFO', 'SSE writer closed after permission error', { userId })
          } catch (closeError: any) {
            logWithTimestamp('ERROR', 'Error closing SSE writer after permission error', { userId, error: closeError.message })
          }
        } else if (isResourceError) {
          // For resource errors
          await writer.write(`data: ${JSON.stringify({
            type: 'error',
            message: `Resource error: ${error.message}. The server may be overloaded.`,
            timestamp: new Date().toISOString()
          })}\n\n`)
          
          // Clean up session
          logWithTimestamp('INFO', 'Cleaning up session after resource error', { userId })
          activeSessions.delete(userId)
          
          try {
            await writer.close()
            logWithTimestamp('INFO', 'SSE writer closed after resource error', { userId })
          } catch (closeError: any) {
            logWithTimestamp('ERROR', 'Error closing SSE writer after resource error', { userId, error: closeError.message })
          }
        } else {
          // For other errors, send a more structured error message and clean up
          await writer.write(`data: ${JSON.stringify({
            type: 'error',
            message: `Failed to start Interface Agent: ${error.message}`,
            timestamp: new Date().toISOString()
          })}\n\n`)
          
          // Clean up session
          logWithTimestamp('INFO', 'Cleaning up session after process error', { userId })
          activeSessions.delete(userId)
          
          try {
            await writer.close()
            logWithTimestamp('INFO', 'SSE writer closed after process error', { userId })
          } catch (closeError: any) {
            logWithTimestamp('ERROR', 'Error closing SSE writer after process error', { userId, error: closeError.message })
          }
        }
      } catch (writeError: any) {
        logWithTimestamp('ERROR', 'Error writing process error to SSE stream', { userId, error: writeError.message })
        
        // Clean up session
        logWithTimestamp('INFO', 'Cleaning up session after write error', { userId })
        activeSessions.delete(userId)
        
        try {
          await writer.close()
          logWithTimestamp('INFO', 'SSE writer closed after write error', { userId })
        } catch (closeError: any) {
          logWithTimestamp('ERROR', 'Error closing SSE writer after write error', { userId, error: closeError.message })
        }
      }
    })

    logWithTimestamp('INFO', 'Python Interface Agent event handlers registered', { userId })
    
    // Send initial message if provided
    if (initialMessage) {
      logWithTimestamp('INFO', 'Scheduling initial message send', { userId, message: initialMessage.substring(0, 100) })
      // Wait a moment for the process to be ready, then send the initial message
      setTimeout(() => {
        if (agentProcess && !agentProcess.killed) {
          try {
            logWithTimestamp('INFO', 'Sending initial message to Python process', { userId })
            agentProcess.stdin.write(initialMessage + '\n')
            logWithTimestamp('INFO', 'Initial message sent successfully', { userId })
          } catch (error: any) {
            logWithTimestamp('ERROR', 'Error sending initial message', { userId, error: error.message })
          }
        } else {
          logWithTimestamp('WARN', 'Cannot send initial message - process not available', { userId, killed: agentProcess?.killed })
        }
      }, 3000) // Wait 3 seconds for the agent to be ready
    } else {
      logWithTimestamp('INFO', 'No initial message to send', { userId })
    }
    
  } catch (error: any) {
    console.error(`[Interface Agent] Error starting Python agent:`, error)
    
    await writer.write(`data: ${JSON.stringify({
      type: 'error',
      message: `Error starting Interface Agent: ${error.message}`,
      timestamp: new Date().toISOString()
    })}\n\n`)
    
    // Clean up session
    activeSessions.delete(userId)
    
    try {
      await writer.close()
    } catch (closeError) {
      console.error('Error closing writer:', closeError)
    }
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 })
  }

  // Check if user has an active session
  const session = activeSessions.get(userId)
  
  return NextResponse.json({
    hasActiveSession: !!session,
    conversationState: session?.conversationState || 'idle'
  })
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 })
  }

  // Stop the Interface Agent session
  const session = activeSessions.get(userId)
  if (session) {
    // Kill the Python process
    if (session.agentProcess && !session.agentProcess.killed) {
      session.agentProcess.kill('SIGTERM')
    }
    
    // Close the writer
    try {
      await session.writer.close()
    } catch (error) {
      console.error('Error closing writer:', error)
    }
    
    activeSessions.delete(userId)
  }

  return NextResponse.json({ success: true })
}
