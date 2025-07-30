import { getSupabaseClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

// GET handler to fetch all topics for the authenticated user
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const authClient = createRouteHandlerClient<Database>({ cookies })
    const { data: { session }, error: sessionError } = await authClient.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError)
      return NextResponse.json(
        { error: 'Authentication error' },
        { status: 401 }
      )
    }
    
    if (!session?.user) {
      console.error('No authenticated user found')
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const userId = session.user.id
    const userEmail = session.user.email
    
    // DEBUGGING: Log detailed user information
    console.log('=== ENGAGEMENT METRICS DEBUG ===')
    console.log(`Session User ID: ${userId}`)
    console.log(`Session User Email: ${userEmail}`)
    console.log(`Expected User ID for mark@itcambridge.co.uk: 99d3ff50-dcb5-4389-8e76-2ecd626902bc`)
    console.log(`User ID Match: ${userId === '99d3ff50-dcb5-4389-8e76-2ecd626902bc'}`)
    console.log(`Full session user object:`, JSON.stringify(session.user, null, 2))
    console.log('================================')
    
    console.log(`Fetching engagement metrics for user: ${userId}`)
    
    const supabase = await getSupabaseClient()
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to connect to database' },
        { status: 500 }
      )
    }
    
    // ENHANCED DATABASE DEBUGGING
    console.log('=== DATABASE CONNECTION DEBUG ===')
    console.log('Supabase client created successfully')
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...')
    console.log('Supabase Key length:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length)
    
    // Test basic connection with a simple query first
    console.log('Testing basic database connection...')
    const { data: testData, error: testError } = await supabase
      .from('engagement_metrics')
      .select('count(*)')
      .limit(1)
    
    if (testError) {
      console.error('Basic connection test failed:', testError)
    } else {
      console.log('Basic connection test successful:', testData)
    }
    
    // Test if table exists and has any data
    console.log('Checking table structure and data...')
    const { data: allData, error: allError } = await supabase
      .from('engagement_metrics')
      .select('id, user_id, topic')
      .limit(5)
    
    if (allError) {
      console.error('Table structure check failed:', allError)
    } else {
      console.log('Sample table data:', allData)
      console.log(`Total sample records found: ${allData?.length || 0}`)
    }
    
    // Check specifically for our user_id
    console.log(`Searching for records with user_id: ${userId}`)
    console.log('================================')
    
    // Filter by user_id to ensure user isolation
    const { data, error } = await supabase
      .from('engagement_metrics')
      .select('*')
      .eq('user_id', userId)
      .order('engagement_score', { ascending: false })
    
    if (error) {
      console.error('Error fetching topics:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json(
        { error: 'Failed to fetch topics' },
        { status: 500 }
      )
    }
    
    console.log(`Found ${data?.length || 0} engagement metrics for user ${userId}`)
    if (data && data.length > 0) {
      console.log('Sample found records:', data.slice(0, 3).map(record => ({
        id: record.id,
        topic: record.topic,
        user_id: record.user_id
      })))
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

// POST handler to add a new topic for the authenticated user
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const authClient = createRouteHandlerClient<Database>({ cookies })
    const { data: { session }, error: sessionError } = await authClient.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError)
      return NextResponse.json(
        { error: 'Authentication error' },
        { status: 401 }
      )
    }
    
    if (!session?.user) {
      console.error('No authenticated user found')
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const userId = session.user.id
    
    const body = await request.json()
    const { topic, topic_description, category, subtopics } = body
    
    if (!topic) {
      return NextResponse.json(
        { error: 'Topic name is required' },
        { status: 400 }
      )
    }
    
    console.log(`Adding new topic for user ${userId}: ${topic}`)
    
    const supabase = await getSupabaseClient()
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to connect to database' },
        { status: 500 }
      )
    }
    
    // Include user_id in the insert to ensure proper user association
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
          last_updated: new Date().toISOString(),
          user_id: userId // CRITICAL: Associate with current user
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
    
    console.log(`Successfully added topic for user ${userId}`)
    return NextResponse.json(data[0])
  } catch (error) {
    console.error('Unexpected error adding topic:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
