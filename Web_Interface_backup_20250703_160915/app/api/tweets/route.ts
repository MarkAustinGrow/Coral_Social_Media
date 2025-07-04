import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseClient, handleSupabaseError } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
    const blogPostId = searchParams.get('blog_post_id') ? parseInt(searchParams.get('blog_post_id')!) : null
    
    console.log('Fetching tweets with params:', { status, limit, blogPostId })
    
    // Get Supabase client
    console.log('Getting Supabase client for tweets API')
    const supabase = await getSupabaseClient()
    
    if (!supabase) {
      console.error('Supabase client is not available')
      
      // Try to create a client directly with environment variables
      console.log('Attempting to create Supabase client directly')
      const supabaseUrl = process.env.SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_KEY
      
      console.log('Direct env vars available:', {
        urlAvailable: !!supabaseUrl,
        keyAvailable: !!supabaseKey
      })
      
      if (supabaseUrl && supabaseKey) {
        try {
          console.log('Creating Supabase client directly with URL:', supabaseUrl.substring(0, 15) + '...')
          const directClient = createClient(supabaseUrl, supabaseKey)
          console.log('Direct Supabase client created successfully')
          
          // Continue with the direct client
          return await handleTweetRequests(directClient, status, limit, blogPostId)
        } catch (directError) {
          console.error('Failed to create direct Supabase client:', directError)
        }
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Supabase client is not available. Please check your configuration.' 
        },
        { status: 500 }
      )
    }
    
    // If we have a client, continue with the request
    return await handleTweetRequests(supabase, status, limit, blogPostId)
  } catch (error: any) {
    console.error('Error in tweets API:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch tweets',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * Handle tweet requests with a valid Supabase client
 */
async function handleTweetRequests(
  supabase: any, 
  status: string | null, 
  limit: number,
  blogPostId: number | null
) {
  try {
    // Check if the potential_tweets table exists
    try {
      console.log('Checking if potential_tweets table exists')
      const { error: tableCheckError } = await supabase
        .from('potential_tweets')
        .select('id')
        .limit(1)
      
      if (tableCheckError && tableCheckError.code === '42P01') {
        console.error('potential_tweets table does not exist:', tableCheckError)
        return NextResponse.json(
          { 
            success: false, 
            error: 'The potential_tweets table does not exist',
            details: handleSupabaseError(tableCheckError)
          },
          { status: 500 }
        )
      } else if (tableCheckError) {
        console.error('Error checking potential_tweets table:', tableCheckError)
        return NextResponse.json(
          { 
            success: false, 
            error: 'Error checking potential_tweets table',
            details: handleSupabaseError(tableCheckError)
          },
          { status: 500 }
        )
      } else {
        console.log('potential_tweets table exists')
      }
    } catch (error: any) {
      console.error('Error checking tables:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to check if required tables exist',
          details: error.message
        },
        { status: 500 }
      )
    }
    
    // Start query for tweets
    try {
      console.log('Starting query for tweets')
      let query = supabase.from('potential_tweets').select('*')
      
      // Apply status filter if provided
      if (status) {
        console.log(`Filtering by status: ${status}`)
        query = query.eq('status', status)
      }
      
      // Apply blog post ID filter if provided
      if (blogPostId) {
        console.log(`Filtering by blog_post_id: ${blogPostId}`)
        query = query.eq('blog_post_id', blogPostId)
      }
      
      // Apply limit
      query = query.limit(limit)
      
      // Order by position (for threads) and created_at
      query = query.order('blog_post_id', { ascending: true })
        .order('position', { ascending: true })
        .order('created_at', { ascending: false })
      
      console.log('Executing tweets query')
      // Execute query
      const { data: tweets, error: tweetsError } = await query
    
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
        console.log('No tweets found')
        return NextResponse.json({
          success: true,
          data: []
        })
      }
      
      console.log(`Found ${tweets.length} tweets`)
      
      // Return successful response
      return NextResponse.json({
        success: true,
        data: tweets
      })
    } catch (queryError: any) {
      console.error('Error executing queries:', queryError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Error executing database queries',
          details: queryError.message
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error in tweets API:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch tweets',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
