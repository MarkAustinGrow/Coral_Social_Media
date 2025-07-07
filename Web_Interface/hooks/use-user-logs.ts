"use client"

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'

// Interface for log entries
interface LogEntry {
  id: number
  timestamp: string
  level: "info" | "warning" | "error"
  agent_name: string
  message: string
  metadata: any
  created_at: string
}

interface UseUserLogsOptions {
  level?: string
  limit?: number
}

interface LogsState {
  data: LogEntry[] | null
  isLoading: boolean
  error: string | null
}

// Hook for fetching user-specific logs
export function useUserLogs(options: UseUserLogsOptions = {}, refreshKey?: number): LogsState {
  const [state, setState] = useState<LogsState>({
    data: null,
    isLoading: true,
    error: null,
  })

  const { level, limit = 50 } = options

  useEffect(() => {
    // Skip execution during SSR
    if (typeof window === 'undefined') {
      return
    }
    
    let isMounted = true
    
    const fetchUserLogs = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }))
        
        // Create Supabase client
        const supabase = createClientComponentClient<Database>()
        
        // Get the current user
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('❌ User Logs Hook: Session error:', sessionError)
          if (isMounted) {
            setState({
              data: null,
              isLoading: false,
              error: 'Authentication error'
            })
          }
          return
        }
        
        if (!session?.user) {
          console.error('❌ User Logs Hook: No authenticated user')
          if (isMounted) {
            setState({
              data: null,
              isLoading: false,
              error: 'Not authenticated'
            })
          }
          return
        }
        
        const userId = session.user.id
        console.log('✅ User Logs Hook: User authenticated:', userId)
        
        // Get user's agents to filter logs
        const { data: userAgents, error: agentsError } = await supabase
          .from('agent_status')
          .select('agent_name')
          .eq('user_id', userId)
        
        if (agentsError) {
          console.error('❌ User Logs Hook: Error fetching user agents:', agentsError)
          if (isMounted) {
            setState({
              data: null,
              isLoading: false,
              error: 'Failed to fetch user agents'
            })
          }
          return
        }
        
        if (!userAgents || userAgents.length === 0) {
          console.log('⚠️ User Logs Hook: No agents found for user')
          if (isMounted) {
            setState({
              data: [],
              isLoading: false,
              error: null
            })
          }
          return
        }
        
        const userAgentNames = userAgents.map((agent: any) => agent.agent_name)
        console.log(`🔧 User Logs Hook: Filtering logs for ${userAgentNames.length} user agents`)
        
        // Start query - filter by user's agents
        let query = supabase
          .from('agent_logs')
          .select('*')
          .in('agent_name', userAgentNames)
          .order('timestamp', { ascending: false })
        
        // Apply level filter if provided
        if (level) {
          query = query.eq('level', level)
        }
        
        // Apply limit if provided
        if (limit) {
          query = query.limit(limit)
        }
        
        // Execute query
        const { data: logs, error: logsError } = await query
        
        if (logsError) {
          console.error('❌ User Logs Hook: Error fetching logs:', logsError)
          if (isMounted) {
            setState({
              data: null,
              isLoading: false,
              error: logsError.message || 'Failed to fetch logs'
            })
          }
          return
        }
        
        console.log(`✅ User Logs Hook: Successfully fetched ${logs?.length || 0} logs`)
        
        if (isMounted) {
          setState({
            data: logs as LogEntry[] || [],
            isLoading: false,
            error: null
          })
        }
      } catch (error: any) {
        console.error('❌ User Logs Hook: Unexpected error:', error)
        if (isMounted) {
          setState({
            data: null,
            isLoading: false,
            error: error.message || 'An unknown error occurred'
          })
        }
      }
    }

    fetchUserLogs()
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false
    }
  }, [level, limit, refreshKey])

  return state
}
