import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'
import { startAllAgents } from '@/lib/process-manager'

export async function POST(request: NextRequest) {
  try {
    // Start all agent processes
    const success = await startAllAgents()
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to start all agent processes' },
        { status: 500 }
      )
    }
    
    // Update all agents to running in the database
    try {
      const supabase = await getSupabaseClient()
      if (supabase) {
        // Update all agents to running
        await supabase
          .from('agent_status')
          .update({
            status: 'running',
            health: 100,
            last_activity: 'Agent started via Start All API',
            updated_at: new Date().toISOString()
          })
      } else {
        console.warn('Supabase client not available, agent statuses not updated in database');
        // We'll still return success since the processes were started
      }
    } catch (dbError: any) {
      console.error('Error updating agent statuses in database:', dbError);
      // We don't want to fail the entire request if just the database update fails
      // The processes have already been started
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error starting all agents:', error);
    return NextResponse.json(
      { error: error.message || 'An unknown error occurred' },
      { status: 500 }
    )
  }
}
