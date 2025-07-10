import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
)

// GET - Retrieve user's Twitter credentials (masked for security)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('user_twitter_credentials')
      .select('id, user_id, twitter_username, created_at, updated_at')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching Twitter credentials:', error)
      return NextResponse.json({ error: 'Failed to fetch credentials' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ hasCredentials: false }, { status: 200 })
    }

    return NextResponse.json({
      hasCredentials: true,
      twitter_username: data.twitter_username,
      created_at: data.created_at,
      updated_at: data.updated_at
    })

  } catch (error) {
    console.error('Error in GET twitter-credentials:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Save/update user's Twitter credentials
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, api_key, api_secret, access_token, access_token_secret, twitter_username } = body

    if (!userId || !api_key || !api_secret || !access_token || !access_token_secret) {
      return NextResponse.json({ 
        error: 'Missing required fields: userId, api_key, api_secret, access_token, access_token_secret' 
      }, { status: 400 })
    }

    // Check if user already has credentials
    const { data: existing } = await supabase
      .from('user_twitter_credentials')
      .select('id')
      .eq('user_id', userId)
      .single()

    const credentialsData = {
      user_id: userId,
      api_key,
      api_secret,
      access_token,
      access_token_secret,
      twitter_username: twitter_username || null,
      updated_at: new Date().toISOString()
    }

    let result
    if (existing) {
      // Update existing credentials
      result = await supabase
        .from('user_twitter_credentials')
        .update(credentialsData)
        .eq('user_id', userId)
        .select()
    } else {
      // Insert new credentials
      result = await supabase
        .from('user_twitter_credentials')
        .insert({
          ...credentialsData,
          created_at: new Date().toISOString()
        })
        .select()
    }

    if (result.error) {
      console.error('Error saving Twitter credentials:', result.error)
      return NextResponse.json({ error: 'Failed to save credentials' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: existing ? 'Credentials updated successfully' : 'Credentials saved successfully'
    })

  } catch (error) {
    console.error('Error in POST twitter-credentials:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove user's Twitter credentials
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('user_twitter_credentials')
      .delete()
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting Twitter credentials:', error)
      return NextResponse.json({ error: 'Failed to delete credentials' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Credentials deleted successfully'
    })

  } catch (error) {
    console.error('Error in DELETE twitter-credentials:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
