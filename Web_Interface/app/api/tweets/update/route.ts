import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, getSupabaseServerClient, handleSupabaseError } from '@/lib/supabase'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { tweetId, content } = body
    
    if (!tweetId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Tweet ID is required' 
        },
        { status: 400 }
      )
    }
    
    if (!content || content.trim() === '') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Tweet content is required and cannot be empty' 
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
    console.log(`User ${userId} updating tweet with ID: ${tweetId}`)
    
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
      .eq('user_id', userId)  // CRITICAL: Only allow users to update their own tweets
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
          error: 'Tweet not found or you do not have permission to edit this tweet' 
        },
        { status: 404 }
      )
    }
    
    // Check if the tweet is already posted
    if (tweet.status === 'posted' && tweet.posted_at) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot edit a tweet that has already been posted',
          details: {
            postedAt: tweet.posted_at
          }
        },
        { status: 400 }
      )
    }
    
    // Update the tweet content (with user_id filter for extra security)
    const { error: updateError } = await supabase
      .from('potential_tweets')
      .update({ content: content.trim() })
      .eq('id', tweetId)
      .eq('user_id', userId)  // CRITICAL: Double-check user ownership during update
    
    if (updateError) {
      console.error('Error updating tweet:', updateError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to update tweet',
          details: handleSupabaseError(updateError) 
        },
        { status: 500 }
      )
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Tweet updated successfully',
      tweetId
    })
  } catch (error: any) {
    console.error('Error in update tweet API:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to update tweet',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
