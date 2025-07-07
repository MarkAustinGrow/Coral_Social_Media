import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Add Account API: Starting account creation...')
    
    // Parse request body
    const body = await request.json()
    const { username, display_name } = body
    
    // Validate input
    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }
    
    // Create Supabase client with authentication
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Get the current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('❌ Add Account API: Session error:', sessionError)
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 })
    }
    
    if (!session?.user) {
      console.error('❌ Add Account API: No authenticated user')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const userId = session.user.id
    console.log('✅ Add Account API: User authenticated:', userId, 'Adding account:', username)
    
    // Check if user already has this account
    const { data: existingAccount, error: checkError } = await supabase
      .from('x_accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('username', username)
      .single()
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ Add Account API: Error checking existing account:', checkError)
      return NextResponse.json({ error: 'Failed to check existing account' }, { status: 500 })
    }
    
    if (existingAccount) {
      console.log('⚠️ Add Account API: Account already exists for user')
      return NextResponse.json({ 
        error: 'You already have this account in your monitoring list' 
      }, { status: 409 })
    }
    
    // Prepare account data with user_id
    const accountData = {
      username,
      display_name: display_name || username,
      priority: 5, // Default priority
      user_id: userId,
      last_fetched_at: null,
      created_at: new Date().toISOString(),
    }
    
    // Insert account into Supabase
    const { data, error } = await supabase
      .from('x_accounts')
      .insert([accountData])
      .select()
    
    if (error) {
      console.error('❌ Add Account API: Error inserting account:', error)
      return NextResponse.json(
        { error: `Failed to add account: ${error.message}` },
        { status: 500 }
      )
    }
    
    console.log('✅ Add Account API: Account added successfully:', data?.[0])
    
    return NextResponse.json({
      message: 'Account added successfully',
      account: data?.[0] || null,
    })
    
  } catch (error: any) {
    console.error('❌ Add Account API: Unexpected error:', error)
    return NextResponse.json(
      { error: `An unexpected error occurred: ${error.message}` },
      { status: 500 }
    )
  }
}
