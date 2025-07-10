import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase'
import { getUserTwitterCredentials } from '@/lib/twitter-credentials'
import crypto from 'crypto'

// Interface for API usage data
interface ApiUsageData {
  endpoint: string
  requestsMade: number
  quota: number
  resetTime: string
  description: string
  dailyUsage?: any[]
  note?: string
  isInformational?: boolean
  isClientApp?: boolean
}

// Interface for our API response
interface RateLimitResponse {
  success: boolean
  data?: ApiUsageData[]
  error?: string
  isMock?: boolean
  message?: string
  debug?: any
}

// Endpoints we're interested in monitoring (Twitter API v1.1 format)
const MONITORED_ENDPOINTS = [
  { 
    path: '/statuses/update', 
    method: 'POST',
    description: 'Create tweets'
  },
  { 
    path: '/search/tweets', 
    method: 'GET',
    description: 'Search for tweets'
  },
  { 
    path: '/users/show', 
    method: 'GET',
    description: 'Get user information'
  },
  { 
    path: '/statuses/user_timeline', 
    method: 'GET',
    description: 'Get user tweets'
  },
  { 
    path: '/statuses/retweet', 
    method: 'POST',
    description: 'Retweet functionality'
  },
  { 
    path: '/statuses/mentions_timeline', 
    method: 'GET',
    description: 'Get mentions'
  }
]

export async function GET(request: NextRequest) {
  try {
    // Get user from session/auth using server-side client
    const supabase = getSupabaseServerClient()
    if (!supabase) {
      console.error('Failed to get Supabase server client')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database connection failed',
          details: 'Unable to initialize Supabase server client. Check database configuration.'
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

    // Get user's Twitter credentials with detailed error handling
    let credentials
    try {
      credentials = await getUserTwitterCredentials(session.user.id)
    } catch (credError: any) {
      console.error('Error fetching user credentials:', credError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch Twitter credentials',
          details: credError.message,
          debug: { 
            userId: session.user.id,
            error: credError.message,
            stack: credError.stack
          }
        },
        { status: 500 }
      )
    }
    
    if (!credentials) {
      console.log('User Twitter credentials not found in database')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Twitter credentials not configured',
          details: 'No Twitter API credentials found for this user. Please visit the Setup page to connect your Twitter account.',
          debug: { 
            userId: session.user.id,
            credentialsFound: false
          }
        },
        { status: 404 }
      )
    }
    
    console.log('Found user Twitter credentials, using OAuth 1.0a for Twitter API v1.1 rate limits')
    
    // Get Twitter rate limit data using OAuth 1.0a credentials
    try {
      const rateLimitData = await getTwitterRateLimitData(credentials)
      
      return NextResponse.json({
        success: true,
        data: rateLimitData,
        debug: {
          userId: session.user.id,
          hasCredentials: true,
          credentialType: 'OAuth 1.0a',
          endpointsMonitored: MONITORED_ENDPOINTS.length
        }
      })
    } catch (apiError: any) {
      console.error('Twitter API error:', apiError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch Twitter rate limit data',
          details: apiError.message,
          debug: { 
            userId: session.user.id,
            hasCredentials: true,
            credentialType: 'OAuth 1.0a',
            apiError: apiError.message
          }
        },
        { status: 500 }
      )
    }
    
  } catch (error: any) {
    console.error('Unexpected error in Twitter rate limits API:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error.message || 'An unexpected error occurred while fetching Twitter rate limits',
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

// Function to get Twitter rate limit data using OAuth 1.0a credentials
async function getTwitterRateLimitData(credentials: any): Promise<ApiUsageData[]> {
  const url = 'https://api.twitter.com/1.1/application/rate_limit_status.json';
  
  console.log('Fetching Twitter rate limit data from:', url);
  
  try {
    // Generate OAuth 1.0a signature
    const oauthParams = generateOAuthParams(credentials, 'GET', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': oauthParams
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Twitter API error:', errorText);
      throw new Error(`Twitter API returned ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Twitter API v1.1 rate limit data received successfully');
    
    return formatRateLimitData(data);
  } catch (error: any) {
    console.error('Error fetching Twitter rate limit data:', error.message);
    throw new Error(`Failed to fetch Twitter rate limits: ${error.message}`);
  }
}

// Function to generate OAuth 1.0a authorization header
function generateOAuthParams(credentials: any, method: string, url: string): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  
  const oauthParams = {
    oauth_consumer_key: credentials.api_key,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: credentials.access_token,
    oauth_version: '1.0'
  };
  
  // Create parameter string
  const paramString = Object.keys(oauthParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(oauthParams[key as keyof typeof oauthParams])}`)
    .join('&');
  
  // Create signature base string
  const signatureBaseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
  
  // Create signing key
  const signingKey = `${encodeURIComponent(credentials.api_secret)}&${encodeURIComponent(credentials.access_token_secret)}`;
  
  // Generate signature
  const signature = crypto.createHmac('sha1', signingKey).update(signatureBaseString).digest('base64');
  
  // Create authorization header
  const authParams = {
    ...oauthParams,
    oauth_signature: signature
  };
  
  const authHeader = 'OAuth ' + Object.keys(authParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(authParams[key as keyof typeof authParams])}"`)
    .join(', ');
  
  return authHeader;
}

// Function to format Twitter v1.1 rate limit data for our frontend
function formatRateLimitData(rateLimitData: any): ApiUsageData[] {
  const result: ApiUsageData[] = [];
  
  try {
    const resources = rateLimitData.resources;
    
    // Process each monitored endpoint
    for (const endpoint of MONITORED_ENDPOINTS) {
      let rateLimitInfo = null;
      
      // Map our endpoint paths to Twitter's rate limit structure
      switch (endpoint.path) {
        case '/statuses/update':
          rateLimitInfo = resources.statuses?.['/statuses/update'];
          break;
        case '/search/tweets':
          rateLimitInfo = resources.search?.['/search/tweets'];
          break;
        case '/users/show':
          rateLimitInfo = resources.users?.['/users/show/:id'];
          break;
        case '/statuses/user_timeline':
          rateLimitInfo = resources.statuses?.['/statuses/user_timeline'];
          break;
        case '/statuses/retweet':
          rateLimitInfo = resources.statuses?.['/statuses/retweet/:id'];
          break;
        case '/statuses/mentions_timeline':
          rateLimitInfo = resources.statuses?.['/statuses/mentions_timeline'];
          break;
      }
      
      if (rateLimitInfo) {
        const resetTime = new Date(rateLimitInfo.reset * 1000).toISOString();
        const requestsMade = rateLimitInfo.limit - rateLimitInfo.remaining;
        
        result.push({
          endpoint: `${endpoint.method} ${endpoint.path}`,
          requestsMade: requestsMade,
          quota: rateLimitInfo.limit,
          resetTime: resetTime,
          description: endpoint.description
        });
      } else {
        console.log(`Rate limit info not found for endpoint: ${endpoint.path}`);
      }
    }
    
    // Add informational card
    result.push({
      endpoint: 'API Rate Limit Information',
      requestsMade: 0,
      quota: 100,
      resetTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes from now
      description: 'Twitter API Rate Limit Information',
      note: 'Real-time rate limit data from Twitter API v1.1. Rate limits reset every 15 minutes for most endpoints.',
      isInformational: true
    });
    
    // If no endpoints were found, add a helpful message
    if (result.length === 1) { // Only the informational card
      result[0].note = 'No rate limit data was returned for the monitored endpoints. This may be due to API access level restrictions or endpoint changes.';
    }
    
    return result;
  } catch (error: any) {
    console.error('Error formatting rate limit data:', error);
    throw new Error(`Failed to format rate limit data: ${error.message}`);
  }
}

// This function is no longer needed as we're using Twitter API v1.1 rate limits
// Keeping this comment as a placeholder in case we need to reimplement v2 support in the future

// Helper function to generate realistic mock data based on system state
function generateRealisticRateLimitData(): ApiUsageData[] {
  // Current time plus 24 hours for reset time (typical for Twitter API)
  const resetTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  
  // Define the endpoints we're interested in with realistic usage values
  // Since agents aren't running, usage should be low
  const mockData: ApiUsageData[] = [
    { 
      endpoint: 'POST /2/tweets',
      requestsMade: 0,
      quota: 200, // Basic tier: 100 requests / 24 hours PER USER, 1667 requests / 24 hours PER APP
      resetTime: resetTime,
      description: 'Tweet creation (overall project usage)',
      dailyUsage: [
        { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), usage: 0 },
        { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), usage: 0 },
        { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), usage: 0 },
        { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), usage: 0 },
        { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), usage: 0 },
        { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), usage: 0 },
        { date: new Date().toISOString(), usage: 0 }
      ]
    } as ApiUsageData,
    { 
      endpoint: 'Client App 12345678',
      requestsMade: 0,
      quota: 0,
      resetTime: resetTime,
      description: 'Usage for client app 12345678',
      dailyUsage: [
        { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), usage: 0 },
        { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), usage: 0 },
        { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), usage: 0 },
        { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), usage: 0 },
        { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), usage: 0 },
        { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), usage: 0 },
        { date: new Date().toISOString(), usage: 0 }
      ],
      isClientApp: true
    } as ApiUsageData
  ];
  
  // Add informational card
  mockData.push({
    endpoint: 'API Usage Information',
    requestsMade: 0,
    quota: 100,
    resetTime: resetTime,
    description: 'Twitter API Usage Information',
    note: 'This is mock data. Connect to the Twitter API to see real usage data. Twitter API v2 only provides overall project usage and client app usage data. Rate limits vary by endpoint and subscription tier.',
    isInformational: true
  } as ApiUsageData);
  
  return mockData;
}
