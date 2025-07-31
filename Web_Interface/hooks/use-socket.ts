"use client"

import { useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '@/contexts/AuthContext'

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error'

interface UseSocketReturn {
  socket: Socket | null
  isConnected: boolean
  connectionStatus: ConnectionStatus
  error: string | null
  reconnect: () => void
}

export function useSocket(): UseSocketReturn {
  const { user } = useAuth()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5

  const connect = () => {
    if (!user) return

    setConnectionStatus('connecting')
    setError(null)

    // Create Socket.IO connection
    const newSocket = io({
      path: '/api/socket.io',
      addTrailingSlash: false,
      transports: ['websocket', 'polling'],
      timeout: 10000,
      auth: {
        userId: user.id,
        userEmail: user.email
      }
    })

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('[Socket.IO] Connected:', newSocket.id)
      setIsConnected(true)
      setConnectionStatus('connected')
      setError(null)
      reconnectAttemptsRef.current = 0
      
      // Join user-specific room
      newSocket.emit('join-user-room', user.id)
    })

    newSocket.on('disconnect', (reason) => {
      console.log('[Socket.IO] Disconnected:', reason)
      setIsConnected(false)
      setConnectionStatus('disconnected')
      
      // Auto-reconnect for certain disconnect reasons
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect automatically
        setError('Server disconnected the connection')
      } else {
        // Client-side disconnect, attempt to reconnect
        attemptReconnect()
      }
    })

    newSocket.on('connect_error', (err) => {
      console.error('[Socket.IO] Connection error:', err)
      setIsConnected(false)
      setConnectionStatus('error')
      setError(err.message)
      attemptReconnect()
    })

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('[Socket.IO] Reconnected after', attemptNumber, 'attempts')
      setError(null)
      reconnectAttemptsRef.current = 0
    })

    newSocket.on('reconnect_error', (err) => {
      console.error('[Socket.IO] Reconnection error:', err)
      setError(`Reconnection failed: ${err.message}`)
    })

    newSocket.on('reconnect_failed', () => {
      console.error('[Socket.IO] Reconnection failed after maximum attempts')
      setConnectionStatus('error')
      setError('Failed to reconnect after maximum attempts')
    })

    setSocket(newSocket)
  }

  const attemptReconnect = () => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setConnectionStatus('error')
      setError('Maximum reconnection attempts reached')
      return
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000) // Exponential backoff, max 30s
    reconnectAttemptsRef.current++

    console.log(`[Socket.IO] Attempting reconnect ${reconnectAttemptsRef.current}/${maxReconnectAttempts} in ${delay}ms`)
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (socket && !socket.connected) {
        socket.connect()
      }
    }, delay)
  }

  const reconnect = () => {
    if (socket) {
      socket.disconnect()
    }
    reconnectAttemptsRef.current = 0
    setError(null)
    connect()
  }

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    if (socket) {
      socket.disconnect()
      setSocket(null)
    }
    
    setIsConnected(false)
    setConnectionStatus('disconnected')
    setError(null)
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
    socket,
    isConnected,
    connectionStatus,
    error,
    reconnect
  }
}
