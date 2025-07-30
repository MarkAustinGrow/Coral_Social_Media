import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Clear Errors API: Starting error clearing process...')
    
    const { agentName } = await request.json()
    
    if (!agentName) {
      return NextResponse.json(
        { error: 'Agent name is required' },
        { status: 400 }
      )
    }
    
    console.log(`🔧 Clear Errors API: Clearing errors for ${agentName}`)
    
    // Create Supabase client with authentication
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Get the current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('❌ Clear Errors API: Session error:', sessionError)
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 })
    }
    
    if (!session?.user) {
      console.error('❌ Clear Errors API: No authenticated user')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const userId = session.user.id
    console.log('✅ Clear Errors API: User authenticated:', userId, 'Agent:', agentName)
    
    // Verify the user owns this agent
    const { data: agent, error: agentError } = await supabase
      .from('agent_status')
      .select('id, agent_name, status, last_error')
      .eq('agent_name', agentName)
      .eq('user_id', userId)
      .single()
    
    if (agentError || !agent) {
      console.error('❌ Clear Errors API: Agent not found for user:', agentError)
      return NextResponse.json({ 
        error: 'Agent not found or you do not have permission to control this agent' 
      }, { status: 404 })
    }
    
    console.log('🔧 Clear Errors API: Found agent:', agent.agent_name, 'Current error:', agent.last_error)
    
    // Clear the error for this user's agent
    const { error: updateError } = await supabase
      .from('agent_status')
      .update({
        last_error: null,
        last_activity: 'Errors cleared manually',
        updated_at: new Date().toISOString()
      })
      .eq('agent_name', agentName)
      .eq('user_id', userId)
    
    if (updateError) {
      console.error('❌ Clear Errors API: Error clearing agent errors:', updateError)
      return NextResponse.json(
        { error: 'Failed to clear agent errors in database' },
        { status: 500 }
      )
    }
    
    console.log('✅ Clear Errors API: Agent errors cleared successfully')
    
    return NextResponse.json({ 
      success: true,
      message: `Errors cleared for ${agentName}`,
      previousError: agent.last_error
    })
  } catch (error: any) {
    console.error('❌ Clear Errors API: Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'An unknown error occurred' },
      { status: 500 }
    )
  }
}

// Also support clearing all errors for a user
export async function DELETE(request: NextRequest) {
  try {
    console.log('🔧 Clear All Errors API: Starting bulk error clearing process...')
    
    // Create Supabase client with authentication
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Get the current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('❌ Clear All Errors API: Session error:', sessionError)
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 })
    }
    
    if (!session?.user) {
      console.error('❌ Clear All Errors API: No authenticated user')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const userId = session.user.id
    console.log('✅ Clear All Errors API: User authenticated:', userId)
    
    // Clear all errors for this user's agents
    const { data: updatedAgents, error: updateError } = await supabase
      .from('agent_status')
      .update({
        last_error: null,
        last_activity: 'All errors cleared manually',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .not('last_error', 'is', null)
      .select('agent_name')
    
    if (updateError) {
      console.error('❌ Clear All Errors API: Error clearing all agent errors:', updateError)
      return NextResponse.json(
        { error: 'Failed to clear all agent errors in database' },
        { status: 500 }
      )
    }
    
    const clearedCount = updatedAgents?.length || 0
    console.log(`✅ Clear All Errors API: Cleared errors for ${clearedCount} agents`)
    
    return NextResponse.json({ 
      success: true,
      message: `Cleared errors for ${clearedCount} agents`,
      clearedAgents: updatedAgents?.map(a => a.agent_name) || []
    })
  } catch (error: any) {
    console.error('❌ Clear All Errors API: Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'An unknown error occurred' },
      { status: 500 }
    )
  }
}
