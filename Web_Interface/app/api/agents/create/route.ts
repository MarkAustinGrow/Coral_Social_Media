import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

// Define the standard agents that should be created for each user
const STANDARD_AGENTS = [
  {
    agent_name: 'Tweet Scraping Agent',
    status: 'stopped',
    health: 0,
    last_activity: 'Agent initialized and ready to start'
  },
  {
    agent_name: 'Hot Topic Agent',
    status: 'stopped',
    health: 0,
    last_activity: 'Agent initialized and ready to start'
  },
  {
    agent_name: 'Tweet Research Agent',
    status: 'stopped',
    health: 0,
    last_activity: 'Agent initialized and ready to start'
  },
  {
    agent_name: 'Blog Writing Agent',
    status: 'stopped',
    health: 0,
    last_activity: 'Agent initialized and ready to start'
  },
  {
    agent_name: 'Blog Critique Agent',
    status: 'stopped',
    health: 0,
    last_activity: 'Agent initialized and ready to start'
  },
  {
    agent_name: 'Blog to Tweet Agent',
    status: 'stopped',
    health: 0,
    last_activity: 'Agent initialized and ready to start'
  },
  {
    agent_name: 'Twitter Posting Agent',
    status: 'stopped',
    health: 0,
    last_activity: 'Agent initialized and ready to start'
  },
  {
    agent_name: 'X Reply Agent',
    status: 'stopped',
    health: 0,
    last_activity: 'Agent initialized and ready to start'
  }
]

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Create Agents API: Starting agent creation process...')
    
    // Create Supabase client
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Get the current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('❌ Create Agents API: Session error:', sessionError)
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 })
    }
    
    if (!session?.user) {
      console.error('❌ Create Agents API: No authenticated user')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const userId = session.user.id
    console.log('✅ Create Agents API: User authenticated:', userId)
    
    // Check if user already has agents
    const { data: existingAgents, error: checkError } = await supabase
      .from('agent_status')
      .select('id, agent_name')
      .eq('user_id', userId)
    
    if (checkError) {
      console.error('❌ Create Agents API: Error checking existing agents:', checkError)
      return NextResponse.json({ error: 'Failed to check existing agents' }, { status: 500 })
    }
    
    if (existingAgents && existingAgents.length > 0) {
      console.log('⚠️ Create Agents API: User already has agents:', existingAgents.length)
      return NextResponse.json({ 
        error: 'Agents already exist for this user',
        existingAgents: existingAgents.map(a => a.agent_name)
      }, { status: 400 })
    }
    
    // Create agents for the user
    const agentsToCreate = STANDARD_AGENTS.map(agent => ({
      ...agent,
      user_id: userId,
      updated_at: new Date().toISOString()
    }))
    
    console.log('🔧 Create Agents API: Creating agents for user:', agentsToCreate.length)
    
    const { data: createdAgents, error: createError } = await supabase
      .from('agent_status')
      .insert(agentsToCreate)
      .select()
    
    if (createError) {
      console.error('❌ Create Agents API: Error creating agents:', createError)
      return NextResponse.json({ error: 'Failed to create agents' }, { status: 500 })
    }
    
    console.log('✅ Create Agents API: Successfully created agents:', createdAgents?.length)
    
    return NextResponse.json({
      success: true,
      message: `Successfully created ${createdAgents?.length || 0} agents`,
      agents: createdAgents
    })
    
  } catch (error) {
    console.error('❌ Create Agents API: Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
