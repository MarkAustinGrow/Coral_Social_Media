import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, getSupabaseServerClient } from '@/lib/supabase';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    
    // Validate required parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate parameters are required' },
        { status: 400 }
      );
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
    console.log(`Fetching calendar events for user ${userId} with params:`, { startDate, endDate, status })
    
    const supabase = getSupabaseServerClient();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to connect to database' },
        { status: 500 }
      );
    }
    
    // Build query for potential_tweets table with user filtering
    let query = supabase
      .from('potential_tweets')
      .select('*')
      .eq('user_id', userId)  // Filter by authenticated user
      .gte('scheduled_for', startDate)
      .lte('scheduled_for', endDate);
    
    // Add status filter if provided
    if (status) {
      query = query.eq('status', status);
    }
    
    // Execute query
    const { data, error } = await query.order('scheduled_for', { ascending: true });
    
    if (error) {
      console.error('Error fetching calendar events:', error);
      return NextResponse.json(
        { error: 'Failed to fetch calendar events' },
        { status: 500 }
      );
    }
    
    // Group tweets by blog_post_id to identify threads
    const threads: Record<string, any[]> = {};
    const standaloneEvents: any[] = [];
    
    data.forEach(tweet => {
      if (tweet.blog_post_id && tweet.position !== null) {
        // This is part of a thread
        const key = `blog_${tweet.blog_post_id}`;
        if (!threads[key]) {
          threads[key] = [];
        }
        threads[key].push(tweet);
      } else {
        // This is a standalone tweet
        standaloneEvents.push({
          ...tweet,
          type: 'tweet'
        });
      }
    });
    
    // Process threads into events
    const threadEvents = Object.entries(threads).map(([key, tweets]) => {
      // Sort tweets in thread by position
      tweets.sort((a, b) => a.position - b.position);
      
      // Use the first tweet's scheduled time for the thread
      const firstTweet = tweets[0];
      
      return {
        id: key,
        title: `Thread: ${tweets.length} tweets`,
        type: 'thread',
        status: firstTweet.status,
        date: firstTweet.scheduled_for,
        blog_post_id: firstTweet.blog_post_id,
        tweets: tweets
      };
    });
    
    // Combine standalone tweets and thread events
    const events = [...standaloneEvents, ...threadEvents];
    
    return NextResponse.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Unexpected error in calendar events route:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
