import { NextRequest } from 'next/server'
import { getCoralBridge, CoralProtocolBridge } from '../../../lib/coral-protocol-bridge'

// Simple in-memory storage for sessions and messages
const activeSessions = new Map<string, {
  id: string
  name: string
  userId: string
  created: string
  lastActive: string
  messageCount: number
  agents: string[]
  status: 'active' | 'idle' | 'archived'
}>()

const sessionMessages = new Map<string, Array<{
  id: string
  sessionId: string
  fromAgentId: string
  toAgentId?: string
  content: string
  timestamp: string
  type: 'message' | 'mention' | 'tool_call' | 'tool_response' | 'status'
  metadata?: any
}>>()

// Bridge connection management
const bridgeConnections = new Map<string, { bridge: CoralProtocolBridge, connected: boolean }>()

async function ensureBridgeConnection(userId: string): Promise<CoralProtocolBridge> {
  let connection = bridgeConnections.get(userId)
  
  if (!connection) {
    const bridge = getCoralBridge(userId)
    connection = { bridge, connected: false }
    bridgeConnections.set(userId, connection)
  }

  if (!connection.connected) {
    try {
      console.log(`[Socket.IO API] Connecting Coral bridge for user ${userId}`)
      await connection.bridge.connect()
      connection.connected = true
      console.log(`[Socket.IO API] Coral bridge connected for user ${userId}`)
    } catch (error) {
      console.error(`[Socket.IO API] Failed to connect Coral bridge for user ${userId}:`, error)
      // Don't throw - we'll fall back to simulated mode
    }
  }

  return connection.bridge
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const action = url.searchParams.get('action')
  const userId = url.searchParams.get('userId')

  if (!userId) {
    return Response.json({ error: 'User ID required' }, { status: 400 })
  }

  switch (action) {
    case 'get-sessions':
      const userSessions = Array.from(activeSessions.values()).filter(s => s.userId === userId)
      return Response.json({ sessions: userSessions })

    case 'get-messages':
      const sessionId = url.searchParams.get('sessionId')
      if (!sessionId) {
        return Response.json({ error: 'Session ID required' }, { status: 400 })
      }
      const messages = sessionMessages.get(sessionId) || []
      return Response.json({ messages })

    case 'get-agent-statuses':
      try {
        // Try to get real agent statuses from Coral Protocol Bridge
        const bridge = await ensureBridgeConnection(userId)
        const connection = bridgeConnections.get(userId)
        
        if (connection?.connected && bridge.isConnectedToCoral()) {
          console.log(`[Socket.IO API] Getting real agent statuses for user ${userId}`)
          const coralAgents = await bridge.listAgents()
          
          // Convert Coral agent statuses to our format
          const realStatuses = coralAgents.map(agent => ({
            agentId: agent.agentId,
            status: agent.status,
            lastSeen: agent.lastSeen,
            messageCount: agent.messageCount || 0,
            responseTime: agent.responseTime,
            coralConnected: agent.coralConnected
          }))
          
          console.log(`[Socket.IO API] Retrieved ${realStatuses.length} real agent statuses`)
          return Response.json({ statuses: realStatuses, source: 'coral' })
        } else {
          console.log(`[Socket.IO API] Coral bridge not connected, using mock statuses for user ${userId}`)
        }
      } catch (error) {
        console.error(`[Socket.IO API] Error getting real agent statuses for user ${userId}:`, error)
      }
      
      // Fallback to mock statuses
      const mockStatuses = [
        { agentId: `interface_agent_${userId}`, status: 'online', lastSeen: new Date().toISOString(), messageCount: 0, responseTime: 150, coralConnected: false },
        { agentId: `tweet_scraping_agent_${userId}`, status: 'offline', lastSeen: new Date(Date.now() - 300000).toISOString(), messageCount: 5, coralConnected: false },
        { agentId: `tweet_research_agent_${userId}`, status: 'online', lastSeen: new Date().toISOString(), messageCount: 12, responseTime: 200, coralConnected: false },
        { agentId: `hot_topic_agent_${userId}`, status: 'online', lastSeen: new Date().toISOString(), messageCount: 3, responseTime: 180, coralConnected: false },
        { agentId: `blog_writing_agent_${userId}`, status: 'offline', lastSeen: new Date(Date.now() - 600000).toISOString(), messageCount: 8, coralConnected: false },
        { agentId: `blog_critique_agent_${userId}`, status: 'online', lastSeen: new Date().toISOString(), messageCount: 2, responseTime: 220, coralConnected: false },
        { agentId: `blog_to_tweet_agent_${userId}`, status: 'offline', lastSeen: new Date(Date.now() - 900000).toISOString(), messageCount: 4, coralConnected: false },
        { agentId: `twitter_posting_agent_${userId}`, status: 'online', lastSeen: new Date().toISOString(), messageCount: 15, responseTime: 300, coralConnected: false },
        { agentId: `x_reply_agent_${userId}`, status: 'error', lastSeen: new Date(Date.now() - 120000).toISOString(), messageCount: 1, coralConnected: false }
      ]
      return Response.json({ statuses: mockStatuses, source: 'mock' })

    default:
      return Response.json({ error: 'Unknown action' }, { status: 400 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, userId, sessionId, message, targetAgents, sessionName } = body

    if (!userId) {
      return Response.json({ error: 'User ID required' }, { status: 400 })
    }

    switch (action) {
      case 'send-message':
        if (!sessionId || !message) {
          return Response.json({ error: 'Session ID and message required' }, { status: 400 })
        }

        const messageData = {
          id: `msg_${Date.now()}_${Math.random()}`,
          sessionId,
          fromAgentId: `user_${userId}`,
          toAgentId: targetAgents?.[0] || 'interface_agent',
          content: message,
          timestamp: new Date().toISOString(),
          type: 'message' as const,
          metadata: { targetAgents }
        }

        // Store message
        if (!sessionMessages.has(sessionId)) {
          sessionMessages.set(sessionId, [])
        }
        sessionMessages.get(sessionId)!.push(messageData)

        // Update session
        const session = activeSessions.get(sessionId)
        if (session) {
          session.messageCount++
          session.lastActive = messageData.timestamp
          activeSessions.set(sessionId, session)
        }

        // Try to send message via Coral Protocol Bridge
        try {
          const bridge = await ensureBridgeConnection(userId)
          const connection = bridgeConnections.get(userId)
          
          if (connection?.connected && bridge.isConnectedToCoral()) {
            console.log(`[Socket.IO API] Sending real message via Coral bridge for user ${userId}`)
            
            // Determine target agent - default to interface agent
            const targetAgent = targetAgents?.[0] || `user_interface_agent_${userId}`
            
            // Send message through Coral Protocol Bridge
            const coralMessage = await bridge.sendMessage(message, [targetAgent], sessionId)
            console.log(`[Socket.IO API] Message sent via Coral bridge: ${coralMessage.id}`)
            
            // Wait for agent response via Coral protocol
            setTimeout(async () => {
              try {
                console.log(`[Socket.IO API] Waiting for agent response via Coral bridge`)
                const responses = await bridge.waitForMentions(30000) // 30 second timeout
                
                if (responses.length > 0) {
                  // Process the first response
                  const coralResponse = responses[0]
                  const agentResponse = {
                    id: coralResponse.id,
                    sessionId,
                    fromAgentId: coralResponse.fromAgentId,
                    toAgentId: `user_${userId}`,
                    content: coralResponse.content,
                    timestamp: coralResponse.timestamp,
                    type: 'message' as const,
                    metadata: { 
                      isFromCoral: true,
                      originalCoralData: coralResponse.metadata 
                    }
                  }

                  sessionMessages.get(sessionId)!.push(agentResponse)
                  
                  if (session) {
                    session.messageCount++
                    session.lastActive = agentResponse.timestamp
                    activeSessions.set(sessionId, session)
                  }
                  
                  console.log(`[Socket.IO API] Real agent response received: ${agentResponse.content.substring(0, 100)}...`)
                } else {
                  console.log(`[Socket.IO API] No agent response received within timeout, adding fallback message`)
                  // Add a timeout message
                  const timeoutResponse = {
                    id: `msg_${Date.now()}_timeout`,
                    sessionId,
                    fromAgentId: targetAgent,
                    toAgentId: `user_${userId}`,
                    content: `Message sent to ${targetAgent} via Coral protocol, but no response received within 30 seconds. The agent may be processing your request.`,
                    timestamp: new Date().toISOString(),
                    type: 'message' as const,
                    metadata: { isTimeout: true, sentViaCoral: true }
                  }

                  sessionMessages.get(sessionId)!.push(timeoutResponse)
                  
                  if (session) {
                    session.messageCount++
                    session.lastActive = timeoutResponse.timestamp
                    activeSessions.set(sessionId, session)
                  }
                }
              } catch (error) {
                console.error(`[Socket.IO API] Error waiting for Coral response:`, error)
                // Add error message
                const errorMessage = error instanceof Error ? error.message : String(error)
                const errorResponse = {
                  id: `msg_${Date.now()}_error`,
                  sessionId,
                  fromAgentId: 'system',
                  toAgentId: `user_${userId}`,
                  content: `Error receiving response from ${targetAgent}: ${errorMessage}`,
                  timestamp: new Date().toISOString(),
                  type: 'message' as const,
                  metadata: { isError: true, error: errorMessage }
                }

                sessionMessages.get(sessionId)!.push(errorResponse)
                
                if (session) {
                  session.messageCount++
                  session.lastActive = errorResponse.timestamp
                  activeSessions.set(sessionId, session)
                }
              }
            }, 1000) // Small delay to allow message to be processed
            
            return Response.json({ success: true, message: messageData, sentViaCoral: true })
          } else {
            console.log(`[Socket.IO API] Coral bridge not connected, falling back to simulated response for user ${userId}`)
          }
        } catch (error) {
          console.error(`[Socket.IO API] Error sending message via Coral bridge for user ${userId}:`, error)
        }
        
        // Fallback to simulated response
        setTimeout(() => {
          const agentResponse = {
            id: `msg_${Date.now()}_${Math.random()}`,
            sessionId,
            fromAgentId: targetAgents?.[0] || 'interface_agent',
            toAgentId: `user_${userId}`,
            content: `I received your message: "${message}". This is a simulated response from ${targetAgents?.[0] || 'interface_agent'}. Coral Protocol Bridge was not available.`,
            timestamp: new Date().toISOString(),
            type: 'message' as const,
            metadata: { isSimulated: true, coralUnavailable: true }
          }

          sessionMessages.get(sessionId)!.push(agentResponse)
          
          if (session) {
            session.messageCount++
            session.lastActive = agentResponse.timestamp
            activeSessions.set(sessionId, session)
          }
        }, 1000 + Math.random() * 2000) // Random delay 1-3 seconds

        return Response.json({ success: true, message: messageData, sentViaCoral: false })

      case 'create-session':
        if (!sessionName) {
          return Response.json({ error: 'Session name required' }, { status: 400 })
        }

        const newSessionId = `session_${Date.now()}_${userId}`
        const newSession = {
          id: newSessionId,
          name: sessionName,
          userId,
          created: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          messageCount: 0,
          agents: ['interface_agent'],
          status: 'active' as const
        }

        activeSessions.set(newSessionId, newSession)
        sessionMessages.set(newSessionId, [])

        return Response.json({ success: true, session: newSession })

      case 'archive-session':
        if (!sessionId) {
          return Response.json({ error: 'Session ID required' }, { status: 400 })
        }

        const sessionToArchive = activeSessions.get(sessionId)
        if (sessionToArchive && sessionToArchive.userId === userId) {
          sessionToArchive.status = 'archived'
          activeSessions.set(sessionId, sessionToArchive)
          return Response.json({ success: true })
        }

        return Response.json({ error: 'Session not found' }, { status: 404 })

      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 })
    }

  } catch (error) {
    console.error('[Socket.IO API] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Initialize default session for users
export function initializeDefaultSession(userId: string) {
  const defaultSessionId = `default_${userId}`
  
  if (!activeSessions.has(defaultSessionId)) {
    const defaultSession = {
      id: defaultSessionId,
      name: 'Default Session',
      userId,
      created: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      messageCount: 0,
      agents: ['interface_agent'],
      status: 'active' as const
    }

    activeSessions.set(defaultSessionId, defaultSession)
    sessionMessages.set(defaultSessionId, [])
  }

  return activeSessions.get(defaultSessionId)!
}
