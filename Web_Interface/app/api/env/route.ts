import { NextRequest, NextResponse } from 'next/server'
import { loadEnvFromRoot } from '@/lib/env-loader'

export async function GET(request: NextRequest) {
  try {
    // Load environment variables from root .env file
    const envVars = loadEnvFromRoot()
    
    // Extract only the Supabase-related variables for security
    const safeEnvVars = {
      SUPABASE_URL: envVars.SUPABASE_URL || '',
      SUPABASE_KEY: envVars.SUPABASE_KEY || '',
    }
    
    // Return the environment variables as JSON
    return NextResponse.json(safeEnvVars)
  } catch (error) {
    console.error('Error loading environment variables:', error)
    return NextResponse.json(
      { error: 'Failed to load environment variables' },
      { status: 500 }
    )
  }
}
