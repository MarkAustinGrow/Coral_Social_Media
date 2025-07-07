import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Export Logs API: Starting logs export...')
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const level = searchParams.get('level')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    // Create Supabase client with authentication
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Get the current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('❌ Export Logs API: Session error:', sessionError)
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 })
    }
    
    if (!session?.user) {
      console.error('❌ Export Logs API: No authenticated user')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const userId = session.user.id
    console.log('✅ Export Logs API: User authenticated:', userId)
    
    // Get user's agents to filter logs
    const { data: userAgents, error: agentsError } = await supabase
      .from('agent_status')
      .select('agent_name')
      .eq('user_id', userId)
    
    if (agentsError) {
      console.error('❌ Export Logs API: Error fetching user agents:', agentsError)
      return NextResponse.json({ error: 'Failed to fetch user agents' }, { status: 500 })
    }
    
    if (!userAgents || userAgents.length === 0) {
      console.log('⚠️ Export Logs API: No agents found for user')
      return NextResponse.json([]) // Return empty array if no agents
    }
    
    const userAgentNames = userAgents.map(agent => agent.agent_name)
    console.log(`🔧 Export Logs API: Filtering logs for ${userAgentNames.length} user agents`)
    
    // Start query - filter by user's agents
    let query = supabase
      .from('agent_logs')
      .select('*')
      .in('agent_name', userAgentNames)
      .order('timestamp', { ascending: false })
    
    // Apply additional filters if provided
    if (level) {
      query = query.eq('level', level)
    }
    
    if (startDate) {
      query = query.gte('timestamp', startDate)
    }
    
    if (endDate) {
      query = query.lte('timestamp', endDate)
    }
    
    // Execute query
    const { data, error } = await query
    
    if (error) {
      console.error('❌ Export Logs API: Error fetching logs:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch logs' },
        { status: 500 }
      )
    }
    
    console.log(`✅ Export Logs API: Successfully exported ${data?.length || 0} logs`)
    
    // Return logs as JSON
    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('❌ Export Logs API: Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'An unknown error occurred' },
      { status: 500 }
    )
  }
}
