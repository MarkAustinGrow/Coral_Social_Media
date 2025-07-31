"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export interface CoralSession {
  id: string
  name: string
  userId: string
  created: string
  lastActive: string
  messageCount: number
  agents: string[]
  status: 'active' | 'idle' | 'archived'
}

export interface CoralMessage {
  id: string
  sessionId: string
  fromAgentId: string
  toAgentId?: string
  content: string
  timestamp: string
  type: 'message' | 'mention' | 'tool_call' | 'tool_response' | 'status'
  metadata?: any
}

export interface AgentStatus {
  agentId: string
  status: 'online' | 'offline' | 'error' | 'busy'
  lastSeen: string
  messageCount?: number
  responseTime?: number
}

interface UseCoralStudioReturn {
  // Session Management
  sessions: CoralSession[]
  currentSession: CoralSession | null
  createSession: (name: string) => Promise<void>
  switchSession: (sessionId: string) => void
  archiveSession: (sessionId: string) => Promise<void>
  
  // Messaging
  messages: CoralMessage[]
  sendMessage: (content: string, targetAgents?: string[]) => Promise<void>
  
  // Agent Status
  agentStatuses: AgentStatus[]
  refreshAgentStatuses: () => Promise<void>
  
  // State
  isLoading: boolean
  error: string | null
  
  // Real-time updates
  refreshMessages: () => Promise<void>
  refreshSessions: () => Promise<void>
}

export function useCoralStudio(socket: any, user: any): UseCoralStudioReturn {
  const { user: authUser } = useAuth()
  const currentUser = user || authUser

  const [sessions, setSessions] = useState<CoralSession[]>([])
  const [currentSession, setCurrentSession] = useState<CoralSession | null>(null)
  const [messages, setMessages] = useState<CoralMessage[]>([])
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const refreshIntervalRef = useRef<NodeJS.Timeout>()
  const messagePollingRef = useRef<NodeJS.Timeout>()

  // Initialize default session
  const initializeDefaultSession = useCallback(async () => {
    if (!currentUser) return

    try {
      const response = await fetch(`/api/socket.io?action=get-sessions&userId=${currentUser.id}`)
      const data = await response.json()
      
      if (response.ok) {
        let userSessions = data.sessions || []
        
        // If no sessions exist, create a default one
        if (userSessions.length === 0) {
          const createResponse = await fetch('/api/socket.io', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'create-session',
              userId: currentUser.id,
              sessionName: 'Default Session'
            })
          })
          
          if (createResponse.ok) {
            const createData = await createResponse.json()
            userSessions = [createData.session]
          }
        }
        
        setSessions(userSessions)
        
        // Set the first session as current if none is selected
        if (!currentSession && userSessions.length > 0) {
          setCurrentSession(userSessions[0])
        }
      }
    } catch (err) {
      console.error('[Coral Studio] Failed to initialize sessions:', err)
      setError(err instanceof Error ? err.message : 'Failed to initialize sessions')
    }
  }, [currentUser, currentSession])

  // Load sessions
  const refreshSessions = useCallback(async () => {
    if (!currentUser) return

    try {
      const response = await fetch(`/api/socket.io?action=get-sessions&userId=${currentUser.id}`)
      const data = await response.json()
      
      if (response.ok) {
        setSessions(data.sessions || [])
      } else {
        throw new Error(data.error || 'Failed to load sessions')
      }
    } catch (err) {
      console.error('[Coral Studio] Failed to refresh sessions:', err)
      setError(err instanceof Error ? err.message : 'Failed to refresh sessions')
    }
  }, [currentUser])

  // Load messages for current session
  const refreshMessages = useCallback(async () => {
    if (!currentUser || !currentSession) return

    try {
      const response = await fetch(`/api/socket.io?action=get-messages&userId=${currentUser.id}&sessionId=${currentSession.id}`)
      const data = await response.json()
      
      if (response.ok) {
        setMessages(data.messages || [])
      } else {
        throw new Error(data.error || 'Failed to load messages')
      }
    } catch (err) {
      console.error('[Coral Studio] Failed to refresh messages:', err)
      setError(err instanceof Error ? err.message : 'Failed to refresh messages')
    }
  }, [currentUser, currentSession])

  // Load agent statuses
  const refreshAgentStatuses = useCallback(async () => {
    if (!currentUser) return

    try {
      const response = await fetch(`/api/socket.io?action=get-agent-statuses&userId=${currentUser.id}`)
      const data = await response.json()
      
      if (response.ok) {
        setAgentStatuses(data.statuses || [])
      } else {
        throw new Error(data.error || 'Failed to load agent statuses')
      }
    } catch (err) {
      console.error('[Coral Studio] Failed to refresh agent statuses:', err)
      setError(err instanceof Error ? err.message : 'Failed to refresh agent statuses')
    }
  }, [currentUser])

  // Create new session
  const createSession = useCallback(async (name: string) => {
    if (!currentUser) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/socket.io', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-session',
          userId: currentUser.id,
          sessionName: name
        })
      })

      const data = await response.json()

      if (response.ok) {
        const newSession = data.session
        setSessions(prev => [...prev, newSession])
        setCurrentSession(newSession)
        setMessages([]) // Clear messages for new session
      } else {
        throw new Error(data.error || 'Failed to create session')
      }
    } catch (err) {
      console.error('[Coral Studio] Failed to create session:', err)
      setError(err instanceof Error ? err.message : 'Failed to create session')
    } finally {
      setIsLoading(false)
    }
  }, [currentUser])

  // Switch to different session
  const switchSession = useCallback((sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId)
    if (session) {
      setCurrentSession(session)
      setMessages([]) // Clear messages, they'll be loaded by the effect
    }
  }, [sessions])

  // Archive session
  const archiveSession = useCallback(async (sessionId: string) => {
    if (!currentUser) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/socket.io', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'archive-session',
          userId: currentUser.id,
          sessionId
        })
      })

      if (response.ok) {
        setSessions(prev => prev.map(s => 
          s.id === sessionId ? { ...s, status: 'archived' as const } : s
        ))
        
        // If archiving current session, switch to another active session
        if (currentSession?.id === sessionId) {
          const activeSession = sessions.find(s => s.id !== sessionId && s.status === 'active')
          setCurrentSession(activeSession || null)
        }
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to archive session')
      }
    } catch (err) {
      console.error('[Coral Studio] Failed to archive session:', err)
      setError(err instanceof Error ? err.message : 'Failed to archive session')
    } finally {
      setIsLoading(false)
    }
  }, [currentUser, currentSession, sessions])

  // Send message
  const sendMessage = useCallback(async (content: string, targetAgents?: string[]) => {
    if (!currentUser || !currentSession) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/socket.io', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send-message',
          userId: currentUser.id,
          sessionId: currentSession.id,
          message: content,
          targetAgents
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Refresh messages to get the new message and any responses
        setTimeout(() => {
          refreshMessages()
        }, 500) // Small delay to allow for message processing
        
        // Also refresh after a longer delay to catch agent responses
        setTimeout(() => {
          refreshMessages()
        }, 3000)
      } else {
        throw new Error(data.error || 'Failed to send message')
      }
    } catch (err) {
      console.error('[Coral Studio] Failed to send message:', err)
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setIsLoading(false)
    }
  }, [currentUser, currentSession, refreshMessages])

  // Initialize when user changes
  useEffect(() => {
    if (currentUser) {
      initializeDefaultSession()
      refreshAgentStatuses()
    } else {
      setSessions([])
      setCurrentSession(null)
      setMessages([])
      setAgentStatuses([])
    }
  }, [currentUser, initializeDefaultSession, refreshAgentStatuses])

  // Load messages when current session changes
  useEffect(() => {
    if (currentSession) {
      refreshMessages()
    } else {
      setMessages([])
    }
  }, [currentSession, refreshMessages])

  // Set up periodic refresh for real-time updates
  useEffect(() => {
    if (currentUser) {
      // Refresh agent statuses every 30 seconds
      refreshIntervalRef.current = setInterval(() => {
        refreshAgentStatuses()
      }, 30000)

      // Poll for new messages every 5 seconds if we have an active session
      if (currentSession) {
        messagePollingRef.current = setInterval(() => {
          refreshMessages()
        }, 5000)
      }
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
      if (messagePollingRef.current) {
        clearInterval(messagePollingRef.current)
      }
    }
  }, [currentUser, currentSession, refreshAgentStatuses, refreshMessages])

  return {
    sessions,
    currentSession,
    createSession,
    switchSession,
    archiveSession,
    messages,
    sendMessage,
    agentStatuses,
    refreshAgentStatuses,
    isLoading,
    error,
    refreshMessages,
    refreshSessions
  }
}
