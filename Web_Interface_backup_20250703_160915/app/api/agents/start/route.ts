import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'
import { startAgent } from '@/lib/process-manager'

export async function POST(request: NextRequest) {
  try {
    const { agentName } = await request.json()
    
    // Start the agent process
    const success = await startAgent(agentName)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to start agent process' },
        { status: 500 }
      )
    }
    
    // Update agent status to running in the database
    try {
      const supabase = await getSupabaseClient()
      if (supabase) {
        // Update agent status to running
        await supabase
          .from('agent_status')
          .update({
            status: 'running',
            health: 100,
            last_activity: 'Agent started via API',
            updated_at: new Date().toISOString()
          })
          .eq('agent_name', agentName)
      } else {
        console.warn('Supabase client not available, agent status not updated in database');
        // We'll still return success since the process was started
      }
    } catch (dbError: any) {
      console.error('Error updating agent status in database:', dbError);
      // We don't want to fail the entire request if just the database update fails
      // The process has already been started
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error starting agent:', error);
    return NextResponse.json(
      { error: error.message || 'An unknown error occurred' },
      { status: 500 }
    )
  }
}
