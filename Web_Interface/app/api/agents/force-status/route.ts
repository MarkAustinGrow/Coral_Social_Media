import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

/**
 * Force update an agent's status in the database
 * This is useful for cases where the agent process is stuck in a state
 * that doesn't match its actual status
 */
export async function POST(request: NextRequest) {
  try {
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
    
    // Update the agent status in the database
    try {
      const supabase = await getSupabaseClient()
      if (!supabase) {
        return NextResponse.json(
          { error: 'Supabase client not available' },
          { status: 500 }
        )
      }
      
      // Update agent status
      const { error } = await supabase
        .from('agent_status')
        .update({
          status,
          health,
          last_activity: lastActivity || `Status force-updated to ${status}`,
          updated_at: new Date().toISOString()
        })
        .eq('agent_name', agentName)
      
      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }
      
      return NextResponse.json({ 
        success: true,
        message: `Agent ${agentName} status force-updated to ${status}`
      })
    } catch (dbError: any) {
      console.error('Error updating agent status in database:', dbError);
      return NextResponse.json(
        { error: dbError.message || 'Database error occurred' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error in force-status API:', error);
    return NextResponse.json(
      { error: error.message || 'An unknown error occurred' },
      { status: 500 }
    )
  }
}
