import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, getSupabaseServerClient } from '@/lib/supabase';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, scheduledFor, blogPostId, position, isThread } = body;
    
    // Validate required parameters
    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }
    
    if (!scheduledFor) {
      return NextResponse.json(
        { error: 'scheduledFor date is required' },
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
    console.log(`Scheduling content for user ${userId}`)
    
    const supabase = getSupabaseServerClient();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to connect to database' },
        { status: 500 }
      );
    }
    
    // If this is a thread (multiple tweets), handle differently
    if (isThread && Array.isArray(content)) {
      // Ensure we have a blog post ID for the thread
      if (!blogPostId) {
        return NextResponse.json(
          { error: 'blogPostId is required for threads' },
          { status: 400 }
        );
      }
      
      // Insert each tweet in the thread
      const insertPromises = content.map((tweetContent, index) => {
        return supabase
          .from('potential_tweets')
          .insert({
            content: tweetContent,
            status: 'scheduled',
            scheduled_for: scheduledFor,
            blog_post_id: blogPostId,
            position: index,
            user_id: userId
          });
      });
      
      // Wait for all inserts to complete
      const results = await Promise.all(insertPromises);
      
      // Check for errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        console.error('Error scheduling thread:', errors);
        return NextResponse.json(
          { error: 'Failed to schedule one or more tweets in the thread' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: `Scheduled thread with ${content.length} tweets`
      });
    } else {
      // This is a single tweet
      const { data, error } = await supabase
        .from('potential_tweets')
        .insert({
          content: content,
          status: 'scheduled',
          scheduled_for: scheduledFor,
          blog_post_id: blogPostId || null,
          position: position || null,
          user_id: userId
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error scheduling tweet:', error);
        return NextResponse.json(
          { error: 'Failed to schedule tweet' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data,
        message: 'Tweet scheduled successfully'
      });
    }
  } catch (error) {
    console.error('Unexpected error in schedule route:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
