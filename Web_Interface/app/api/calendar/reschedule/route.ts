import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, newScheduledFor, isThread, blogPostId } = body;
    
    // Validate required parameters
    if (!id) {
      return NextResponse.json(
        { error: 'Tweet ID is required' },
        { status: 400 }
      );
    }
    
    if (!newScheduledFor) {
      return NextResponse.json(
        { error: 'New scheduled date is required' },
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
    
    // If this is a thread, update all tweets in the thread
    if (isThread && blogPostId) {
      const { data, error } = await supabase
        .from('potential_tweets')
        .update({
          scheduled_for: newScheduledFor
        })
        .eq('blog_post_id', blogPostId)
        .eq('status', 'scheduled');
      
      if (error) {
        console.error('Error rescheduling thread:', error);
        return NextResponse.json(
          { error: 'Failed to reschedule thread' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: 'Thread rescheduled successfully'
      });
    } else {
      // This is a single tweet
      const { data, error } = await supabase
        .from('potential_tweets')
        .update({
          scheduled_for: newScheduledFor
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error rescheduling tweet:', error);
        return NextResponse.json(
          { error: 'Failed to reschedule tweet' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data,
        message: 'Tweet rescheduled successfully'
      });
    }
  } catch (error) {
    console.error('Unexpected error in reschedule route:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
