import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

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
      messageQueue: [],
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
  if (session.process && session.waitingForResponse) {
    const userMessage = {
      type: 'user_response',
      content: message
    }
    session.process.stdin.write(JSON.stringify(userMessage) + '\n')
    session.waitingForResponse = false
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
    const scriptPath = path.join(projectRoot, '0_langchain_interface_web.py')
    const venvPath = path.join(projectRoot, 'coral_env')
    
    // Use the virtual environment Python
    const pythonPath = process.platform === 'win32' 
      ? path.join(venvPath, 'Scripts', 'python.exe')
      : path.join(venvPath, 'bin', 'python')

    console.log(`Starting Python Interface Agent: ${pythonPath} ${scriptPath} ${userId}`)
    
    // Spawn the Python process with virtual environment
    const pythonProcess = spawn(pythonPath, [scriptPath, userId], {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONPATH: projectRoot,
        VIRTUAL_ENV: venvPath
      }
    })

    session.process = pythonProcess

    // Handle stdout (JSON messages from Python)
    pythonProcess.stdout.on('data', async (data) => {
      const lines = data.toString().split('\n')
      for (const line of lines) {
        if (line.trim()) {
          try {
            const message = JSON.parse(line.trim())
            await handlePythonMessage(message, session)
          } catch (e) {
            console.error('Error parsing Python message:', e, 'Line:', line)
          }
        }
      }
    })

    // Handle stderr (logs from Python)
    pythonProcess.stderr.on('data', (data) => {
      console.log('Python stderr:', data.toString())
    })

    // Handle process exit
    pythonProcess.on('exit', async (code) => {
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
    pythonProcess.on('error', async (error) => {
      console.error('Python Interface Agent error:', error)
      await writer.write(`data: ${JSON.stringify({
        type: 'error',
        message: `Python process error: ${error.message}`,
        timestamp: new Date().toISOString()
      })}\n\n`)
    })

  } catch (error) {
    console.error('Failed to start Python Interface Agent:', error)
    await session.writer.write(`data: ${JSON.stringify({
      type: 'error',
      message: `Failed to start Interface Agent: ${error}`,
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
