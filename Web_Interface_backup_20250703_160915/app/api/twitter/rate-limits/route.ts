import { NextRequest, NextResponse } from 'next/server'
import { loadEnvFromRoot } from '@/lib/env-loader'

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
    // Get environment variables
    const envVars = loadEnvFromRoot()
    console.log('Loaded environment variables:', Object.keys(envVars))
    
    // Check if Twitter API credentials are configured
    if (!envVars.TWITTER_BEARER_TOKEN) {
      console.log('Twitter API credentials not found in environment variables')
      
      // Generate mock data
      const mockData = generateRealisticRateLimitData()
      
      return NextResponse.json({
        success: true,
        data: mockData,
        isMock: true,
        message: "Twitter API credentials not found in .env file. Using mock data."
      })
    }
    
    console.log('Found Twitter API credentials, attempting to connect to Twitter API')
    
    try {
      // Get real Twitter usage data
      const usageData = await getTwitterUsageData(envVars.TWITTER_BEARER_TOKEN)
      console.log('Successfully retrieved Twitter usage data')
      
      // Format the data for our frontend
      const formattedData = formatTwitterUsageData(usageData)
      
      return NextResponse.json({
        success: true,
        data: formattedData,
        isMock: false,
        message: "Using real Twitter API usage data"
      })
    } catch (twitterError: any) {
      console.error('Error connecting to Twitter API:', twitterError)
      
      // Generate mock data as fallback
      const mockData = generateRealisticRateLimitData()
      
      return NextResponse.json({
        success: true,
        data: mockData,
        isMock: true,
        message: `Error connecting to Twitter API: ${twitterError.message}. Using mock data.`,
        debug: { error: twitterError.message, stack: twitterError.stack }
      })
    }
  } catch (error: any) {
    console.error('Error in Twitter rate limits API:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch Twitter rate limits',
        debug: { stack: error.stack }
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
