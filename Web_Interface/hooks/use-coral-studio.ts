"use client"

import { useState, useEffect, useCallback } from 'react'
import { Socket } from 'socket.io-client'

interface Session {
  id: string
  name: string
  created: string
  lastActive: string
  messageCount: number
  agents: string[]
  status: 'active' | 'idle' | 'archived'
}

interface AgentStatus {
  agentId: string
  status: 'online' | 'offline' | 'error' | 'connecting'
  lastSeen?: string
  messageCount?: number
  sessionId?: string
  responseTime?: number
}

interface CoralMessage {
  id: string
  sessionId: string
  fromAgentId: string
  toAgentId?: string
  content: string
  timestamp: string
  type: 'message' | 'mention' | 'tool_call' | 'tool_response' | 'status'
  metadata?: any
}

interface SendMessageParams {
  content: string
  sessionId: string
  targetAgents?: string[]
}

interface UseCoralStudioReturn {
  sessions: Session[]
  currentSession: Session | null
  createSession: (name: string) => Promise<void>
  switchSession: (sessionId: string) => void
  archiveSession: (sessionId: string) => Promise<void>
  sendMessage: (params: SendMessageParams) => Promise<void>
  messages: CoralMessage[]
  agentStatuses: AgentStatus[]
  refreshAgentStatuses: () => Promise<void>
  isLoading: boolean
  error: string | null
}

export function useCoralStudio(socket: Socket | null, user: any): UseCoralStudioReturn {
  const [sessions, setSessions] = useState<Session[]>([])
  const [currentSession, setCurrentSession] = useState<Session | null>(null)
  const [messages, setMessages] = useState<CoralMessage[]>([])
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize with default session
  useEffect(() => {
    if (user && sessions.length === 0) {
      const defaultSession: Session = {
        id: `default_${user.id}`,
        name: 'Default Session',
        created: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        messageCount: 0,
        agents: ['interface_agent'],
        status: 'active'
      }
      setSessions([defaultSession])
      setCurrentSession(defaultSession)
    }
  }, [user, sessions.length])

  // Socket event handlers
  useEffect(() => {
    if (!socket || !user) return

    const handleMessage = (data: any) => {
      const message: CoralMessage = {
        id: data.id || `msg_${Date.now()}_${Math.random()}`,
        sessionId: data.sessionId || currentSession?.id || 'default',
        fromAgentId: data.fromAgentId || 'unknown',
        toAgentId: data.toAgentId,
        content: data.content || data.message || '',
        timestamp: data.timestamp || new Date().toISOString(),
        type: data.type || 'message',
        metadata: data.metadata
      }

      setMessages(prev => [...prev, message])

      // Update session message count
      if (currentSession && message.sessionId === currentSession.id) {
        setSessions(prev => prev.map(session => 
          session.id === message.sessionId
            ? { ...session, messageCount: session.messageCount + 1, lastActive: message.timestamp }
            : session
        ))
      }
    }

    const handleAgentStatus = (data: any) => {
      setAgentStatuses(prev => {
        const existing = prev.find(status => status.agentId === data.agentId)
        if (existing) {
          return prev.map(status => 
            status.agentId === data.agentId 
              ? { ...status, ...data }
              : status
          )
        } else {
          return [...prev, data]
        }
      })
    }

    const handleSessionUpdate = (data: any) => {
      setSessions(prev => prev.map(session => 
        session.id === data.sessionId
          ? { ...session, ...data }
          : session
      ))
    }

    // Register event listeners
    socket.on('coral-message', handleMessage)
    socket.on('agent-status', handleAgentStatus)
    socket.on('session-update', handleSessionUpdate)
    socket.on('error', (error: any) => {
      console.error('[Coral Studio] Socket error:', error)
      setError(error.message || 'Socket connection error')
    })

    return () => {
      socket.off('coral-message', handleMessage)
      socket.off('agent-status', handleAgentStatus)
      socket.off('session-update', handleSessionUpdate)
      socket.off('error')
    }
  }, [socket, user, currentSession])

  const createSession = useCallback(async (name: string) => {
    if (!user) return

    try {
      setIsLoading(true)
      setError(null)

      const newSession: Session = {
        id: `session_${Date.now()}_${user.id}`,
        name,
        created: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        messageCount: 0,
        agents: ['interface_agent'],
        status: 'active'
      }

      setSessions(prev => [...prev, newSession])
      setCurrentSession(newSession)

      // Notify server about new session
      if (socket) {
        socket.emit('create-session', {
          sessionId: newSession.id,
          sessionName: name,
          userId: user.id
        })
      }

    } catch (err: any) {
      setError(err.message || 'Failed to create session')
    } finally {
      setIsLoading(false)
    }
  }, [user, socket])

  const switchSession = useCallback((sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId)
    if (session) {
      setCurrentSession(session)
      
      // Load messages for this session
      setMessages(prev => prev.filter(msg => msg.sessionId === sessionId))
      
      // Notify server about session switch
      if (socket) {
        socket.emit('switch-session', {
          sessionId,
          userId: user?.id
        })
      }
    }
  }, [sessions, socket, user])

  const archiveSession = useCallback(async (sessionId: string) => {
    try {
      setIsLoading(true)
      setError(null)

      setSessions(prev => prev.map(session => 
        session.id === sessionId
          ? { ...session, status: 'archived' as const }
          : session
      ))

      // If archiving current session, switch to another active session
      if (currentSession?.id === sessionId) {
        const activeSession = sessions.find(s => s.id !== sessionId && s.status === 'active')
        if (activeSession) {
          setCurrentSession(activeSession)
        }
      }

      // Notify server
      if (socket) {
        socket.emit('archive-session', {
          sessionId,
          userId: user?.id
        })
      }

    } catch (err: any) {
      setError(err.message || 'Failed to archive session')
    } finally {
      setIsLoading(false)
    }
  }, [sessions, currentSession, socket, user])

  const sendMessage = useCallback(async (params: SendMessageParams) => {
    if (!socket || !user || !currentSession) return

    try {
      setError(null)

      const message: CoralMessage = {
        id: `msg_${Date.now()}_${Math.random()}`,
        sessionId: params.sessionId,
        fromAgentId: `user_${user.id}`,
        toAgentId: params.targetAgents?.[0],
        content: params.content,
        timestamp: new Date().toISOString(),
        type: 'message'
      }

      // Add message to local state immediately
      setMessages(prev => [...prev, message])

      // Send via Socket.IO
      socket.emit('send-message', {
        ...params,
        userId: user.id,
        messageId: message.id,
        timestamp: message.timestamp
      })

    } catch (err: any) {
      setError(err.message || 'Failed to send message')
    }
  }, [socket, user, currentSession])

  const refreshAgentStatuses = useCallback(async () => {
    if (!user) return

    try {
      setIsLoading(true)
      setError(null)

      // Fetch agent statuses from API
      const response = await fetch(`/api/coral/agent-status?userId=${user.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch agent statuses')
      }

      const data = await response.json()
      setAgentStatuses(data.statuses || [])

      // Also request via Socket.IO for real-time updates
      if (socket) {
        socket.emit('get-agent-statuses', { userId: user.id })
      }

    } catch (err: any) {
      setError(err.message || 'Failed to refresh agent statuses')
    } finally {
      setIsLoading(false)
    }
  }, [user, socket])

  // Initial load of agent statuses
  useEffect(() => {
    if (user) {
      refreshAgentStatuses()
    }
  }, [user, refreshAgentStatuses])

  return {
    sessions,
    currentSession,
    createSession,
    switchSession,
    archiveSession,
    sendMessage,
    messages,
    agentStatuses,
    refreshAgentStatuses,
    isLoading,
    error
  }
}
