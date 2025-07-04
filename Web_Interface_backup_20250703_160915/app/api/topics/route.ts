import { getSupabaseClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET handler to fetch all topics
export async function GET() {
  try {
    const supabase = await getSupabaseClient()
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to connect to database' },
        { status: 500 }
      )
    }
    
    const { data, error } = await supabase
      .from('engagement_metrics')
      .select('*')
      .order('engagement_score', { ascending: false })
    
    if (error) {
      console.error('Error fetching topics:', error)
      return NextResponse.json(
        { error: 'Failed to fetch topics' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error fetching topics:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// POST handler to add a new topic
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { topic, topic_description, category, subtopics } = body
    
    if (!topic) {
      return NextResponse.json(
        { error: 'Topic name is required' },
        { status: 400 }
      )
    }
    
    const supabase = await getSupabaseClient()
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to connect to database' },
        { status: 500 }
      )
    }
    
    const { data, error } = await supabase
      .from('engagement_metrics')
      .insert([
        {
          topic,
          topic_description: topic_description || null,
          category: category || null,
          subtopics: subtopics || [],
          engagement_score: 50, // Default score
          is_active: true, // Default to active
          last_updated: new Date().toISOString()
        }
      ])
      .select()
    
    if (error) {
      console.error('Error adding topic:', error)
      return NextResponse.json(
        { error: 'Failed to add topic' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(data[0])
  } catch (error) {
    console.error('Unexpected error adding topic:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
