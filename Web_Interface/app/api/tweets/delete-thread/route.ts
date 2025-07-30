import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseServerClient, handleSupabaseError } from '@/lib/supabase'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { threadIds } = body
    
    if (!threadIds || !Array.isArray(threadIds) || threadIds.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Thread IDs are required and must be a non-empty array' 
        },
        { status: 400 }
      )
    }
    
    console.log(`Deleting thread with IDs: ${threadIds.join(', ')}`)
    
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
          details: 'Please log in to delete tweets' 
        },
        { status: 401 }
      )
    }
    
    const userId = session.user.id
    console.log(`User ${userId} requesting to delete thread`)
    
    // Get Supabase server client
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
    
    // Fetch all tweets in the thread to make sure they exist and belong to user
    const { data: tweets, error: tweetsError } = await supabase
      .from('potential_tweets')
      .select('*')
      .in('id', threadIds)
      .eq('user_id', userId)
      .order('position', { ascending: true })
    
    if (tweetsError) {
      console.error('Error fetching tweets:', tweetsError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch tweets',
          details: handleSupabaseError(tweetsError) 
        },
        { status: 500 }
      )
    }
    
    if (!tweets || tweets.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No tweets found for the provided IDs or you do not have permission to access them' 
        },
        { status: 404 }
      )
    }
    
    // Check if all tweets in the thread exist
    if (tweets.length !== threadIds.length) {
      const foundIds = tweets.map((tweet: any) => tweet.id)
      const missingIds = threadIds.filter(id => !foundIds.includes(id))
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Some tweets in the thread were not found or you do not have permission to access them',
          details: {
            missingIds
          }
        },
        { status: 404 }
      )
    }
    
    // Check if any tweets in the thread are already posted - prevent deletion of posted tweets
    const postedTweets = tweets.filter((tweet: any) => tweet.status === 'posted' && tweet.posted_at)
    if (postedTweets.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete thread containing posted tweets. Only scheduled and failed tweets can be deleted.',
          details: {
            postedTweetIds: postedTweets.map((tweet: any) => tweet.id),
            postedCount: postedTweets.length,
            totalCount: tweets.length
          }
        },
        { status: 400 }
      )
    }
    
    // Only allow deletion of scheduled and failed tweets
    const deletableTweets = tweets.filter((tweet: any) => 
      tweet.status === 'scheduled' || tweet.status === 'failed'
    )
    
    if (deletableTweets.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No deletable tweets found. Only scheduled and failed tweets can be deleted.',
          details: {
            tweetStatuses: tweets.map((tweet: any) => ({ id: tweet.id, status: tweet.status }))
          }
        },
        { status: 400 }
      )
    }
    
    if (deletableTweets.length !== tweets.length) {
      const nonDeletableIds = tweets
        .filter((tweet: any) => tweet.status !== 'scheduled' && tweet.status !== 'failed')
        .map((tweet: any) => tweet.id)
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Thread contains tweets that cannot be deleted (posted or posting tweets)',
          details: {
            nonDeletableIds,
            deletableCount: deletableTweets.length,
            totalCount: tweets.length
          }
        },
        { status: 400 }
      )
    }
    
    // Delete all tweets in the thread
    const deletableIds = deletableTweets.map((tweet: any) => tweet.id)
    const { error: deleteError } = await supabase
      .from('potential_tweets')
      .delete()
      .in('id', deletableIds)
      .eq('user_id', userId) // Extra safety check
    
    if (deleteError) {
      console.error('Error deleting tweets:', deleteError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to delete tweets',
          details: handleSupabaseError(deleteError) 
        },
        { status: 500 }
      )
    }
    
    console.log(`Successfully deleted ${deletableIds.length} tweets from thread`)
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: `Thread deleted successfully (${deletableIds.length} tweets removed)`,
      deletedIds: deletableIds,
      deletedCount: deletableIds.length
    })
  } catch (error: any) {
    console.error('Error in delete thread API:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to delete thread',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
