// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Client-side Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})

// Server-side Supabase client (for API routes)
export const createServerSupabaseClient = () => {
  return createClient<Database>(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Database types for TypeScript
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// User profile type
export interface UserProfile {
  id: number
  user_id: string
  email: string
  full_name?: string
  company_name?: string
  subscription_tier: 'free' | 'pro' | 'enterprise'
  api_usage_limit: number
  api_usage_current: number
  setup_completed: boolean
  onboarding_step: number
  created_at: string
  updated_at: string
}

// User API key type
export interface UserApiKey {
  id: number
  user_id: string
  service_name: string
  encrypted_key: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// User settings type
export interface UserSettings {
  id: number
  user_id: string
  timezone: string
  notification_email: boolean
  notification_browser: boolean
  auto_post_enabled: boolean
  max_daily_posts: number
  preferred_posting_times: string[]
  created_at: string
  updated_at: string
}

// Dashboard summary type
export interface DashboardSummary {
  user_id: string
  email: string
  full_name?: string
  subscription_tier: string
  api_usage_current: number
  api_usage_limit: number
  setup_completed: boolean
  total_tweets_cache: number
  unanalyzed_tweets: number
  total_blog_posts: number
  published_blogs: number
  total_potential_tweets: number
  scheduled_tweets: number
  total_x_accounts: number
  total_personas: number
  active_topics: number
}

// API usage log type
export interface ApiUsageLog {
  id: number
  user_id: string
  service_name: string
  endpoint?: string
  cost_cents: number
  tokens_used?: number
  response_time_ms?: number
  success: boolean
  error_message?: string
  created_at: string
}

// Auth helper functions
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

export const getCurrentSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) throw error
  return session
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  if (error) throw error
  return data
}

export const signUpWithEmail = async (email: string, password: string, metadata?: any) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      data: metadata
    }
  })
  if (error) throw error
  return data
}

export const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`
  })
  if (error) throw error
}

export const updatePassword = async (password: string) => {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

// Database helper functions
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') return null // No rows returned
    throw error
  }
  return data
}

export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const getUserSettings = async (userId: string): Promise<UserSettings | null> => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

export const updateUserSettings = async (userId: string, updates: Partial<UserSettings>) => {
  const { data, error } = await supabase
    .from('user_settings')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const getDashboardSummary = async (userId: string): Promise<DashboardSummary | null> => {
  const { data, error } = await supabase
    .from('user_dashboard_summary')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

export const getUserApiKeys = async (userId: string): Promise<UserApiKey[]> => {
  const { data, error } = await supabase
    .from('user_api_keys')
    .select('id, user_id, service_name, is_active, created_at, updated_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export const getApiUsageLogs = async (userId: string, limit: number = 50): Promise<ApiUsageLog[]> => {
  const { data, error } = await supabase
    .from('api_usage_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data || []
}

// Real-time subscriptions
export const subscribeToUserProfile = (userId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`user_profile_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_profiles',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe()
}

export const subscribeToApiUsage = (userId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`api_usage_${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'api_usage_logs',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe()
}

// Error handling utility
export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error)
  
  // Common error messages
  const errorMessages: { [key: string]: string } = {
    'Invalid login credentials': 'Invalid email or password',
    'Email not confirmed': 'Please check your email and click the confirmation link',
    'User already registered': 'An account with this email already exists',
    'Password should be at least 6 characters': 'Password must be at least 6 characters long'
  }
  
  return errorMessages[error.message] || error.message || 'An unexpected error occurred'
}
