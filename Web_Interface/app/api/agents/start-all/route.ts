import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'
import { startAllAgents } from '@/lib/process-manager'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Start All Agents API: Starting all agents process...')
    
    // Parse request body to get mode
    const body = await request.json()
    const mode = body.mode || 'coral' // Default to coral mode
    console.log(`🔧 Start All Agents API: Using mode: ${mode}`)
    
    // Create Supabase client with authentication
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Get the current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('❌ Start All Agents API: Session error:', sessionError)
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 })
    }
    
    if (!session?.user) {
      console.error('❌ Start All Agents API: No authenticated user')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const userId = session.user.id
    console.log('✅ Start All Agents API: User authenticated:', userId)
    
    // Get all agents for this user
    const { data: userAgents, error: agentsError } = await supabase
      .from('agent_status')
      .select('agent_name, status')
      .eq('user_id', userId)
    
    if (agentsError) {
      console.error('❌ Start All Agents API: Error fetching user agents:', agentsError)
      return NextResponse.json({ error: 'Failed to fetch user agents' }, { status: 500 })
    }
    
    if (!userAgents || userAgents.length === 0) {
      console.log('⚠️ Start All Agents API: No agents found for user')
      return NextResponse.json({ 
        error: 'No agents found for this user. Please create agents first.' 
      }, { status: 404 })
    }
    
    console.log(`🔧 Start All Agents API: Found ${userAgents.length} agents for user`)
    
    // Start all agent processes with user context and mode
    const success = await startAllAgents(userId, mode)
    
    if (!success) {
      console.error('❌ Start All Agents API: Failed to start agent processes')
      return NextResponse.json(
        { error: 'Failed to start all agent processes' },
        { status: 500 }
      )
    }
    
    console.log('✅ Start All Agents API: Agent processes started successfully')
    
    // Update only this user's agents to running in the database
    const { error: updateError } = await supabase
      .from('agent_status')
      .update({
        status: 'running',
        health: 100,
        last_activity: 'Agent started via Start All API',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
    
    if (updateError) {
      console.error('❌ Start All Agents API: Error updating agent statuses:', updateError)
      return NextResponse.json(
        { error: 'Failed to update agent statuses in database' },
        { status: 500 }
      )
    }
    
    console.log('✅ Start All Agents API: All agent statuses updated successfully')
    
    return NextResponse.json({ 
      success: true,
      message: `Successfully started ${userAgents.length} agents`,
      agentsStarted: userAgents.length
    })
  } catch (error: any) {
    console.error('❌ Start All Agents API: Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'An unknown error occurred' },
      { status: 500 }
    )
  }
}
