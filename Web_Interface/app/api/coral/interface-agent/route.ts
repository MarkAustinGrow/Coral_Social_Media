import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'

// Store active agent sessions
const activeSessions = new Map<string, {
  process: any,
  writer: WritableStreamDefaultWriter,
  messageQueue: string[],
  waitingForResponse: boolean
}>()

export async function POST(request: NextRequest) {
  const { message, userId } = await request.json()

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 })
  }

  // Create or get existing session
  let session = activeSessions.get(userId)
  
  if (!session) {
    // Start new Interface Agent session
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()
    
    session = {
      process: null,
      writer,
      messageQueue: [message], // Store the initial message
      waitingForResponse: false
    }
    
    activeSessions.set(userId, session)
    
    // Start the Python Interface Agent in the background
    startPythonInterfaceAgent(userId, session)
    
    // Return the stream for real-time communication
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  }

  // Send message to Python process if agent is running
  if (session.process && session.process.stdin) {
    if (session.waitingForResponse) {
      // Agent is waiting for a response to a question
      const userResponse = {
        type: 'user_response',
        content: message
      }
      session.process.stdin.write(JSON.stringify(userResponse) + '\n')
      session.waitingForResponse = false
    } else {
      // Send new user message
      const userMessage = {
        type: 'user_message',
        content: message
      }
      session.process.stdin.write(JSON.stringify(userMessage) + '\n')
    }
    return NextResponse.json({ success: true, sent: true })
  }

  return NextResponse.json({ error: 'Agent not ready' }, { status: 503 })
}

async function startPythonInterfaceAgent(userId: string, session: any) {
  try {
    const writer = session.writer
    
    // Send initial connection message
    await writer.write(`data: ${JSON.stringify({
      type: 'status',
      message: 'Starting Python Interface Agent...',
      timestamp: new Date().toISOString()
    })}\n\n`)

    // Get the project root directory (go up from Web_Interface)
    const projectRoot = path.resolve(process.cwd(), '..')
    const agentFilePath = '0_langchain_interface_web.py'
    const scriptPath = path.join(projectRoot, agentFilePath)
    
    // Check if the agent file exists
    if (!fs.existsSync(scriptPath)) {
      const errorMsg = `Interface Agent script not found: ${scriptPath}`
      console.error(errorMsg)
      await writer.write(`data: ${JSON.stringify({
        type: 'error',
        message: errorMsg,
        timestamp: new Date().toISOString()
      })}\n\n`)
      return
    }

    // Use the virtual environment wrapper script for production (same as other agents)
    const wrapperScript = path.join(projectRoot, 'run_agent_with_venv.sh')
    const useVirtualEnv = fs.existsSync(wrapperScript) && fs.existsSync(path.join(projectRoot, 'coral_env'))
    
    let pythonProcess: any
    
    if (useVirtualEnv) {
      // Use virtual environment wrapper with user context (same as other agents)
      console.log(`Using virtual environment wrapper for Interface Agent with user ${userId}`)
      await writer.write(`data: ${JSON.stringify({
        type: 'status',
        message: 'Using virtual environment...',
        timestamp: new Date().toISOString()
      })}\n\n`)
      
      pythonProcess = spawn('bash', [wrapperScript, userId, agentFilePath], {
        cwd: projectRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: true,
        shell: false
      })
    } else {
      // Fallback to direct Python execution
      const pythonExecutable = os.platform() === 'win32' ? 'python' : 'python3'
      
      console.log(`Fallback to direct Python execution for Interface Agent with user ${userId}`)
      await writer.write(`data: ${JSON.stringify({
        type: 'status',
        message: 'Using system Python...',
        timestamp: new Date().toISOString()
      })}\n\n`)
      
      // Prepare environment variables with user context
      const env = { ...process.env }
      env.AGENT_USER_ID = userId
      
      pythonProcess = spawn(pythonExecutable, [agentFilePath], {
        cwd: projectRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: true,
        shell: true,
        env: env
      })
    }

    if (!pythonProcess) {
      const errorMsg = 'Failed to spawn Python process'
      console.error(errorMsg)
      await writer.write(`data: ${JSON.stringify({
        type: 'error',
        message: errorMsg,
        timestamp: new Date().toISOString()
      })}\n\n`)
      return
    }

    session.process = pythonProcess
    
    console.log(`Started Interface Agent process with PID: ${pythonProcess.pid}`)
    await writer.write(`data: ${JSON.stringify({
      type: 'status',
      message: `Interface Agent process started (PID: ${pythonProcess.pid})`,
      timestamp: new Date().toISOString()
    })}\n\n`)

    // Handle stdout (JSON messages from Python)
    pythonProcess.stdout.on('data', async (data: any) => {
      const lines = data.toString().split('\n')
      for (const line of lines) {
        if (line.trim()) {
          try {
            const message = JSON.parse(line.trim())
            await handlePythonMessage(message, session)
          } catch (e) {
            // If it's not JSON, treat it as a regular log message
            console.log(`[Interface Agent] ${line.trim()}`)
            await writer.write(`data: ${JSON.stringify({
              type: 'log',
              message: line.trim(),
              timestamp: new Date().toISOString()
            })}\n\n`)
          }
        }
      }
    })

    // Handle stderr (logs from Python)
    pythonProcess.stderr.on('data', (data: any) => {
      const errorOutput = data.toString()
      console.log(`[Interface Agent] ERROR: ${errorOutput}`)
      // Don't send all stderr to web interface as it can be noisy
    })

    // Send initial message if one was provided
    if (session.messageQueue.length > 0) {
      const initialMessage = session.messageQueue[0]
      console.log(`Sending initial message to Interface Agent: ${initialMessage}`)
      
      // Wait a moment for the Python process to be ready
      setTimeout(() => {
        if (pythonProcess && pythonProcess.stdin) {
          const userMessage = {
            type: 'user_message',
            content: initialMessage
          }
          pythonProcess.stdin.write(JSON.stringify(userMessage) + '\n')
          session.messageQueue = [] // Clear the queue
        }
      }, 2000) // Wait 2 seconds for the agent to be ready
    }

    // Handle process exit
    pythonProcess.on('exit', async (code: any) => {
      console.log(`Python Interface Agent exited with code ${code}`)
      await writer.write(`data: ${JSON.stringify({
        type: 'status',
        message: `Interface Agent stopped (exit code: ${code})`,
        timestamp: new Date().toISOString()
      })}\n\n`)
      
      // Clean up session
      activeSessions.delete(userId)
      await writer.close()
    })

    // Handle process errors
    pythonProcess.on('error', async (error: any) => {
      console.error('Python Interface Agent error:', error)
      await writer.write(`data: ${JSON.stringify({
        type: 'error',
        message: `Python process error: ${error.message}`,
        timestamp: new Date().toISOString()
      })}\n\n`)
    })

  } catch (error: any) {
    console.error('Failed to start Python Interface Agent:', error)
    await session.writer.write(`data: ${JSON.stringify({
      type: 'error',
      message: `Failed to start Interface Agent: ${error.message || error}`,
      timestamp: new Date().toISOString()
    })}\n\n`)
  }
}

async function handlePythonMessage(message: any, session: any) {
  const writer = session.writer
  
  try {
    // Forward the message to the web interface via SSE
    await writer.write(`data: ${JSON.stringify({
      ...message,
      timestamp: new Date().toISOString()
    })}\n\n`)

    // Check if we need to wait for user response
    if (message.type === 'agent_question') {
      session.waitingForResponse = true
    }

  } catch (error) {
    console.error('Error handling Python message:', error)
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
    waitingForResponse: session?.waitingForResponse || false
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
    if (session.process) {
      session.process.kill('SIGTERM')
    }
    await session.writer.close()
    activeSessions.delete(userId)
  }

  return NextResponse.json({ success: true })
}
