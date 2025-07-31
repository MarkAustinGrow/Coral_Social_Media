"use client"

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error'

interface UseSocketReturn {
  socket: null // Keeping for compatibility, but using REST API instead
  isConnected: boolean
  connectionStatus: ConnectionStatus
  error: string | null
  reconnect: () => void
}

export function useSocket(): UseSocketReturn {
  const { user } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const healthCheckIntervalRef = useRef<NodeJS.Timeout>()
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5

  const checkConnection = async () => {
    if (!user) return

    try {
      const response = await fetch(`/api/socket.io?action=get-agent-statuses&userId=${user.id}`)
      
      if (response.ok) {
        if (!isConnected) {
          console.log('[Socket API] Connected successfully')
          setIsConnected(true)
          setConnectionStatus('connected')
          setError(null)
          reconnectAttemptsRef.current = 0
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (err) {
      console.error('[Socket API] Connection check failed:', err)
      
      if (isConnected) {
        setIsConnected(false)
        setConnectionStatus('error')
        setError(err instanceof Error ? err.message : 'Connection failed')
        attemptReconnect()
      }
    }
  }

  const attemptReconnect = () => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setConnectionStatus('error')
      setError('Maximum reconnection attempts reached')
      return
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000) // Exponential backoff, max 30s
    reconnectAttemptsRef.current++

    console.log(`[Socket API] Attempting reconnect ${reconnectAttemptsRef.current}/${maxReconnectAttempts} in ${delay}ms`)
    setConnectionStatus('connecting')
    
    reconnectTimeoutRef.current = setTimeout(() => {
      checkConnection()
    }, delay)
  }

  const connect = () => {
    if (!user) return

    setConnectionStatus('connecting')
    setError(null)
    
    // Initial connection check
    checkConnection()
    
    // Set up periodic health checks (every 30 seconds)
    healthCheckIntervalRef.current = setInterval(checkConnection, 30000)
  }

  const disconnect = () => {
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current)
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    setIsConnected(false)
    setConnectionStatus('disconnected')
    setError(null)
    reconnectAttemptsRef.current = 0
  }

  const reconnect = () => {
    disconnect()
    setTimeout(() => {
      if (user) {
        connect()
      }
    }, 1000)
  }

  // Initialize connection when user is available
  useEffect(() => {
    if (user) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [user])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [])

  return {
    socket: null, // Keeping for compatibility
    isConnected,
    connectionStatus,
    error,
    reconnect
  }
}
