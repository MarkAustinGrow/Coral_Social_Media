import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
)

// Store active agent sessions
const activeSessions = new Map<string, {
  controller: AbortController,
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
    const controller = new AbortController()
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()
    
    session = {
      controller,
      writer,
      messageQueue: [],
      waitingForResponse: false
    }
    
    activeSessions.set(userId, session)
    
    // Start the Interface Agent in the background
    startInterfaceAgent(userId, stream.readable, session)
    
    // Return the stream for real-time communication
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  }

  // Add message to queue if agent is running
  if (session.waitingForResponse) {
    session.messageQueue.push(message)
    return NextResponse.json({ success: true, queued: true })
  }

  return NextResponse.json({ error: 'Agent not ready' }, { status: 503 })
}

async function startInterfaceAgent(userId: string, readable: ReadableStream, session: any) {
  try {
    // Import the required modules (these would need to be available in Node.js environment)
    // For now, we'll simulate the Interface Agent behavior
    
    const writer = session.writer
    
    // Send initial connection message
    await writer.write(`data: ${JSON.stringify({
      type: 'status',
      message: 'Interface Agent starting...',
      timestamp: new Date().toISOString()
    })}\n\n`)

    // Simulate the Interface Agent workflow
    await simulateInterfaceAgent(userId, session)
    
  } catch (error) {
    console.error('Interface Agent error:', error)
    await session.writer.write(`data: ${JSON.stringify({
      type: 'error',
      message: `Interface Agent error: ${error}`,
      timestamp: new Date().toISOString()
    })}\n\n`)
  }
}

async function simulateInterfaceAgent(userId: string, session: any) {
  const writer = session.writer
  
  try {
    // Step 1: List agents (simulated)
    await writer.write(`data: ${JSON.stringify({
      type: 'agent_action',
      action: 'list_agents',
      message: 'Listing available agents...',
      timestamp: new Date().toISOString()
    })}\n\n`)

    // Step 2: Ask user how to help
    await writer.write(`data: ${JSON.stringify({
      type: 'agent_question',
      question: 'How can I assist you today?',
      timestamp: new Date().toISOString()
    })}\n\n`)

    // Mark as waiting for response
    session.waitingForResponse = true

    // Wait for user response
    const userResponse = await waitForUserResponse(session)
    
    await writer.write(`data: ${JSON.stringify({
      type: 'user_response',
      message: userResponse,
      timestamp: new Date().toISOString()
    })}\n\n`)

    // Step 3: Process user intent
    await writer.write(`data: ${JSON.stringify({
      type: 'agent_thinking',
      message: 'Analyzing your request and selecting the best agent...',
      timestamp: new Date().toISOString()
    })}\n\n`)

    // Step 4: Route to appropriate agent
    const selectedAgent = determineAgent(userResponse)
    
    await writer.write(`data: ${JSON.stringify({
      type: 'agent_selection',
      agent: selectedAgent,
      message: `Routing your request to ${selectedAgent}...`,
      timestamp: new Date().toISOString()
    })}\n\n`)

    // Step 5: Create thread and send message
    await writer.write(`data: ${JSON.stringify({
      type: 'thread_creation',
      message: 'Creating communication thread...',
      timestamp: new Date().toISOString()
    })}\n\n`)

    // Step 6: Wait for agent response
    await writer.write(`data: ${JSON.stringify({
      type: 'waiting_response',
      message: 'Waiting for agent response...',
      timestamp: new Date().toISOString()
    })}\n\n`)

    // Simulate agent response
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    await writer.write(`data: ${JSON.stringify({
      type: 'agent_response',
      agent: selectedAgent,
      response: generateAgentResponse(selectedAgent, userResponse),
      timestamp: new Date().toISOString()
    })}\n\n`)

    // Step 7: Ask if user needs anything else
    await writer.write(`data: ${JSON.stringify({
      type: 'agent_question',
      question: 'Do you need anything else?',
      timestamp: new Date().toISOString()
    })}\n\n`)

    // Continue the conversation loop
    session.waitingForResponse = true

  } catch (error) {
    await writer.write(`data: ${JSON.stringify({
      type: 'error',
      message: `Error in Interface Agent: ${error}`,
      timestamp: new Date().toISOString()
    })}\n\n`)
  }
}

async function waitForUserResponse(session: any): Promise<string> {
  return new Promise((resolve) => {
    const checkQueue = () => {
      if (session.messageQueue.length > 0) {
        const message = session.messageQueue.shift()
        session.waitingForResponse = false
        resolve(message)
      } else {
        setTimeout(checkQueue, 100)
      }
    }
    checkQueue()
  })
}

function determineAgent(userMessage: string): string {
  const message = userMessage.toLowerCase()
  
  if (message.includes('tweet') || message.includes('twitter') || message.includes('scrape')) {
    return 'Tweet Scraping Agent'
  } else if (message.includes('blog') || message.includes('write') || message.includes('article')) {
    return 'Blog Writing Agent'
  } else if (message.includes('research') || message.includes('analyze')) {
    return 'Tweet Research Agent'
  } else if (message.includes('trending') || message.includes('hot') || message.includes('topic')) {
    return 'Hot Topic Agent'
  } else if (message.includes('post') || message.includes('publish')) {
    return 'Twitter Posting Agent'
  } else {
    return 'Tweet Scraping Agent' // Default
  }
}

function generateAgentResponse(agent: string, userMessage: string): string {
  switch (agent) {
    case 'Tweet Scraping Agent':
      return 'I found 12 new tweets from your monitored accounts. The latest tweets cover topics about AI, cryptocurrency, and market trends. Would you like me to analyze any specific tweets?'
    case 'Blog Writing Agent':
      return 'I can help you write a blog post. What topic would you like me to focus on? I can create content based on recent tweets, trending topics, or any specific subject you have in mind.'
    case 'Tweet Research Agent':
      return 'I\'ve analyzed the recent tweets and found several interesting patterns. The main topics trending are AI developments, market predictions, and policy changes. Would you like a detailed analysis of any specific topic?'
    case 'Hot Topic Agent':
      return 'Current trending topics include: AI regulation discussions, cryptocurrency market movements, and geopolitical developments. These topics are generating high engagement across social media.'
    case 'Twitter Posting Agent':
      return 'I\'m ready to help you post content to Twitter. Do you have specific content you\'d like to post, or would you like me to create posts based on recent research and trends?'
    default:
      return 'I\'m ready to assist you with your request. Please let me know what specific task you\'d like me to perform.'
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
    session.controller.abort()
    await session.writer.close()
    activeSessions.delete(userId)
  }

  return NextResponse.json({ success: true })
}
