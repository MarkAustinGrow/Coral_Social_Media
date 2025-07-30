import { getSupabaseClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

// POST handler to update a topic's active status for the authenticated user
export async function POST(request: NextRequest) {
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
    
    console.log(`Updating topic status for user ${userId}, topic ${topicId}: ${isActive}`)
    
    const supabase = await getSupabaseClient()
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to connect to database' },
        { status: 500 }
      )
    }
    
    // Update with user_id filter to ensure user isolation
    const { data, error } = await supabase
      .from('engagement_metrics')
      .update({
        is_active: isActive,
        last_updated: new Date().toISOString()
      })
      .eq('id', topicId)
      .eq('user_id', userId) // CRITICAL: Only update topics belonging to this user
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
        { error: 'Topic not found or access denied' },
        { status: 404 }
      )
    }
    
    console.log(`Successfully updated topic status for user ${userId}`)
    return NextResponse.json(data[0])
  } catch (error) {
    console.error('Unexpected error updating topic status:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
