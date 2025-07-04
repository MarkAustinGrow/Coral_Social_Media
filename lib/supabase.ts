import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  if (error) throw error
  return data
}

export const signUpWithEmail = async (email: string, password: string) => {
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
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error) throw error
  return data
}

export const getDashboardSummary = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_dashboard_summary')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error) throw error
  return data
}

export const getApiUsageLogs = async (userId: string, limit: number = 10) => {
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
