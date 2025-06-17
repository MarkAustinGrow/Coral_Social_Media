import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

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
    // Get Supabase client
    const supabase = await getSupabaseClient()
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client not available' },
        { status: 500 }
      )
    }
    
    // First, get existing agent names
    const { data: existingAgents, error: fetchError } = await supabase
      .from('agent_status')
      .select('agent_name')
    
    if (fetchError) {
      console.error('Error fetching existing agents:', fetchError)
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
    
    // Ensure each agent exists in the database
    for (const agentName of agentNames) {
      if (!existingAgentNames.has(agentName)) {
        // Agent doesn't exist, add it
        const { error: insertError } = await supabase
          .from('agent_status')
          .insert({
            agent_name: agentName,
            status: 'stopped',
            health: 0,
            last_activity: 'Agent added via API',
            updated_at: new Date().toISOString()
          })
        
        if (insertError) {
          console.error(`Error adding agent ${agentName}:`, insertError)
          results.errors++
        } else {
          results.added++
        }
      } else {
        results.alreadyExisted++
      }
    }
    
    // Return results
    return NextResponse.json({
      success: true,
      results,
      message: `Added ${results.added} agents, ${results.alreadyExisted} already existed, ${results.errors} errors`
    })
  } catch (error: any) {
    console.error('Error updating agent names:', error)
    return NextResponse.json(
      { error: error.message || 'An unknown error occurred' },
      { status: 500 }
    )
  }
}
