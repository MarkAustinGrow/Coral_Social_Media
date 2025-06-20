import { getSupabaseClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// POST handler to update a topic's active status
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { topicId, isActive } = body
    
    if (topicId === undefined) {
      return NextResponse.json(
        { error: 'Topic ID is required' },
        { status: 400 }
      )
    }
    
    if (isActive === undefined) {
      return NextResponse.json(
        { error: 'Active status is required' },
        { status: 400 }
      )
    }
    
    const supabase = await getSupabaseClient()
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to connect to database' },
        { status: 500 }
      )
    }
    
    const { data, error } = await supabase
      .from('engagement_metrics')
      .update({
        is_active: isActive,
        last_updated: new Date().toISOString()
      })
      .eq('id', topicId)
      .select()
    
    if (error) {
      console.error(`Error updating topic status ${topicId}:`, error)
      return NextResponse.json(
        { error: 'Failed to update topic status' },
        { status: 500 }
      )
    }
    
    if (data.length === 0) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(data[0])
  } catch (error) {
    console.error('Unexpected error updating topic status:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
