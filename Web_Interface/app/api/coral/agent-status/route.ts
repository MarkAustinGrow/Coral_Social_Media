import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 })
    }

    // Extract user ID from agent ID (format: agent_name_user_id)
    const parts = agentId.split('_')
    if (parts.length < 3) {
      return NextResponse.json({ error: 'Invalid agent ID format' }, { status: 400 })
    }
    
    const userId = parts[parts.length - 1]

    // Check if agent is currently connected to Coral server
    // This would typically involve checking the Coral server's status endpoint
    // For now, we'll simulate this by checking recent agent logs
    
    const { data: recentLogs, error: logsError } = await supabase
      .from('agent_logs')
      .select('*')
      .eq('agent_name', agentId.replace(`_${userId}`, ''))
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(10)

    if (logsError) {
      console.error('Error fetching agent logs:', logsError)
      return NextResponse.json({ 
        connected: false, 
        error: 'Failed to fetch agent status' 
      }, { status: 500 })
    }

    // Determine if agent is online based on recent activity
    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
    
    const recentActivity = recentLogs?.filter(log => 
      new Date(log.timestamp) > fiveMinutesAgo
    ) || []

    const isOnline = recentActivity.length > 0
    const lastSeen = recentLogs?.[0]?.timestamp
    const messageCount = recentLogs?.length || 0

    // Try to get session information from Coral server
    // This would be a real API call to coral.8interns.com in production
    let sessionId = null
    try {
      // Simulate checking Coral server for active sessions
      // In production, this would be:
      // const response = await fetch(`http://coral.8interns.com/api/sessions?agentId=${agentId}`)
      // const sessionData = await response.json()
      // sessionId = sessionData.sessionId
      
      if (isOnline) {
        sessionId = `session_${agentId}_${Date.now()}`
      }
    } catch (error) {
      console.error('Error checking Coral server:', error)
    }

    return NextResponse.json({
      connected: isOnline,
      lastSeen,
      messageCount,
      sessionId,
      agentId,
      userId
    })

  } catch (error) {
    console.error('Error in agent-status API:', error)
    return NextResponse.json({ 
      connected: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
