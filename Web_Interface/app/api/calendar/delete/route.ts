import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function POST(request: Request) {
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
    
    const supabase = await getSupabaseClient();
    
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
