import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, getSupabaseServerClient } from '@/lib/supabase';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function POST(request: NextRequest) {
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
    console.log(`Rescheduling content for user ${userId}`)
    
    const supabase = getSupabaseServerClient();
    
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
        .eq('user_id', userId)
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
        .eq('user_id', userId)
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
