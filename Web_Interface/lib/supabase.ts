import { createClient } from '@supabase/supabase-js'
import { getRootEnv } from './env-loader'

// This is a singleton pattern to ensure we only create one Supabase client
let supabaseInstance: ReturnType<typeof createClient> | null = null

// Cache for environment variables fetched from API
let envCache: { SUPABASE_URL?: string; SUPABASE_KEY?: string } | null = null

export type SupabaseError = {
  message: string
  details?: string
  hint?: string
  code?: string
}

export type DataState<T> = {
  data: T | null
  isLoading: boolean
  error: SupabaseError | null
}

/**
 * Fetch environment variables from the API
 */
async function fetchEnvVars(): Promise<{ SUPABASE_URL?: string; SUPABASE_KEY?: string }> {
  try {
    // If we already have cached values, return them
    if (envCache) {
      return envCache
    }

    // Fetch environment variables from API
    const response = await fetch('/api/env')
    
    if (!response.ok) {
      throw new Error(`Failed to fetch environment variables: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Cache the result
    envCache = {
      SUPABASE_URL: data.SUPABASE_URL,
      SUPABASE_KEY: data.SUPABASE_KEY
    }
    
    return envCache
  } catch (error) {
    console.error('Error fetching environment variables:', error)
    return {}
  }
}

export async function getSupabaseClient() {
  // Only run on client side
  if (typeof window === 'undefined') {
    console.log('Running on server side, using direct environment variables')
    try {
      // On server side, we can access process.env directly
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      console.log('Server-side Supabase URL available:', !!supabaseUrl)
      console.log('Server-side Supabase Key available:', !!supabaseKey)
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('Server-side: Supabase URL or Key is missing')
        return null
      }
      
      // Create Supabase client for server-side
      const serverSideClient = createClient(supabaseUrl, supabaseKey)
      console.log('Server-side Supabase client created successfully')
      return serverSideClient
    } catch (error) {
      console.error('Server-side: Failed to create Supabase client:', error)
      return null
    }
  }

  // Client-side execution
  console.log('Running on client side')
  if (supabaseInstance) {
    console.log('Returning existing Supabase instance')
    return supabaseInstance
  }

  try {
    console.log('Creating new Supabase client')
    // Try to get environment variables from different sources
    // 1. First try Next.js environment variables (for local development)
    let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    let supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    console.log('Client-side env vars available:', {
      urlAvailable: !!supabaseUrl,
      keyAvailable: !!supabaseKey
    })

    // 2. If not found, try to get from API (which reads from root .env file)
    if (!supabaseUrl || !supabaseKey) {
      console.log('Fetching env vars from API')
      const envVars = await fetchEnvVars()
      supabaseUrl = envVars.SUPABASE_URL
      supabaseKey = envVars.SUPABASE_KEY
      console.log('API env vars available:', {
        urlAvailable: !!supabaseUrl,
        keyAvailable: !!supabaseKey
      })
    }

    // Check if environment variables are set
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase URL or Key is missing. Please check your environment variables.')
      return null
    }

    // Create Supabase client
    console.log('Creating Supabase client with URL:', supabaseUrl.substring(0, 15) + '...')
    supabaseInstance = createClient(supabaseUrl, supabaseKey)
    console.log('Supabase client created successfully')
    return supabaseInstance
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    return null
  }
}

// Helper function to handle Supabase errors
export function handleSupabaseError(error: any): SupabaseError {
  console.error('Supabase error:', error)
  
  return {
    message: error.message || 'An unknown error occurred',
    details: error.details || undefined,
    hint: error.hint || undefined,
    code: error.code || undefined
  }
}
