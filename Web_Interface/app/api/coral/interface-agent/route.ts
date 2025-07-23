import { NextRequest, NextResponse } from 'next/server'

// BASIC ROUTE TEST - This should appear in logs if route is called
console.log('🔥 [ROUTE TEST] Interface Agent route file loaded at:', new Date().toISOString())

// Store active agent sessions - simplified approach
const activeSessions = new Map<string, {
  writer: WritableStreamDefaultWriter,
  conversationState: 'waiting_for_user' | 'processing',
  agentProcess: any
}>()

export async function POST(request: NextRequest) {
  console.log('🚀 [Interface Agent API] POST request received')
  
  try {
    console.log('🔧 [Interface Agent API] Parsing request body...')
    const { message, userId } = await request.json()
    console.log(`📝 [Interface Agent API] Request data: message="${message}", userId="${userId}"`)

    if (!userId) {
      console.log('❌ [Interface Agent API] No userId provided')
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    console.log('🔍 [Interface Agent API] Checking for existing session...')
    // Create or get existing session
    let session = activeSessions.get(userId)
    
    if (!session) {
      console.log('🆕 [Interface Agent API] Creating new session...')
      // Start new Interface Agent session
      const stream = new TransformStream()
      const writer = stream.writable.getWriter()
      
      session = {
        writer,
        conversationState: 'processing',
        agentProcess: null
      }
      
      console.log('💾 [Interface Agent API] Storing session in activeSessions...')
      activeSessions.set(userId, session)
      
      console.log('🚀 [Interface Agent API] Starting Python Interface Agent...')
      // Start the Python Interface Agent process directly
      setTimeout(() => {
        startPythonInterfaceAgent(userId, session, message).catch(error => {
          console.error('❌ [Interface Agent API] Error in startPythonInterfaceAgent:', error)
        })
      }, 0)
      
      console.log('📡 [Interface Agent API] Returning SSE stream...')
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

    console.log('🔄 [Interface Agent API] Using existing session...')
    // Handle user response for existing session
    if (session.conversationState === 'waiting_for_user' && session.agentProcess) {
      console.log(`[Interface Agent] User response received: ${message}`)
      
      // Send the user input to the Python process
      try {
        session.agentProcess.stdin.write(message + '\n')
        session.conversationState = 'processing'
        
        return NextResponse.json({ success: true, sent: true })
      } catch (error) {
        console.error('❌ [Interface Agent API] Error sending to Python process:', error)
        return NextResponse.json({ error: 'Failed to send message to agent' }, { status: 500 })
      }
    }

    console.log('⚠️ [Interface Agent API] Agent not ready for user input')
    return NextResponse.json({ error: 'Agent not ready or not waiting for response' }, { status: 503 })
    
  } catch (error: any) {
    console.error('❌ [Interface Agent API] Critical error in POST handler:', error)
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
    console.log(`[Interface Agent] Starting Python Interface Agent for user: ${userId}`)
    
    await writer.write(`data: ${JSON.stringify({
      type: 'status',
      message: 'Starting Interface Agent...',
      timestamp: new Date().toISOString()
    })}\n\n`)

    // Get the root directory (where the Python scripts are located)
    const rootDir = path.resolve(process.cwd(), '..')
    const pythonScript = path.join(rootDir, '0_langchain_interface.py')
    
    console.log(`[Interface Agent] Starting Python process: ${pythonScript}`)
    
    // Set environment variables for the Python process
    const env = { 
      ...process.env,
      AGENT_USER_ID: userId,
      PYTHONUNBUFFERED: '1' // Ensure real-time output
    }
    
    // Start the Python Interface Agent process
    const agentProcess = spawn('python3', [pythonScript], {
      cwd: rootDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: env
    })
    
    session.agentProcess = agentProcess
    
    // Handle stdout (agent output)
    agentProcess.stdout.on('data', async (data: Buffer) => {
      const output = data.toString()
      console.log(`[Python Agent] ${output}`)
      
      // Parse the output and send appropriate SSE messages
      const lines = output.split('\n').filter(line => line.trim())
      
      for (const line of lines) {
        // Check if this is the agent asking a question
        if (line.includes('Agent asks:')) {
          const question = line.replace(/.*Agent asks:\s*/, '').trim()
          
          await writer.write(`data: ${JSON.stringify({
            type: 'agent_question',
            question: question,
            timestamp: new Date().toISOString()
          })}\n\n`)
          
          session.conversationState = 'waiting_for_user'
        }
        // Check for other important output
        else if (line.includes('Connected to MCP server')) {
          await writer.write(`data: ${JSON.stringify({
            type: 'status',
            message: 'Connected to Coral server successfully!',
            timestamp: new Date().toISOString()
          })}\n\n`)
        }
        else if (line.includes('Available Coral tools:')) {
          await writer.write(`data: ${JSON.stringify({
            type: 'status',
            message: 'Coral tools discovered and ready',
            timestamp: new Date().toISOString()
          })}\n\n`)
        }
        else if (line.includes('ERROR') || line.includes('Error')) {
          await writer.write(`data: ${JSON.stringify({
            type: 'error',
            message: line,
            timestamp: new Date().toISOString()
          })}\n\n`)
        }
        else if (line.trim() && !line.includes('INFO') && !line.includes('HTTP Request')) {
          // Send other significant output
          await writer.write(`data: ${JSON.stringify({
            type: 'agent_output',
            message: line,
            timestamp: new Date().toISOString()
          })}\n\n`)
        }
      }
    })

    // Handle stderr (agent errors)
    agentProcess.stderr.on('data', async (data: Buffer) => {
      const error = data.toString()
      console.error(`[Python Agent] ERROR: ${error}`)
      
      await writer.write(`data: ${JSON.stringify({
        type: 'error',
        message: `Agent Error: ${error}`,
        timestamp: new Date().toISOString()
      })}\n\n`)
    })

    // Handle process exit
    agentProcess.on('exit', async (code: number | null) => {
      console.log(`[Interface Agent] Python process exited with code ${code}`)
      
      await writer.write(`data: ${JSON.stringify({
        type: 'status',
        message: `Interface Agent session ended (exit code: ${code})`,
        timestamp: new Date().toISOString()
      })}\n\n`)
      
      // Clean up session
      activeSessions.delete(userId)
      
      try {
        await writer.close()
      } catch (closeError) {
        console.error('Error closing writer:', closeError)
      }
    })

    // Handle process error
    agentProcess.on('error', async (error: Error) => {
      console.error(`[Interface Agent] Error starting Python process:`, error)
      
      await writer.write(`data: ${JSON.stringify({
        type: 'error',
        message: `Failed to start Interface Agent: ${error.message}`,
        timestamp: new Date().toISOString()
      })}\n\n`)
      
      // Clean up session
      activeSessions.delete(userId)
      
      try {
        await writer.close()
      } catch (closeError) {
        console.error('Error closing writer:', closeError)
      }
    })

    console.log(`[Interface Agent] Python Interface Agent started for user ${userId}`)
    
    // Send initial message if provided
    if (initialMessage) {
      // Wait a moment for the process to be ready, then send the initial message
      setTimeout(() => {
        if (agentProcess && !agentProcess.killed) {
          try {
            agentProcess.stdin.write(initialMessage + '\n')
          } catch (error) {
            console.error('Error sending initial message:', error)
          }
        }
      }, 3000) // Wait 3 seconds for the agent to be ready
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
