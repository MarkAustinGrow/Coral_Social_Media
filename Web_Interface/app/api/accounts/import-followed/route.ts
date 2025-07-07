import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'
import { TwitterApi } from 'twitter-api-v2'
import { loadEnvFromRoot } from '@/lib/env-loader'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Import Followed API: Starting import process...')
    
    // Create Supabase client with authentication
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Get the current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('❌ Import Followed API: Session error:', sessionError)
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 })
    }
    
    if (!session?.user) {
      console.error('❌ Import Followed API: No authenticated user')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const userId = session.user.id
    console.log('✅ Import Followed API: User authenticated:', userId)
    
    // Load environment variables
    const env = loadEnvFromRoot()
    
    // Initialize Twitter API credentials
    const twitterBearerToken = env.TWITTER_BEARER_TOKEN
    const twitterApiKey = env.TWITTER_API_KEY
    const twitterApiSecret = env.TWITTER_API_SECRET
    const twitterAccessToken = env.TWITTER_ACCESS_TOKEN
    const twitterAccessSecret = env.TWITTER_ACCESS_SECRET
    
    if (!twitterBearerToken) {
      return NextResponse.json(
        { error: 'Twitter API bearer token not configured' },
        { status: 500 }
      )
    }
    
    // Initialize Twitter API client
    const twitterClient = new TwitterApi({
      appKey: twitterApiKey,
      appSecret: twitterApiSecret,
      accessToken: twitterAccessToken,
      accessSecret: twitterAccessSecret,
    })
    
    // Get authenticated user's ID
    const currentUser = await twitterClient.v2.me()
    if (!currentUser.data || !currentUser.data.id) {
      return NextResponse.json(
        { error: 'Failed to get authenticated user' },
        { status: 500 }
      )
    }
    
    const twitterUserId = currentUser.data.id
    console.log('✅ Import Followed API: Twitter user ID:', twitterUserId)
    
    // Fetch followed accounts
    const followedAccounts = await twitterClient.v2.following(twitterUserId, {
      max_results: 100, // Maximum allowed by the API
      'user.fields': 'name,username,profile_image_url',
    })
    
    if (!followedAccounts.data || !followedAccounts.data.length) {
      console.log('⚠️ Import Followed API: No followed accounts found')
      return NextResponse.json(
        { message: 'No followed accounts found' },
        { status: 200 }
      )
    }
    
    console.log(`🔧 Import Followed API: Found ${followedAccounts.data.length} followed accounts`)
    
    // Get existing accounts for this user to avoid duplicates
    const { data: existingAccounts, error: existingError } = await supabase
      .from('x_accounts')
      .select('username')
      .eq('user_id', userId)
    
    if (existingError) {
      console.error('❌ Import Followed API: Error fetching existing accounts:', existingError)
      return NextResponse.json({ error: 'Failed to check existing accounts' }, { status: 500 })
    }
    
    const existingUsernames = new Set(existingAccounts?.map(a => a.username) || [])
    
    // Filter out accounts that already exist for this user
    const newAccounts = followedAccounts.data.filter((account: { username: string }) => 
      !existingUsernames.has(account.username)
    )
    
    if (newAccounts.length === 0) {
      console.log('⚠️ Import Followed API: All followed accounts already exist for user')
      return NextResponse.json({
        message: 'All followed accounts are already in your monitoring list',
        count: 0,
        skipped: followedAccounts.data.length
      })
    }
    
    // Format accounts for Supabase with user_id
    const accountsToInsert = newAccounts.map((account: { username: string; name: string }) => ({
      username: account.username,
      display_name: account.name,
      priority: 5, // Default priority
      user_id: userId,
      last_fetched_at: null,
      created_at: new Date().toISOString(),
    }))
    
    console.log(`🔧 Import Followed API: Inserting ${accountsToInsert.length} new accounts for user`)
    
    // Insert accounts into Supabase
    const { data, error } = await supabase
      .from('x_accounts')
      .insert(accountsToInsert)
      .select()
    
    if (error) {
      console.error('❌ Import Followed API: Error inserting accounts:', error)
      return NextResponse.json(
        { error: `Failed to insert accounts: ${error.message}` },
        { status: 500 }
      )
    }
    
    console.log('✅ Import Followed API: Successfully imported accounts:', data?.length)
    
    return NextResponse.json({
      message: `Successfully imported ${accountsToInsert.length} new accounts from Twitter.`,
      count: accountsToInsert.length,
      skipped: followedAccounts.data.length - newAccounts.length,
      accounts: data,
    })
    
  } catch (error: any) {
    console.error('❌ Import Followed API: Unexpected error:', error)
    return NextResponse.json(
      { error: `An unexpected error occurred: ${error.message}` },
      { status: 500 }
    )
  }
}
