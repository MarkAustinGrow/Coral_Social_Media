import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, handleSupabaseError } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { tweetId } = body
    
    if (!tweetId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Tweet ID is required' 
        },
        { status: 400 }
      )
    }
    
    console.log(`Deleting tweet with ID: ${tweetId}`)
    
    // Get Supabase client
    const supabase = await getSupabaseClient()
    
    if (!supabase) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Supabase client is not available. Please check your configuration.' 
        },
        { status: 500 }
      )
    }
    
    // Fetch the tweet to make sure it exists
    const { data: tweet, error: tweetError } = await supabase
      .from('potential_tweets')
      .select('*')
      .eq('id', tweetId)
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
          error: 'Tweet not found' 
        },
        { status: 404 }
      )
    }
    
    // Check if the tweet is already posted
    if (tweet.status === 'posted' && tweet.posted_at) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete a tweet that has already been posted',
          details: {
            postedAt: tweet.posted_at
          }
        },
        { status: 400 }
      )
    }
    
    // Delete the tweet
    const { error: deleteError } = await supabase
      .from('potential_tweets')
      .delete()
      .eq('id', tweetId)
    
    if (deleteError) {
      console.error('Error deleting tweet:', deleteError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to delete tweet',
          details: handleSupabaseError(deleteError) 
        },
        { status: 500 }
      )
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Tweet deleted successfully',
      tweetId
    })
  } catch (error: any) {
    console.error('Error in delete tweet API:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to delete tweet',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
