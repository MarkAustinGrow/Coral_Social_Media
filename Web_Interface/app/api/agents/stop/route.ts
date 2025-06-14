import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'
import { stopAgent } from '@/lib/process-manager'

export async function POST(request: NextRequest) {
  try {
    const { agentName } = await request.json()
    
    // Stop the agent process
    // The stopAgent function now handles updating the database if the process is not running
    const success = await stopAgent(agentName)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to stop agent process' },
        { status: 500 }
      )
    }
    
    // Update agent status in the database (this is now redundant for non-running processes
    // but we'll keep it for consistency and as a fallback)
    try {
      const supabase = await getSupabaseClient()
      if (supabase) {
        // Update agent status to stopped
        await supabase
          .from('agent_status')
          .update({
            status: 'stopped',
            health: 0,
            last_activity: 'Agent stopped via API',
            updated_at: new Date().toISOString()
          })
          .eq('agent_name', agentName)
      }
    } catch (dbError: any) {
      console.error('Error updating agent status in database:', dbError);
      // We don't want to fail the entire request if just the database update fails
      // The process has already been stopped
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error stopping agent:', error);
    return NextResponse.json(
      { error: error.message || 'An unknown error occurred' },
      { status: 500 }
    )
  }
}
