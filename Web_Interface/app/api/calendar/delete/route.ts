import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, getSupabaseServerClient } from '@/lib/supabase';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, isThread, blogPostId } = body;
    
    console.log('Calendar Delete API called with:', { id, isThread, blogPostId });
    
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
    
    // Extract blog post ID from the event ID if it's in the format "blog_123"
    let actualBlogPostId = blogPostId;
    if (!actualBlogPostId && id && typeof id === 'string' && id.startsWith('blog_')) {
      actualBlogPostId = parseInt(id.replace('blog_', ''));
      console.log(`Extracted blog_post_id ${actualBlogPostId} from event id: ${id}`);
    }
    
    // If this is a thread, delete all tweets in the thread
    if (isThread || actualBlogPostId) {
      if (!actualBlogPostId) {
        return NextResponse.json(
          { error: 'Blog post ID is required for thread deletion' },
          { status: 400 }
        );
      }
      
      console.log(`Attempting to delete thread for blog_post_id: ${actualBlogPostId}`);
      
      // First, fetch the tweets to see what we're deleting
      const { data: tweetsToDelete, error: fetchError } = await supabase
        .from('potential_tweets')
        .select('id, status, content')
        .eq('blog_post_id', actualBlogPostId)
        .eq('user_id', userId);
      
      if (fetchError) {
        console.error('Error fetching tweets to delete:', fetchError);
        return NextResponse.json(
          { error: 'Failed to fetch tweets for deletion' },
          { status: 500 }
        );
      }
      
      console.log(`Found ${tweetsToDelete?.length || 0} tweets to delete:`, tweetsToDelete);
      
      if (!tweetsToDelete || tweetsToDelete.length === 0) {
        return NextResponse.json(
          { error: 'No tweets found for the specified blog post' },
          { status: 404 }
        );
      }
      
      // Delete all tweets in the thread (scheduled and failed only)
      const { data: deletedData, error: deleteError } = await supabase
        .from('potential_tweets')
        .delete()
        .eq('blog_post_id', actualBlogPostId)
        .eq('user_id', userId)
        .in('status', ['scheduled', 'failed']);
      
      if (deleteError) {
        console.error('Error deleting thread:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete thread', details: deleteError.message },
          { status: 500 }
        );
      }
      
      console.log(`Successfully deleted thread for blog_post_id: ${actualBlogPostId}`);
      
      return NextResponse.json({
        success: true,
        message: `Thread deleted successfully (${tweetsToDelete.length} tweets removed)`,
        deletedCount: tweetsToDelete.length
      });
    } else if (id && typeof id === 'number') {
      // This is a single tweet deletion by ID
      console.log(`Attempting to delete single tweet with id: ${id}`);
      
      const { data: deletedData, error: deleteError } = await supabase
        .from('potential_tweets')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
        .in('status', ['scheduled', 'failed']);
      
      if (deleteError) {
        console.error('Error deleting tweet:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete tweet', details: deleteError.message },
          { status: 500 }
        );
      }
      
      console.log(`Successfully deleted tweet with id: ${id}`);
      
      return NextResponse.json({
        success: true,
        message: 'Tweet deleted successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid parameters: either provide a numeric tweet ID or thread information' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Unexpected error in delete route:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
