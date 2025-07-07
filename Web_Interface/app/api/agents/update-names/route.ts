import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

// Define the agent names we want to ensure exist in the database
const agentNames = [
  "Tweet Scraping Agent",
  "Hot Topic Agent",
  "Tweet Research Agent",
  "Blog Writing Agent",
  "Blog Critique Agent",
  "Blog to Tweet Agent",
  "Twitter Posting Agent",
  "X Reply Agent"
]

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Update Names API: Starting agent names update...')
    
    // Create Supabase client with authentication
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Get the current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('❌ Update Names API: Session error:', sessionError)
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 })
    }
    
    if (!session?.user) {
      console.error('❌ Update Names API: No authenticated user')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const userId = session.user.id
    console.log('✅ Update Names API: User authenticated:', userId)
    
    // First, get existing agent names for this user
    const { data: existingAgents, error: fetchError } = await supabase
      .from('agent_status')
      .select('agent_name')
      .eq('user_id', userId)
    
    if (fetchError) {
      console.error('❌ Update Names API: Error fetching existing agents:', fetchError)
      return NextResponse.json(
        { error: fetchError.message || 'Failed to fetch existing agents' },
        { status: 500 }
      )
    }
    
    // Create a set of existing agent names for quick lookup
    const existingAgentNames = new Set(existingAgents?.map(agent => agent.agent_name) || [])
    
    // Track results
    const results = {
      added: 0,
      alreadyExisted: 0,
      errors: 0
    }
    
    console.log(`🔧 Update Names API: Found ${existingAgentNames.size} existing agents for user`)
    
    // Ensure each agent exists in the database for this user
    for (const agentName of agentNames) {
      if (!existingAgentNames.has(agentName)) {
        // Agent doesn't exist for this user, add it
        const { error: insertError } = await supabase
          .from('agent_status')
          .insert({
            agent_name: agentName,
            status: 'stopped',
            health: 0,
            last_activity: 'Agent added via API',
            updated_at: new Date().toISOString(),
            user_id: userId
          })
        
        if (insertError) {
          console.error(`❌ Update Names API: Error adding agent ${agentName}:`, insertError)
          results.errors++
        } else {
          console.log(`✅ Update Names API: Added agent ${agentName}`)
          results.added++
        }
      } else {
        results.alreadyExisted++
      }
    }
    
    console.log('✅ Update Names API: Agent names update completed:', results)
    
    // Return results
    return NextResponse.json({
      success: true,
      results,
      message: `Added ${results.added} agents, ${results.alreadyExisted} already existed, ${results.errors} errors`
    })
  } catch (error: any) {
    console.error('❌ Update Names API: Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'An unknown error occurred' },
      { status: 500 }
    )
  }
}
