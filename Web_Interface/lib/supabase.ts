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
    return null
  }

  if (supabaseInstance) return supabaseInstance

  try {
    // Try to get environment variables from different sources
    // 1. First try Next.js environment variables (for local development)
    let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    let supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // 2. If not found, try to get from API (which reads from root .env file)
    if (!supabaseUrl || !supabaseKey) {
      const envVars = await fetchEnvVars()
      supabaseUrl = envVars.SUPABASE_URL
      supabaseKey = envVars.SUPABASE_KEY
    }

    // Check if environment variables are set
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase URL or Key is missing. Please check your environment variables.')
      return null
    }

    // Create Supabase client
    supabaseInstance = createClient(supabaseUrl, supabaseKey)
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
