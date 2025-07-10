import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase'

// GET - Retrieve user's Twitter credentials (masked for security)
export async function GET(request: NextRequest) {
  try {
    // Get user from session/auth using server-side client
    const supabase = getSupabaseServerClient()
    if (!supabase) {
      console.error('Failed to get Supabase client')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database connection failed',
          details: 'Unable to initialize Supabase client. Check database configuration.'
        },
        { status: 500 }
      )
    }

    // Get user session with detailed error info
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication session error',
          details: sessionError.message,
          debug: sessionError
        },
        { status: 401 }
      )
    }
    
    if (!session?.user) {
      console.error('No user session found')
      return NextResponse.json(
        { 
          success: false, 
          error: 'User not authenticated',
          details: 'No valid user session found. Please log in again.',
          debug: { 
            hasSession: !!session,
            hasUser: !!session?.user,
            sessionData: session ? { 
              expires_at: session.expires_at,
              user_id: session.user?.id 
            } : null
          }
        },
        { status: 401 }
      )
    }

    console.log(`Checking Twitter credentials for user: ${session.user.id}`)

    const { data, error } = await supabase
      .from('user_twitter_credentials')
      .select('id, user_id, twitter_username, created_at, updated_at')
      .eq('user_id', session.user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching Twitter credentials:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch credentials',
          details: error.message,
          debug: { 
            userId: session.user.id,
            error: error.message,
            code: error.code
          }
        },
        { status: 500 }
      )
    }

    if (!data) {
      console.log('No Twitter credentials found for user')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Twitter credentials not found',
          details: 'No Twitter API credentials found for this user. Please visit the Setup page to connect your Twitter account.',
          debug: { 
            userId: session.user.id,
            credentialsFound: false
          }
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      credentials: {
        twitter_username: data.twitter_username,
        created_at: data.created_at,
        updated_at: data.updated_at
      },
      debug: { 
        userId: session.user.id,
        credentialsFound: true
      }
    })

  } catch (error: any) {
    console.error('Unexpected error in GET twitter-credentials:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error.message || 'An unexpected error occurred while fetching Twitter credentials',
        debug: { 
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      },
      { status: 500 }
    )
  }
}

// POST - Save/update user's Twitter credentials
export async function POST(request: NextRequest) {
  try {
    // Get user from session/auth using server-side client
    const supabase = getSupabaseServerClient()
    if (!supabase) {
      console.error('Failed to get Supabase server client')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database connection failed',
          details: 'Unable to initialize Supabase client. Check database configuration.'
        },
        { status: 500 }
      )
    }

    // Get user session with detailed error info
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication session error',
          details: sessionError.message,
          debug: sessionError
        },
        { status: 401 }
      )
    }
    
    if (!session?.user) {
      console.error('No user session found')
      return NextResponse.json(
        { 
          success: false, 
          error: 'User not authenticated',
          details: 'No valid user session found. Please log in again.',
          debug: { 
            hasSession: !!session,
            hasUser: !!session?.user
          }
        },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { api_key, api_secret, access_token, access_token_secret, twitter_username } = body

    if (!api_key || !api_secret || !access_token || !access_token_secret) {
      return NextResponse.json({ 
        success: false,
        error: 'Missing required fields: api_key, api_secret, access_token, access_token_secret' 
      }, { status: 400 })
    }

    console.log(`Saving Twitter credentials for user: ${session.user.id}`)

    // Check if user already has credentials
    const { data: existing } = await supabase
      .from('user_twitter_credentials')
      .select('id')
      .eq('user_id', session.user.id)
      .single()

    const credentialsData = {
      user_id: session.user.id,
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
        .eq('user_id', session.user.id)
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
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to save credentials',
          details: result.error.message,
          debug: { 
            userId: session.user.id,
            error: result.error.message,
            code: result.error.code
          }
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: existing ? 'Credentials updated successfully' : 'Credentials saved successfully',
      debug: { 
        userId: session.user.id,
        operation: existing ? 'update' : 'insert'
      }
    })

  } catch (error: any) {
    console.error('Unexpected error in POST twitter-credentials:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error.message || 'An unexpected error occurred while saving Twitter credentials',
        debug: { 
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      },
      { status: 500 }
    )
  }
}

// DELETE - Remove user's Twitter credentials
export async function DELETE(request: NextRequest) {
  try {
    // Get user from session/auth using server-side client
    const supabase = getSupabaseServerClient()
    if (!supabase) {
      console.error('Failed to get Supabase server client')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database connection failed',
          details: 'Unable to initialize Supabase client. Check database configuration.'
        },
        { status: 500 }
      )
    }

    // Get user session with detailed error info
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication session error',
          details: sessionError.message,
          debug: sessionError
        },
        { status: 401 }
      )
    }
    
    if (!session?.user) {
      console.error('No user session found')
      return NextResponse.json(
        { 
          success: false, 
          error: 'User not authenticated',
          details: 'No valid user session found. Please log in again.',
          debug: { 
            hasSession: !!session,
            hasUser: !!session?.user
          }
        },
        { status: 401 }
      )
    }

    console.log(`Deleting Twitter credentials for user: ${session.user.id}`)

    const { error } = await supabase
      .from('user_twitter_credentials')
      .delete()
      .eq('user_id', session.user.id)

    if (error) {
      console.error('Error deleting Twitter credentials:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to delete credentials',
          details: error.message,
          debug: { 
            userId: session.user.id,
            error: error.message,
            code: error.code
          }
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Credentials deleted successfully',
      debug: { 
        userId: session.user.id
      }
    })

  } catch (error: any) {
    console.error('Unexpected error in DELETE twitter-credentials:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error.message || 'An unexpected error occurred while deleting Twitter credentials',
        debug: { 
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      },
      { status: 500 }
    )
  }
}
