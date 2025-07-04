import { getSupabaseClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET handler to fetch a specific topic
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    
    const supabase = await getSupabaseClient()
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to connect to database' },
        { status: 500 }
      )
    }
    
    const { data, error } = await supabase
      .from('engagement_metrics')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      console.error(`Error fetching topic ${id}:`, error)
      return NextResponse.json(
        { error: 'Failed to fetch topic' },
        { status: 500 }
      )
    }
    
    if (!data) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error fetching topic:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// PATCH handler to update a topic
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    const body = await request.json()
    
    const supabase = await getSupabaseClient()
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to connect to database' },
        { status: 500 }
      )
    }
    
    // Update the last_updated timestamp
    body.last_updated = new Date().toISOString()
    
    const { data, error } = await supabase
      .from('engagement_metrics')
      .update(body)
      .eq('id', id)
      .select()
    
    if (error) {
      console.error(`Error updating topic ${id}:`, error)
      return NextResponse.json(
        { error: 'Failed to update topic' },
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
    console.error('Unexpected error updating topic:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// DELETE handler to delete a topic
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    
    const supabase = await getSupabaseClient()
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to connect to database' },
        { status: 500 }
      )
    }
    
    const { error } = await supabase
      .from('engagement_metrics')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error(`Error deleting topic ${id}:`, error)
      return NextResponse.json(
        { error: 'Failed to delete topic' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error deleting topic:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
