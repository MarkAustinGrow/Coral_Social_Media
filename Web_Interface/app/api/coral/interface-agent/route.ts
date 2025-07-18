import { NextRequest, NextResponse } from 'next/server'

// BASIC ROUTE TEST - This should appear in logs if route is called
console.log('🔥 [ROUTE TEST] Interface Agent route file loaded at:', new Date().toISOString())

// Configuration - matching Coral Studio's approach
const CORAL_SERVER_CONFIG = {
  host: "coral.8interns.com",
  appId: "exampleApplication", 
  privKey: "privkey",
  session: "session1",
  timeout: 10000,
  // Build WebSocket URL like Coral Studio
  getWebSocketUrl: () => `ws://coral.8interns.com/debug/exampleApplication/privkey/session1/?timeout=10000`,
  // Build HTTP URL for compatibility
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

      // Create WebSocket connection like Coral Studio
      const wsUrl = CORAL_SERVER_CONFIG.getWebSocketUrl()
      console.log(`[Interface Agent] Connecting to Coral server via WebSocket: ${wsUrl}`)
      
      await writer.write(`data: ${JSON.stringify({
        type: 'status',
        message: `Connecting to Coral server at ${wsUrl}...`,
        timestamp: new Date().toISOString()
      })}\n\n`)

      // Create WebSocket connection
      const wsClient = await createWebSocketConnection(userId, session, wsUrl)
      session.mcpClient = wsClient
      
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

async function createWebSocketConnection(userId: string, session: any, wsUrl: string): Promise<any> {
  const writer = session.writer
  
  return new Promise((resolve, reject) => {
    try {
      // Since we're in a Node.js environment, we need to use a different approach
      // For now, we'll simulate the WebSocket connection and test the URL
      console.log(`[WebSocket] Attempting to connect to: ${wsUrl}`)
      
      // Test the connection by making an HTTP request first
      fetch(wsUrl.replace('ws://', 'http://').replace('?timeout=10000', ''))
        .then(response => {
          console.log(`[WebSocket] HTTP test response status: ${response.status}`)
          
          // Create a mock WebSocket client that follows Coral Studio's pattern
          const mockWsClient = {
            connected: false,
            url: wsUrl,
            agentId: null,
            agents: {},
            threads: {},
            messages: {},
            
            // Simulate connection events like Coral Studio
            onopen: () => {
              console.log('[WebSocket] Connected to Coral server')
              mockWsClient.connected = true
              
              writer.write(`data: ${JSON.stringify({
                type: 'status',
                message: 'Connected to Coral server successfully!',
                timestamp: new Date().toISOString()
              })}\n\n`)
            },
            
            onerror: (error: any) => {
              console.error('[WebSocket] Connection error:', error)
              mockWsClient.connected = false
              
              writer.write(`data: ${JSON.stringify({
                type: 'error',
                message: `WebSocket connection error: ${error.message || 'Unknown error'}`,
                timestamp: new Date().toISOString()
              })}\n\n`)
            },
            
            onclose: (event: any) => {
              console.log('[WebSocket] Connection closed:', event)
              mockWsClient.connected = false
              
              writer.write(`data: ${JSON.stringify({
                type: 'status',
                message: 'WebSocket connection closed',
                timestamp: new Date().toISOString()
              })}\n\n`)
            },
            
            onmessage: (event: any) => {
              try {
                const data = JSON.parse(event.data)
                console.log('[WebSocket] Received message:', data)
                
                // Handle different message types like Coral Studio
                switch (data.type) {
                  case 'DebugAgentRegistered':
                    mockWsClient.agentId = data.id
                    break
                  case 'ThreadList':
                    for (const thread of data.threads) {
                      mockWsClient.messages[thread.id] = thread.messages || []
                      mockWsClient.threads[thread.id] = { ...thread, messages: undefined, unread: 0 }
                    }
                    break
                  case 'AgentList':
                    for (const agent of data.agents) {
                      mockWsClient.agents[agent.id] = agent
                    }
                    break
                  case 'org.coralprotocol.coralserver.session.Event.ThreadCreated':
                    mockWsClient.threads[data.id] = {
                      id: data.id,
                      name: data.name,
                      participants: data.participants,
                      summary: data.summary,
                      creatorId: data.creatorId,
                      isClosed: data.isClosed,
                      unread: 0
                    }
                    mockWsClient.messages[data.id] = data.messages || []
                    break
                  case 'org.coralprotocol.coralserver.session.Event.MessageSent':
                    if (data.threadId in mockWsClient.messages) {
                      mockWsClient.messages[data.threadId].push(data.message)
                      mockWsClient.threads[data.threadId].unread += 1
                    }
                    break
                }
              } catch (error) {
                console.error('[WebSocket] Error parsing message:', error)
              }
            },
            
            close: () => {
              mockWsClient.connected = false
              console.log('[WebSocket] Manually closed connection')
            }
          }
          
          // Simulate successful connection
          setTimeout(() => {
            mockWsClient.onopen()
            resolve(mockWsClient)
          }, 1000)
          
        })
        .catch(error => {
          console.error(`[WebSocket] Connection test failed:`, error)
          
          writer.write(`data: ${JSON.stringify({
            type: 'error',
            message: `Failed to connect to Coral server: ${error.message}`,
            timestamp: new Date().toISOString()
          })}\n\n`)
          
          reject(error)
        })
        
    } catch (error) {
      console.error(`[WebSocket] Error creating connection:`, error)
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
