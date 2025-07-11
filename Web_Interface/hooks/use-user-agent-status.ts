"use client"

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'

// Interface for agent status
interface AgentStatus {
  id: number
  agent_name: string
  status: "running" | "warning" | "error" | "stopped"
  health: number
  last_heartbeat: string | null
  last_error: string | null
  last_activity: string | null
  updated_at: string
  user_id: string
}

interface AgentStatusState {
  data: AgentStatus[] | null
  isLoading: boolean
  error: string | null
}

// Hook for fetching user-specific agent status
export function useUserAgentStatus(refreshKey?: number): AgentStatusState {
  const [state, setState] = useState<AgentStatusState>({
    data: null,
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    // Skip execution during SSR
    if (typeof window === 'undefined') {
      return
    }
    
    let isMounted = true
    
    const fetchUserAgentStatus = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }))
        
        // Create Supabase client
        const supabase = createClientComponentClient<Database>()
        
        // Get the current user
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('❌ User Agent Status Hook: Session error:', sessionError)
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
          console.error('❌ User Agent Status Hook: No authenticated user')
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
        console.log('✅ User Agent Status Hook: User authenticated:', userId)
        
        // Query agent status for the current user
        const { data: agentStatus, error: statusError } = await supabase
          .from('agent_status')
          .select('*')
          .eq('user_id', userId)
        
        if (statusError) {
          console.error('❌ User Agent Status Hook: Error fetching agent status:', statusError)
          if (isMounted) {
            setState({
              data: null,
              isLoading: false,
              error: statusError.message || 'Failed to fetch agent status'
            })
          }
          return
        }
        
        console.log(`✅ User Agent Status Hook: Successfully fetched ${agentStatus?.length || 0} agent statuses`)
        
        if (isMounted) {
          setState({
            data: agentStatus as AgentStatus[] || [],
            isLoading: false,
            error: null
          })
        }
      } catch (error: any) {
        console.error('❌ User Agent Status Hook: Unexpected error:', error)
        if (isMounted) {
          setState({
            data: null,
            isLoading: false,
            error: error.message || 'An unknown error occurred'
          })
        }
      }
    }

    fetchUserAgentStatus()
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false
    }
  }, [refreshKey])

  return state
}
