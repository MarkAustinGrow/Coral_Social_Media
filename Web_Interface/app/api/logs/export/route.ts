import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const level = searchParams.get('level')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    // Get Supabase client
    const supabase = await getSupabaseClient()
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client not available' },
        { status: 500 }
      )
    }
    
    // Start query
    let query = supabase
      .from('agent_logs')
      .select('*')
      .order('timestamp', { ascending: false })
    
    // Apply filters if provided
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
      console.error('Error fetching logs:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch logs' },
        { status: 500 }
      )
    }
    
    // Return logs as JSON
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error exporting logs:', error)
    return NextResponse.json(
      { error: error.message || 'An unknown error occurred' },
      { status: 500 }
    )
  }
}
