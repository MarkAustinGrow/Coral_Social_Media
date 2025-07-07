import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'
import { stopAgent } from '@/lib/process-manager'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Stop Agent API: Starting agent stop process...')
    
    const { agentName } = await request.json()
    
    if (!agentName) {
      return NextResponse.json(
        { error: 'Agent name is required' },
        { status: 400 }
      )
    }
    
    // Create Supabase client with authentication
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Get the current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('❌ Stop Agent API: Session error:', sessionError)
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 })
    }
    
    if (!session?.user) {
      console.error('❌ Stop Agent API: No authenticated user')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const userId = session.user.id
    console.log('✅ Stop Agent API: User authenticated:', userId, 'Agent:', agentName)
    
    // Verify the user owns this agent
    const { data: agent, error: agentError } = await supabase
      .from('agent_status')
      .select('id, agent_name, status')
      .eq('agent_name', agentName)
      .eq('user_id', userId)
      .single()
    
    if (agentError || !agent) {
      console.error('❌ Stop Agent API: Agent not found for user:', agentError)
      return NextResponse.json({ 
        error: 'Agent not found or you do not have permission to control this agent' 
      }, { status: 404 })
    }
    
    console.log('🔧 Stop Agent API: Found agent:', agent.agent_name, 'Current status:', agent.status)
    
    // Stop the agent process
    const success = await stopAgent(agentName)
    
    if (!success) {
      console.error('❌ Stop Agent API: Failed to stop agent process')
      return NextResponse.json(
        { error: 'Failed to stop agent process' },
        { status: 500 }
      )
    }
    
    console.log('✅ Stop Agent API: Agent process stopped successfully')
    
    // Update agent status to stopped in the database (only for this user's agent)
    const { error: updateError } = await supabase
      .from('agent_status')
      .update({
        status: 'stopped',
        health: 0,
        last_activity: 'Agent stopped via API',
        updated_at: new Date().toISOString()
      })
      .eq('agent_name', agentName)
      .eq('user_id', userId)
    
    if (updateError) {
      console.error('❌ Stop Agent API: Error updating agent status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update agent status in database' },
        { status: 500 }
      )
    }
    
    console.log('✅ Stop Agent API: Agent status updated successfully')
    
    return NextResponse.json({ 
      success: true,
      message: `${agentName} stopped successfully`
    })
  } catch (error: any) {
    console.error('❌ Stop Agent API: Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'An unknown error occurred' },
      { status: 500 }
    )
  }
}
