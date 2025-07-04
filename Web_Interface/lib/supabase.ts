import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Runtime validation (only in browser/server runtime, not during build)
const validateSupabaseConfig = () => {
  if (typeof window === 'undefined' && typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    // Skip validation during build process
    return
  }

  if (!supabaseUrl) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not defined')
    console.error('Current value:', supabaseUrl)
    if (typeof process !== 'undefined') {
      console.error('Available env vars:', Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC')))
    }
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
  }

  if (!supabaseAnonKey) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined')
    console.error('Current value:', supabaseAnonKey)
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
  }

  console.log('✅ Supabase environment variables loaded successfully')
  console.log('URL:', supabaseUrl.substring(0, 30) + '...')
  console.log('Key length:', supabaseAnonKey.length)
}

// Create the Supabase client with fallback for build time
let supabase: any

if (supabaseUrl && supabaseAnonKey) {
  validateSupabaseConfig()
  supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  })
} else {
  // Build-time fallback - will be replaced at runtime
  console.warn('⚠️ Supabase client created with placeholder values for build process')
  supabase = createClient<Database>(
    'https://placeholder.supabase.co',
    'placeholder-key',
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    }
  )
  
  // Override methods to validate at runtime
  const originalSignUp = supabase.auth.signUp
  supabase.auth.signUp = (...args: any[]) => {
    validateSupabaseConfig()
    return originalSignUp.apply(supabase.auth, args)
  }
  
  const originalSignInWithPassword = supabase.auth.signInWithPassword
  supabase.auth.signInWithPassword = (...args: any[]) => {
    validateSupabaseConfig()
    return originalSignInWithPassword.apply(supabase.auth, args)
  }
}

export { supabase }

// Backward compatibility for existing code
export const getSupabaseClient = () => supabase

// Legacy exports for existing code
export default supabase

export const getCurrentUser = async () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

export const signInWithEmail = async (email: string, password: string) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase not configured')
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  if (error) throw error
  return data
}

export const signUpWithEmail = async (email: string, password: string) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase not configured')
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
    }
  })
  if (error) throw error
  return data
}

export const signOut = async () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return
  }
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error)
  
  const errorMessages: { [key: string]: string } = {
    'Invalid login credentials': 'Invalid email or password',
    'Email not confirmed': 'Please check your email and click the confirmation link',
    'User already registered': 'An account with this email already exists',
    'Password should be at least 6 characters': 'Password must be at least 6 characters long',
    'Signup requires a valid password': 'Password must be at least 6 characters long',
    'Unable to validate email address: invalid format': 'Please enter a valid email address'
  }
  
  return errorMessages[error.message] || error.message || 'An unexpected error occurred'
}

// Helper functions for user data
export const getUserProfile = async (userId: string) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error) throw error
  return data
}

export const getDashboardSummary = async (userId: string) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }
  const { data, error } = await supabase
    .from('user_dashboard_summary')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error) throw error
  return data
}

export const getApiUsageLogs = async (userId: string, limit: number = 10) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return []
  }
  const { data, error } = await supabase
    .from('api_usage_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data
}

export const updateUserProfile = async (userId: string, updates: Partial<Database['public']['Tables']['user_profiles']['Update']>) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase not configured')
  }
  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}
