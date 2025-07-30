import { getSupabaseClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

// GET handler to fetch a specific topic for the authenticated user
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const authClient = createRouteHandlerClient<Database>({ cookies })
    const { data: { session }, error: sessionError } = await authClient.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError)
      return NextResponse.json(
        { error: 'Authentication error' },
        { status: 401 }
      )
    }
    
    if (!session?.user) {
      console.error('No authenticated user found')
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const userId = session.user.id
    const id = params.id
    
    console.log(`Fetching topic ${id} for user ${userId}`)
    
    const supabase = await getSupabaseClient()
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to connect to database' },
        { status: 500 }
      )
    }
    
    // Filter by user_id to ensure user isolation
    const { data, error } = await supabase
      .from('engagement_metrics')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
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
        { error: 'Topic not found or access denied' },
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

// PATCH handler to update a topic for the authenticated user
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const authClient = createRouteHandlerClient<Database>({ cookies })
    const { data: { session }, error: sessionError } = await authClient.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError)
      return NextResponse.json(
        { error: 'Authentication error' },
        { status: 401 }
      )
    }
    
    if (!session?.user) {
      console.error('No authenticated user found')
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const userId = session.user.id
    const id = params.id
    const body = await request.json()
    
    console.log(`Updating topic ${id} for user ${userId}`)
    
    const supabase = await getSupabaseClient()
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to connect to database' },
        { status: 500 }
      )
    }
    
    // Update the last_updated timestamp
    body.last_updated = new Date().toISOString()
    
    // Update with user_id filter to ensure user isolation
    const { data, error } = await supabase
      .from('engagement_metrics')
      .update(body)
      .eq('id', id)
      .eq('user_id', userId) // CRITICAL: Only update topics belonging to this user
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
        { error: 'Topic not found or access denied' },
        { status: 404 }
      )
    }
    
    console.log(`Successfully updated topic ${id} for user ${userId}`)
    return NextResponse.json(data[0])
  } catch (error) {
    console.error('Unexpected error updating topic:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// DELETE handler to delete a topic for the authenticated user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const authClient = createRouteHandlerClient<Database>({ cookies })
    const { data: { session }, error: sessionError } = await authClient.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError)
      return NextResponse.json(
        { error: 'Authentication error' },
        { status: 401 }
      )
    }
    
    if (!session?.user) {
      console.error('No authenticated user found')
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const userId = session.user.id
    const id = params.id
    
    console.log(`Deleting topic ${id} for user ${userId}`)
    
    const supabase = await getSupabaseClient()
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to connect to database' },
        { status: 500 }
      )
    }
    
    // Delete with user_id filter to ensure user isolation
    const { error } = await supabase
      .from('engagement_metrics')
      .delete()
      .eq('id', id)
      .eq('user_id', userId) // CRITICAL: Only delete topics belonging to this user
    
    if (error) {
      console.error(`Error deleting topic ${id}:`, error)
      return NextResponse.json(
        { error: 'Failed to delete topic' },
        { status: 500 }
      )
    }
    
    console.log(`Successfully deleted topic ${id} for user ${userId}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error deleting topic:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
