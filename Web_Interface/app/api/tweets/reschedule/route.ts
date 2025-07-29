import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, getSupabaseServerClient, handleSupabaseError } from '@/lib/supabase'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { tweetId, scheduledFor, applyToThread } = body
    
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
    
    // Determine if we're rescheduling a single tweet or entire thread
    let updateQuery = supabase
      .from('potential_tweets')
      .update({ 
        scheduled_for: scheduledFor,
        status: 'scheduled'  // Ensure status is set to scheduled
      })
      .eq('user_id', userId)  // CRITICAL: Always filter by user ownership
    
    let affectedTweets = 1
    let message = 'Tweet rescheduled successfully'
    
    if (applyToThread && tweet.blog_post_id) {
      // Apply to entire thread - update all tweets with same blog_post_id
      console.log(`User ${userId} rescheduling entire thread for blog_post_id: ${tweet.blog_post_id}`)
      
      // First, count how many tweets will be affected
      const { data: threadTweets, error: countError } = await supabase
        .from('potential_tweets')
        .select('id')
        .eq('blog_post_id', tweet.blog_post_id)
        .eq('user_id', userId)
        .in('status', ['scheduled', 'failed'])  // Only reschedule tweets that can be rescheduled
      
      if (countError) {
        console.error('Error counting thread tweets:', countError)
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to count thread tweets',
            details: handleSupabaseError(countError) 
          },
          { status: 500 }
        )
      }
      
      affectedTweets = threadTweets?.length || 0
      message = `Thread rescheduled successfully (${affectedTweets} tweets)`
      
      // Update all tweets in the thread
      updateQuery = updateQuery
        .eq('blog_post_id', tweet.blog_post_id)
        .in('status', ['scheduled', 'failed'])  // Only reschedule tweets that can be rescheduled
    } else {
      // Apply to single tweet only
      updateQuery = updateQuery.eq('id', tweetId)
    }
    
    const { error: updateError } = await updateQuery
    
    if (updateError) {
      console.error('Error rescheduling tweet(s):', updateError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to reschedule tweet(s)',
          details: handleSupabaseError(updateError) 
        },
        { status: 500 }
      )
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      message,
      tweetId,
      newScheduledFor: scheduledFor,
      affectedTweets,
      appliedToThread: !!applyToThread
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
