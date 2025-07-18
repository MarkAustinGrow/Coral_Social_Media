import { NextRequest, NextResponse } from 'next/server'

// BASIC ROUTE TEST - This should appear in logs if route is called
console.log('🔥 [ROUTE TEST] Interface Agent route file loaded at:', new Date().toISOString())

// Configuration - matching your working agents' endpoint pattern
const CORAL_SERVER_CONFIG = {
  host: "coral.8interns.com",
  appId: "exampleApplication", 
  privKey: "privkey",
  session: "session1",
  timeout: 10000,
  // Build WebSocket URL matching the working /devmode/ pattern
  getWebSocketUrl: () => `ws://coral.8interns.com/devmode/exampleApplication/privkey/session1/ws`,
  // Build HTTP URL for compatibility (this is what your other agents use)
  getHttpUrl: () => `http://coral.8interns.com/devmode/exampleApplication/privkey/session1/sse`
}

// Store active agent sessions
const activeSessions = new Map<string, {
  mcpClient: any,
  writer: WritableStreamDefaultWriter,
  conversationState: 'waiting_for_user' | 'processing' | 'waiting_for_agent',
  currentStep: number,
  agentList: any[],
  selectedAgent: string | null,
  threadId: string | null,
  retryCount: number
}>()

export async function POST(request: NextRequest) {
  console.log('🚀 [Interface Agent API] POST request received')
  
  const { message, userId } = await request.json()
  console.log(`📝 [Interface Agent API] Request data: message="${message}", userId="${userId}"`)

  if (!userId) {
    console.log('❌ [Interface Agent API] No userId provided')
    return NextResponse.json({ error: 'User ID required' }, { status: 400 })
  }

  // Create or get existing session
  let session = activeSessions.get(userId)
  
  if (!session) {
    // Start new Interface Agent session
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()
    
    session = {
      mcpClient: null,
      writer,
      conversationState: 'processing',
      currentStep: 1,
      agentList: [],
      selectedAgent: null,
      threadId: null,
      retryCount: 0
    }
    
    activeSessions.set(userId, session)
    
    // Start the MCP Interface Agent
    startMCPInterfaceAgent(userId, session, message)
    
    // Return the stream for real-time communication
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  }

  // Handle user response based on conversation state
  if (session.conversationState === 'waiting_for_user') {
    console.log(`[Interface Agent] User response received: ${message}`)
    await handleUserResponse(userId, session, message)
    return NextResponse.json({ success: true, sent: true })
  }

  return NextResponse.json({ error: 'Agent not ready or not waiting for response' }, { status: 503 })
}

async function startMCPInterfaceAgent(userId: string, session: any, initialMessage: string) {
  const writer = session.writer
  const maxRetries = 3
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[Interface Agent] Starting attempt ${attempt + 1} for user: ${userId}`)
      
      await writer.write(`data: ${JSON.stringify({
        type: 'status',
        message: `Starting Interface Agent (attempt ${attempt + 1})...`,
        timestamp: new Date().toISOString()
      })}\n\n`)

      // Create HTTP SSE connection to proven working endpoint
      const sseUrl = CORAL_SERVER_CONFIG.getHttpUrl()
      console.log(`[Interface Agent] Connecting to Coral server via HTTP SSE: ${sseUrl}`)
      
      await writer.write(`data: ${JSON.stringify({
        type: 'status',
        message: `Connecting to Coral server at ${sseUrl}...`,
        timestamp: new Date().toISOString()
      })}\n\n`)

      // Create HTTP SSE connection
      const sseClient = await createSSEConnection(userId, session, sseUrl)
      session.mcpClient = sseClient
      
      // Start the conversation flow - Step 1: List agents
      await executeConversationFlow(userId, session, initialMessage)
      
      break // Success, exit retry loop
      
    } catch (error: any) {
      console.error(`[Interface Agent] Error on attempt ${attempt + 1}:`, error)
      
      if (error.name === 'ClosedResourceError' || error.message?.includes('closed')) {
        if (attempt < maxRetries - 1) {
          await writer.write(`data: ${JSON.stringify({
            type: 'status',
            message: `Connection closed, retrying in 5 seconds... (attempt ${attempt + 1}/${maxRetries})`,
            timestamp: new Date().toISOString()
          })}\n\n`)
          
          await new Promise(resolve => setTimeout(resolve, 5000))
          continue
        }
      }
      
      if (attempt === maxRetries - 1) {
        await writer.write(`data: ${JSON.stringify({
          type: 'error',
          message: `Failed to start Interface Agent after ${maxRetries} attempts: ${error.message}`,
          timestamp: new Date().toISOString()
        })}\n\n`)
        
        activeSessions.delete(userId)
        await writer.close()
        return
      }
    }
  }
}

function buildMCPUrl(userId: string): string {
  // Use the WebSocket URL from Coral Studio's approach
  return CORAL_SERVER_CONFIG.getWebSocketUrl()
}

async function createSSEConnection(userId: string, session: any, sseUrl: string): Promise<any> {
  const writer = session.writer
  
  return new Promise((resolve, reject) => {
    try {
      console.log(`[HTTP SSE] Attempting connection to: ${sseUrl}`)
      
      // Create client wrapper that follows the same pattern
      const sseClient = {
        connected: false,
        url: sseUrl,
        agentId: null,
        agents: {} as Record<string, any>,
        threads: {} as Record<string, any>,
        messages: {} as Record<string, any[]>,
        abortController: new AbortController(),
        
        close: () => {
          sseClient.abortController.abort()
          sseClient.connected = false
        }
      }
      
      // Set up connection timeout
      const connectionTimeout = setTimeout(() => {
        if (!sseClient.connected) {
          console.error('[HTTP SSE] Connection timeout')
          sseClient.abortController.abort()
          reject(new Error('HTTP SSE connection timeout'))
        }
      }, CORAL_SERVER_CONFIG.timeout)
      
      // Create HTTP SSE connection using fetch
      fetch(sseUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'User-Agent': 'Coral-Interface-Agent/1.0'
        },
        signal: sseClient.abortController.signal
      })
      .then(async (response) => {
        clearTimeout(connectionTimeout)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        console.log('[HTTP SSE] Successfully connected to Coral server')
        sseClient.connected = true
        
        writer.write(`data: ${JSON.stringify({
          type: 'status',
          message: 'Connected to Coral server successfully via HTTP SSE!',
          timestamp: new Date().toISOString()
        })}\n\n`)
        
        resolve(sseClient)
        
        // Process the SSE stream
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        
        if (!reader) {
          throw new Error('No response body reader available')
        }
        
        // Read the stream
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) {
            console.log('[HTTP SSE] Stream ended')
            break
          }
          
          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = line.slice(6) // Remove 'data: ' prefix
                if (data.trim() === '') continue // Skip empty data
                
                const message = JSON.parse(data)
                console.log('[HTTP SSE] Received message:', message)
                
                // Forward message to SSE stream
                writer.write(`data: ${JSON.stringify({
                  type: 'coral_message',
                  message,
                  timestamp: new Date().toISOString()
                })}\n\n`)
                
                // Handle different message types like Coral Studio
                switch (message.type) {
                  case 'DebugAgentRegistered':
                    sseClient.agentId = message.id
                    console.log(`[HTTP SSE] Agent registered: ${message.id}`)
                    break
                    
                  case 'ThreadList':
                    for (const thread of message.threads || []) {
                      sseClient.messages[thread.id] = thread.messages || []
                      sseClient.threads[thread.id] = { ...thread, messages: undefined, unread: 0 }
                    }
                    console.log(`[HTTP SSE] Received thread list: ${message.threads?.length || 0} threads`)
                    break
                    
                  case 'AgentList':
                    for (const agent of message.agents || []) {
                      sseClient.agents[agent.id] = agent
                    }
                    console.log(`[HTTP SSE] Received agent list: ${message.agents?.length || 0} agents`)
                    break
                    
                  case 'org.coralprotocol.coralserver.session.Event.ThreadCreated':
                    sseClient.threads[message.id] = {
                      id: message.id,
                      name: message.name,
                      participants: message.participants,
                      summary: message.summary,
                      creatorId: message.creatorId,
                      isClosed: message.isClosed,
                      unread: 0
                    }
                    sseClient.messages[message.id] = message.messages || []
                    console.log(`[HTTP SSE] Thread created: ${message.id}`)
                    break
                    
                  case 'org.coralprotocol.coralserver.session.Event.MessageSent':
                    if (message.threadId in sseClient.messages) {
                      sseClient.messages[message.threadId].push(message.message)
                      sseClient.threads[message.threadId].unread += 1
                    }
                    console.log(`[HTTP SSE] Message sent to thread: ${message.threadId}`)
                    break
                    
                  default:
                    console.log(`[HTTP SSE] Unknown message type: ${message.type}`)
                }
                
              } catch (error) {
                console.error('[HTTP SSE] Error parsing message:', error)
              }
            }
          }
        }
        
      })
      .catch((error) => {
        clearTimeout(connectionTimeout)
        console.error('[HTTP SSE] Connection error:', error)
        sseClient.connected = false
        
        writer.write(`data: ${JSON.stringify({
          type: 'error',
          message: `HTTP SSE connection error: ${error.message}`,
          timestamp: new Date().toISOString()
        })}\n\n`)
        
        if (!sseClient.connected) {
          reject(error)
        }
      })
      
    } catch (error) {
      console.error(`[HTTP SSE] Error creating connection:`, error)
      reject(error)
    }
  })
}

async function executeConversationFlow(userId: string, session: any, initialMessage: string) {
  const writer = session.writer
  
  try {
    // Step 1: List agents
    console.log(`[Interface Agent] Step 1: Listing agents for user ${userId}`)
    await writer.write(`data: ${JSON.stringify({
      type: 'status',
      message: 'Step 1: Getting list of available agents...',
      timestamp: new Date().toISOString()
    })}\n\n`)
    
    const agents = await callMCPTool(userId, 'list_agents', {})
    session.agentList = agents || []
    
    await writer.write(`data: ${JSON.stringify({
      type: 'agent_list',
      agents: session.agentList,
      timestamp: new Date().toISOString()
    })}\n\n`)
    
    // Step 2: Ask human initial question
    console.log(`[Interface Agent] Step 2: Asking user initial question`)
    await writer.write(`data: ${JSON.stringify({
      type: 'agent_question',
      question: initialMessage ? `You said: "${initialMessage}". How can I assist you today?` : 'How can I assist you today?',
      timestamp: new Date().toISOString()
    })}\n\n`)
    
    session.conversationState = 'waiting_for_user'
    session.currentStep = 2
    
  } catch (error: any) {
    console.error(`[Interface Agent] Error in conversation flow:`, error)
    await writer.write(`data: ${JSON.stringify({
      type: 'error',
      message: `Conversation flow error: ${error.message}`,
      timestamp: new Date().toISOString()
    })}\n\n`)
  }
}

async function handleUserResponse(userId: string, session: any, userResponse: string) {
  const writer = session.writer
  
  try {
    console.log(`[Interface Agent] Processing user response at step ${session.currentStep}`)
    session.conversationState = 'processing'
    
    if (session.currentStep === 2) {
      // Step 3: Think and decide right agent
      await writer.write(`data: ${JSON.stringify({
        type: 'status',
        message: 'Step 3: Analyzing your request and selecting the best agent...',
        timestamp: new Date().toISOString()
      })}\n\n`)
      
      // Simulate thinking time
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Simple agent selection logic (you can enhance this)
      const selectedAgent = selectBestAgent(userResponse, session.agentList)
      session.selectedAgent = selectedAgent
      
      await writer.write(`data: ${JSON.stringify({
        type: 'agent_selection',
        agent: selectedAgent,
        reasoning: `Selected ${selectedAgent} based on your request: "${userResponse}"`,
        timestamp: new Date().toISOString()
      })}\n\n`)
      
      // Step 4: Create thread
      await writer.write(`data: ${JSON.stringify({
        type: 'status',
        message: `Step 4: Creating thread with ${selectedAgent}...`,
        timestamp: new Date().toISOString()
      })}\n\n`)
      
      const threadResult = await callMCPTool(userId, 'create_thread', { agent: selectedAgent })
      session.threadId = threadResult?.threadId || 'default_thread'
      
      // Step 5: Send message with instructions
      const instructions = generateInstructions(userResponse, selectedAgent)
      
      await writer.write(`data: ${JSON.stringify({
        type: 'status',
        message: `Step 5: Sending instructions to ${selectedAgent}...`,
        timestamp: new Date().toISOString()
      })}\n\n`)
      
      await callMCPTool(userId, 'send_message', {
        threadId: session.threadId,
        agent: selectedAgent,
        content: instructions
      })
      
      // Step 6: Wait for mentions
      await writer.write(`data: ${JSON.stringify({
        type: 'status',
        message: 'Step 6: Waiting for agent response (30 seconds timeout)...',
        timestamp: new Date().toISOString()
      })}\n\n`)
      
      const agentResponse = await callMCPTool(userId, 'wait_for_mentions', { timeout: 30 })
      
      // Step 7: Show conversation
      await writer.write(`data: ${JSON.stringify({
        type: 'agent_response',
        agent: selectedAgent,
        response: agentResponse,
        timestamp: new Date().toISOString()
      })}\n\n`)
      
      // Step 8: Ask if user needs anything else
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      await writer.write(`data: ${JSON.stringify({
        type: 'agent_question',
        question: 'Do you need anything else?',
        timestamp: new Date().toISOString()
      })}\n\n`)
      
      session.conversationState = 'waiting_for_user'
      session.currentStep = 8
      
    } else if (session.currentStep === 8) {
      // User wants something else, restart from step 1
      if (userResponse.toLowerCase().includes('yes') || userResponse.toLowerCase().includes('help')) {
        session.currentStep = 1
        await executeConversationFlow(userId, session, userResponse)
      } else {
        await writer.write(`data: ${JSON.stringify({
          type: 'status',
          message: 'Thank you! Feel free to ask if you need anything else.',
          timestamp: new Date().toISOString()
        })}\n\n`)
        
        // Keep session alive for future requests
        session.conversationState = 'waiting_for_user'
        session.currentStep = 2
      }
    }
    
  } catch (error: any) {
    console.error(`[Interface Agent] Error handling user response:`, error)
    await writer.write(`data: ${JSON.stringify({
      type: 'error',
      message: `Error processing your request: ${error.message}`,
      timestamp: new Date().toISOString()
    })}\n\n`)
  }
}

function selectBestAgent(userRequest: string, agentList: any[]): string {
  // Simple keyword-based agent selection (you can enhance with AI)
  const request = userRequest.toLowerCase()
  
  if (request.includes('tweet') || request.includes('twitter') || request.includes('social')) {
    return 'tweet_scraping_agent'
  } else if (request.includes('blog') || request.includes('write') || request.includes('article')) {
    return 'blog_writing_agent'
  } else if (request.includes('news') || request.includes('current') || request.includes('latest')) {
    return 'world_news_agent'
  } else if (request.includes('research') || request.includes('analyze') || request.includes('study')) {
    return 'tweet_research_agent'
  } else {
    // Default to tweet scraping agent
    return 'tweet_scraping_agent'
  }
}

function generateInstructions(userRequest: string, selectedAgent: string): string {
  return `User request: "${userRequest}". Please process this request according to your capabilities as ${selectedAgent}.`
}

async function callMCPTool(userId: string, toolName: string, params: any): Promise<any> {
  console.log(`[Interface Agent] Calling MCP tool: ${toolName} with params:`, params)
  
  try {
    // Build the MCP URL for this specific tool call
    const mcpUrl = buildMCPUrl(userId)
    
    // For now, we'll use a simplified approach that matches your Python script's logic
    // In a full implementation, this would use the actual MCP protocol
    
    switch (toolName) {
      case 'list_agents':
        // Return the same agents that your Python script would see
        return [
          { name: 'tweet_scraping_agent', description: 'Scrapes and analyzes tweets' },
          { name: 'blog_writing_agent', description: 'Creates blog content' },
          { name: 'world_news_agent', description: 'Fetches latest news' },
          { name: 'tweet_research_agent', description: 'Researches tweet content' }
        ]
      
      case 'create_thread':
        // Create a thread ID that would be compatible with Coral server
        const threadId = `thread_${userId}_${Date.now()}`
        console.log(`[Interface Agent] Created thread: ${threadId}`)
        return { threadId }
      
      case 'send_message':
        // Simulate sending a message to the selected agent
        console.log(`[Interface Agent] Sending message to ${params.agent}: ${params.content}`)
        
        // In a real implementation, this would send via MCP protocol
        // For now, we'll simulate the message being sent
        await new Promise(resolve => setTimeout(resolve, 500))
        
        return { 
          success: true, 
          messageId: `msg_${Date.now()}`,
          threadId: params.threadId,
          agent: params.agent
        }
      
      case 'wait_for_mentions':
        // Simulate waiting for agent response with realistic timing
        console.log(`[Interface Agent] Waiting for mentions (timeout: ${params.timeout}s)`)
        
        // Simulate processing time (2-5 seconds)
        const processingTime = Math.random() * 3000 + 2000
        await new Promise(resolve => setTimeout(resolve, processingTime))
        
        // Return a realistic agent response based on the selected agent
        const session = activeSessions.get(userId)
        const selectedAgent = session?.selectedAgent || 'unknown_agent'
        
        return generateAgentResponse(selectedAgent, params)
      
      default:
        throw new Error(`Unknown MCP tool: ${toolName}`)
    }
    
  } catch (error: any) {
    console.error(`[Interface Agent] Error calling MCP tool ${toolName}:`, error)
    throw new Error(`MCP tool call failed: ${error.message}`)
  }
}

function generateAgentResponse(agentName: string, params: any): string {
  // Generate realistic responses based on the agent type
  switch (agentName) {
    case 'tweet_scraping_agent':
      return `I've analyzed recent tweets and found several interesting patterns. Here are the key insights: [Tweet analysis would be performed here with real data from the scraping agent]`
    
    case 'blog_writing_agent':
      return `I've created a blog post based on your request. The content includes relevant research and is structured for optimal engagement. [Blog content would be generated here]`
    
    case 'world_news_agent':
      return `I've gathered the latest news from multiple sources. Here are the most relevant current events: [News data would be fetched and summarized here]`
    
    case 'tweet_research_agent':
      return `I've conducted research on the requested topic and found comprehensive information. Here's my analysis: [Research findings would be presented here]`
    
    default:
      return `I've processed your request using ${agentName}. The task has been completed successfully. [Agent-specific response would be generated here]`
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
    conversationState: session?.conversationState || 'idle',
    currentStep: session?.currentStep || 0
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
    if (session.mcpClient) {
      // Close MCP client connection
      try {
        session.mcpClient.close?.()
      } catch (error) {
        console.error('Error closing MCP client:', error)
      }
    }
    await session.writer.close()
    activeSessions.delete(userId)
  }

  return NextResponse.json({ success: true })
}
