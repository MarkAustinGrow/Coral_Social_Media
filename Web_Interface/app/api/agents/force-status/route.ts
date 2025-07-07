import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

/**
 * Force update an agent's status in the database
 * This is useful for cases where the agent process is stuck in a state
 * that doesn't match its actual status
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Force Status API: Starting force status update...')
    
    const { agentName, status, health, lastActivity } = await request.json()
    
    // Validate inputs
    if (!agentName) {
      return NextResponse.json(
        { error: 'Agent name is required' },
        { status: 400 }
      )
    }
    
    if (!status || !['running', 'warning', 'error', 'stopped'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required (running, warning, error, stopped)' },
        { status: 400 }
      )
    }
    
    if (typeof health !== 'number' || health < 0 || health > 100) {
      return NextResponse.json(
        { error: 'Valid health is required (0-100)' },
        { status: 400 }
      )
    }
    
    // Create Supabase client with authentication
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Get the current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('❌ Force Status API: Session error:', sessionError)
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 })
    }
    
    if (!session?.user) {
      console.error('❌ Force Status API: No authenticated user')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const userId = session.user.id
    console.log('✅ Force Status API: User authenticated:', userId, 'Agent:', agentName)
    
    // Verify the user owns this agent
    const { data: agent, error: agentError } = await supabase
      .from('agent_status')
      .select('id, agent_name, status')
      .eq('agent_name', agentName)
      .eq('user_id', userId)
      .single()
    
    if (agentError || !agent) {
      console.error('❌ Force Status API: Agent not found for user:', agentError)
      return NextResponse.json({ 
        error: 'Agent not found or you do not have permission to control this agent' 
      }, { status: 404 })
    }
    
    console.log('🔧 Force Status API: Found agent:', agent.agent_name, 'Current status:', agent.status)
    
    // Update agent status (only for this user's agent)
    const { error: updateError } = await supabase
      .from('agent_status')
      .update({
        status,
        health,
        last_activity: lastActivity || `Status force-updated to ${status}`,
        updated_at: new Date().toISOString()
      })
      .eq('agent_name', agentName)
      .eq('user_id', userId)
    
    if (updateError) {
      console.error('❌ Force Status API: Error updating agent status:', updateError)
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }
    
    console.log('✅ Force Status API: Agent status updated successfully')
    
    return NextResponse.json({ 
      success: true,
      message: `Agent ${agentName} status force-updated to ${status}`
    })
  } catch (error: any) {
    console.error('❌ Force Status API: Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'An unknown error occurred' },
      { status: 500 }
    )
  }
}
