import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase'
import { getUserTwitterCredentials } from '@/lib/twitter-credentials'

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

// Endpoints we're interested in monitoring
const MONITORED_ENDPOINTS = [
  { 
    path: '/2/tweets/search/recent', 
    method: 'GET',
    description: 'Search for recent tweets'
  },
  { 
    path: '/2/tweets', 
    method: 'POST',
    description: 'Create tweets'
  },
  { 
    path: '/2/users/by/username', 
    method: 'GET',
    description: 'Get user information'
  },
  { 
    path: '/2/tweets/:id', 
    method: 'GET',
    description: 'Get tweet details'
  },
  { 
    path: '/2/users/:id/tweets', 
    method: 'GET',
    description: 'Get user tweets'
  },
  { 
    path: '/2/tweets/:id/retweets', 
    method: 'POST',
    description: 'Retweet functionality'
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
    
    console.log('Found user Twitter credentials, but Twitter API v2 usage endpoint requires Bearer token')
    
    // Return error explaining the limitation instead of mock data
    return NextResponse.json(
      { 
        success: false, 
        error: 'Twitter API usage data unavailable',
        details: 'Twitter API v2 usage endpoint requires Bearer token access, but user credentials are OAuth 1.0a format. Real-time usage data is not available with current credential format.',
        debug: { 
          userId: session.user.id,
          hasCredentials: true,
          credentialType: 'OAuth 1.0a',
          requiredType: 'Bearer Token (OAuth 2.0)',
          limitation: 'Twitter API v2 /usage endpoint only accepts Bearer tokens'
        }
      },
      { status: 501 }
    )
    
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

// Function to get Twitter usage data from the API
async function getTwitterUsageData(bearerToken: string) {
  // Request all available usage fields for the last 7 days
  const url = 'https://api.twitter.com/2/usage/tweets?usage.fields=cap_reset_day,daily_client_app_usage,daily_project_usage,project_cap,project_id,project_usage&days=7';
  
  console.log('Fetching Twitter usage data from:', url);
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${bearerToken}`
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Twitter API error:', errorText);
    throw new Error(`Twitter API returned ${response.status}: ${errorText}`);
  }
  
  const data = await response.json();
  console.log('Twitter API response:', JSON.stringify(data, null, 2));
  
  return data;
}

// Function to format Twitter usage data for our frontend
function formatTwitterUsageData(usageData: any) {
  const result = [];
  
  try {
    // Extract the data from the response
    const { 
      cap_reset_day, 
      project_cap, 
      project_usage, 
      daily_project_usage, 
      daily_client_app_usage 
    } = usageData.data;
    
    // Calculate days until cap reset
    const today = new Date().getDate();
    const daysUntilReset = (cap_reset_day - today + 30) % 30; // Handle month boundaries
    const resetDate = new Date();
    resetDate.setDate(resetDate.getDate() + daysUntilReset);
    
    // Calculate hours and minutes until reset
    const hoursUntilReset = daysUntilReset * 24;
    
    // Add overall project usage
    result.push({
      endpoint: 'POST /2/tweets',
      requestsMade: project_usage || 0,
      quota: project_cap || 1000, // Default to 1000 if not provided
      resetTime: resetDate.toISOString(),
      description: 'Tweet creation (overall project usage)',
      dailyUsage: daily_project_usage?.usage || []
    });
    
    // Add client app usage if available
    if (daily_client_app_usage && daily_client_app_usage.length > 0) {
      for (const clientApp of daily_client_app_usage) {
        const clientId = clientApp.client_app_id;
        
        // Calculate the total usage by summing all daily usage values
        const totalUsage = clientApp.usage ? 
          clientApp.usage.reduce((sum: number, day: { date: string, usage: string }) => 
            sum + parseInt(day.usage || '0'), 0) : 0;
        
        result.push({
          endpoint: `Client App ${clientId}`,
          requestsMade: totalUsage,
          quota: 0, // No specific quota for client apps, just show the usage
          resetTime: resetDate.toISOString(),
          description: `Usage for client app ${clientId}`,
          dailyUsage: clientApp.usage || [],
          isClientApp: true // Mark as client app for special handling in UI
        });
      }
    }
    
    // Add a note about endpoint-specific data
    result.push({
      endpoint: 'API Usage Information',
      requestsMade: 0,
      quota: 100,
      resetTime: resetDate.toISOString(),
      description: 'Twitter API Usage Information',
      note: 'Twitter API v2 only provides overall project usage and client app usage data. Endpoint-specific usage data is not available through the API. Rate limits vary by endpoint and subscription tier.',
      isInformational: true
    });
    
    return result;
  } catch (error) {
    console.error('Error formatting Twitter usage data:', error);
    // Return mock data if we can't format the real data
    return generateRealisticRateLimitData();
  }
}

// Helper function to get default quota for each endpoint
function getDefaultQuotaForEndpoint(path: string): number {
  switch (path) {
    case '/2/tweets/search/recent':
      return 1000
    case '/2/tweets':
      return 50
    case '/2/users/by/username':
      return 300
    case '/2/tweets/:id':
      return 3000
    case '/2/users/:id/tweets':
      return 200
    case '/2/tweets/:id/retweets':
      return 25
    default:
      return 100
  }
}

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
