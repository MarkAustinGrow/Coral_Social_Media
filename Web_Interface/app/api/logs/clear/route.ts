import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

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
    
    // Delete all logs
    const { error } = await supabase
      .from('agent_logs')
      .delete()
      .neq('id', 0) // This is a workaround to delete all rows
    
    if (error) {
      console.error('Error clearing logs:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to clear logs' },
        { status: 500 }
      )
    }
    
    // Return success
    return NextResponse.json({
      success: true,
      message: 'All logs cleared successfully'
    })
  } catch (error: any) {
    console.error('Error clearing logs:', error)
    return NextResponse.json(
      { error: error.message || 'An unknown error occurred' },
      { status: 500 }
    )
  }
}
