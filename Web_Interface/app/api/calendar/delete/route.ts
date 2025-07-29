import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, getSupabaseServerClient } from '@/lib/supabase';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, isThread, blogPostId } = body;
    
    // Validate required parameters
    if (!id && !(isThread && blogPostId)) {
      return NextResponse.json(
        { error: 'Either tweet ID or thread information (isThread and blogPostId) is required' },
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
    console.log(`Deleting content for user ${userId}`)
    
    const supabase = getSupabaseServerClient();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to connect to database' },
        { status: 500 }
      );
    }
    
    // If this is a thread, delete all tweets in the thread
    if (isThread && blogPostId) {
      // Only delete scheduled tweets, not ones that have already been posted
      const { data, error } = await supabase
        .from('potential_tweets')
        .delete()
        .eq('blog_post_id', blogPostId)
        .eq('user_id', userId)
        .eq('status', 'scheduled');
      
      if (error) {
        console.error('Error deleting thread:', error);
        return NextResponse.json(
          { error: 'Failed to delete thread' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: 'Thread deleted successfully'
      });
    } else {
      // This is a single tweet
      const { data, error } = await supabase
        .from('potential_tweets')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
        .eq('status', 'scheduled');
      
      if (error) {
        console.error('Error deleting tweet:', error);
        return NextResponse.json(
          { error: 'Failed to delete tweet' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: 'Tweet deleted successfully'
      });
    }
  } catch (error) {
    console.error('Unexpected error in delete route:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
