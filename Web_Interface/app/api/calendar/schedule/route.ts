import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function POST(request: Request) {
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
    
    const supabase = await getSupabaseClient();
    
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
            position: index
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
          position: position || null
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
