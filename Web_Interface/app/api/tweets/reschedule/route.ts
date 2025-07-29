import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, getSupabaseServerClient, handleSupabaseError } from '@/lib/supabase'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { tweetId, scheduledFor } = body
    
    if (!tweetId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Tweet ID is required' 
        },
        { status: 400 }
      )
    }
    
    if (!scheduledFor) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'New scheduled time is required' 
        },
        { status: 400 }
      )
    }
    
    // Validate that the new scheduled time is in the future
    const newScheduledDate = new Date(scheduledFor)
    const now = new Date()
    
    if (newScheduledDate <= now) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Scheduled time must be in the future' 
        },
        { status: 400 }
      )
    }
    
    // Get authenticated user
    const authClient = createRouteHandlerClient<Database>({ cookies })
    const { data: { session }, error: sessionError } = await authClient.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication error', 
          details: sessionError.message 
        },
        { status: 401 }
      )
    }
    
    if (!session?.user) {
      console.error('No authenticated user found')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Not authenticated', 
          details: 'Please log in to access this resource' 
        },
        { status: 401 }
      )
    }
    
    const userId = session.user.id
    console.log(`User ${userId} rescheduling tweet with ID: ${tweetId} to ${scheduledFor}`)
    
    // Get Supabase client
    const supabase = getSupabaseServerClient()
    
    if (!supabase) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Supabase client is not available. Please check your configuration.' 
        },
        { status: 500 }
      )
    }
    
    // Fetch the tweet to make sure it exists AND belongs to the current user
    const { data: tweet, error: tweetError } = await supabase
      .from('potential_tweets')
      .select('*')
      .eq('id', tweetId)
      .eq('user_id', userId)  // CRITICAL: Only allow users to reschedule their own tweets
      .single()
    
    if (tweetError) {
      console.error('Error fetching tweet:', tweetError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch tweet',
          details: handleSupabaseError(tweetError) 
        },
        { status: 500 }
      )
    }
    
    if (!tweet) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Tweet not found or you do not have permission to reschedule this tweet' 
        },
        { status: 404 }
      )
    }
    
    // Check if the tweet is in a state that can be rescheduled
    if (tweet.status === 'posted' && tweet.posted_at) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot reschedule a tweet that has already been posted',
          details: {
            postedAt: tweet.posted_at
          }
        },
        { status: 400 }
      )
    }
    
    if (tweet.status === 'posting') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot reschedule a tweet that is currently being posted' 
        },
        { status: 400 }
      )
    }
    
    // Update the tweet's scheduled time (with user_id filter for extra security)
    const { error: updateError } = await supabase
      .from('potential_tweets')
      .update({ 
        scheduled_for: scheduledFor,
        status: 'scheduled'  // Ensure status is set to scheduled
      })
      .eq('id', tweetId)
      .eq('user_id', userId)  // CRITICAL: Double-check user ownership during update
    
    if (updateError) {
      console.error('Error rescheduling tweet:', updateError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to reschedule tweet',
          details: handleSupabaseError(updateError) 
        },
        { status: 500 }
      )
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Tweet rescheduled successfully',
      tweetId,
      newScheduledFor: scheduledFor
    })
  } catch (error: any) {
    console.error('Error in reschedule tweet API:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to reschedule tweet',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
