import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'
import { startAgent } from '@/lib/process-manager'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Start Agent API: Starting agent start process...')
    
    const { agentName, mode = 'coral' } = await request.json()
    
    if (!agentName) {
      return NextResponse.json(
        { error: 'Agent name is required' },
        { status: 400 }
      )
    }
    
    console.log(`🔧 Start Agent API: Starting ${agentName} in ${mode} mode`)
    
    // Create Supabase client with authentication
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Get the current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('❌ Start Agent API: Session error:', sessionError)
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 })
    }
    
    if (!session?.user) {
      console.error('❌ Start Agent API: No authenticated user')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const userId = session.user.id
    console.log('✅ Start Agent API: User authenticated:', userId, 'Agent:', agentName)
    
    // Verify the user owns this agent
    const { data: agent, error: agentError } = await supabase
      .from('agent_status')
      .select('id, agent_name, status')
      .eq('agent_name', agentName)
      .eq('user_id', userId)
      .single()
    
    if (agentError || !agent) {
      console.error('❌ Start Agent API: Agent not found for user:', agentError)
      return NextResponse.json({ 
        error: 'Agent not found or you do not have permission to control this agent' 
      }, { status: 404 })
    }
    
    console.log('🔧 Start Agent API: Found agent:', agent.agent_name, 'Current status:', agent.status)
    
    // Start the agent process with user context and mode
    const success = await startAgent(agentName, userId, mode)
    
    if (!success) {
      console.error('❌ Start Agent API: Failed to start agent process')
      return NextResponse.json(
        { error: 'Failed to start agent process' },
        { status: 500 }
      )
    }
    
    console.log('✅ Start Agent API: Agent process started successfully')
    
    // Update agent status to running in the database (only for this user's agent)
    // Clear any previous errors when starting fresh
    const { error: updateError } = await supabase
      .from('agent_status')
      .update({
        status: 'running',
        health: 100,
        last_activity: 'Agent started via API',
        last_error: null, // Clear previous errors on fresh start
        updated_at: new Date().toISOString()
      })
      .eq('agent_name', agentName)
      .eq('user_id', userId)
    
    if (updateError) {
      console.error('❌ Start Agent API: Error updating agent status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update agent status in database' },
        { status: 500 }
      )
    }
    
    console.log('✅ Start Agent API: Agent status updated successfully')
    
    return NextResponse.json({ 
      success: true,
      message: `${agentName} started successfully`
    })
  } catch (error: any) {
    console.error('❌ Start Agent API: Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'An unknown error occurred' },
      { status: 500 }
    )
  }
}
