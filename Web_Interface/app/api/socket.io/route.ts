import { NextRequest } from 'next/server'

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
      // Mock agent statuses for now
      const mockStatuses = [
        { agentId: `interface_agent_${userId}`, status: 'online', lastSeen: new Date().toISOString(), messageCount: 0, responseTime: 150 },
        { agentId: `tweet_scraping_agent_${userId}`, status: 'offline', lastSeen: new Date(Date.now() - 300000).toISOString(), messageCount: 5 },
        { agentId: `tweet_research_agent_${userId}`, status: 'online', lastSeen: new Date().toISOString(), messageCount: 12, responseTime: 200 },
        { agentId: `hot_topic_agent_${userId}`, status: 'online', lastSeen: new Date().toISOString(), messageCount: 3, responseTime: 180 },
        { agentId: `blog_writing_agent_${userId}`, status: 'offline', lastSeen: new Date(Date.now() - 600000).toISOString(), messageCount: 8 },
        { agentId: `blog_critique_agent_${userId}`, status: 'online', lastSeen: new Date().toISOString(), messageCount: 2, responseTime: 220 },
        { agentId: `blog_to_tweet_agent_${userId}`, status: 'offline', lastSeen: new Date(Date.now() - 900000).toISOString(), messageCount: 4 },
        { agentId: `twitter_posting_agent_${userId}`, status: 'online', lastSeen: new Date().toISOString(), messageCount: 15, responseTime: 300 },
        { agentId: `x_reply_agent_${userId}`, status: 'error', lastSeen: new Date(Date.now() - 120000).toISOString(), messageCount: 1 }
      ]
      return Response.json({ statuses: mockStatuses })

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

        // Simulate agent response after a delay
        setTimeout(() => {
          const agentResponse = {
            id: `msg_${Date.now()}_${Math.random()}`,
            sessionId,
            fromAgentId: targetAgents?.[0] || 'interface_agent',
            toAgentId: `user_${userId}`,
            content: `I received your message: "${message}". This is a simulated response from ${targetAgents?.[0] || 'interface_agent'}. In Phase 3, this will be replaced with real agent communication.`,
            timestamp: new Date().toISOString(),
            type: 'message' as const,
            metadata: { isSimulated: true }
          }

          sessionMessages.get(sessionId)!.push(agentResponse)
          
          if (session) {
            session.messageCount++
            session.lastActive = agentResponse.timestamp
            activeSessions.set(sessionId, session)
          }
        }, 1000 + Math.random() * 2000) // Random delay 1-3 seconds

        return Response.json({ success: true, message: messageData })

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
