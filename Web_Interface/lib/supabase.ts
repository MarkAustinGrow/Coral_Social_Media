import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'

// Environment validation for debugging
const validateSupabaseConfig = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not defined')
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
  }

  if (!supabaseAnonKey) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined')
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
  }

  console.log('✅ Supabase environment variables loaded successfully')
  console.log('URL:', supabaseUrl.substring(0, 30) + '...')
  console.log('Key length:', supabaseAnonKey.length)
}

// Validate config on import
if (typeof window !== 'undefined') {
  validateSupabaseConfig()
}

// Create a single client instance using the middleware-compatible approach
const getSupabaseClient = () => createClientComponentClient<Database>()

// Export the client getter for backward compatibility
export { getSupabaseClient }

// Export a default client instance for backward compatibility
export const supabase = getSupabaseClient()

// Default export for existing imports
export default supabase

export const handleSupabaseError = (error: any) => {
  console.error('Supabase error details:', {
    message: error.message,
    status: error.status,
    statusCode: error.statusCode,
    code: error.code,
    details: error.details,
    hint: error.hint,
    fullError: error
  })
  
  const errorMessages: { [key: string]: string } = {
    'Invalid login credentials': 'Invalid email or password. Please check your credentials and try again.',
    'Email not confirmed': 'Please check your email and click the confirmation link before signing in.',
    'User already registered': 'An account with this email already exists',
    'Password should be at least 6 characters': 'Password must be at least 6 characters long',
    'Signup requires a valid password': 'Password must be at least 6 characters long',
    'Unable to validate email address: invalid format': 'Please enter a valid email address',
    'Email link is invalid or has expired': 'The confirmation link has expired. Please request a new one.',
    'User not found': 'No account found with this email address',
    'Too many requests': 'Too many login attempts. Please wait a moment and try again.',
    'Signups not allowed for this instance': 'Account creation is currently disabled',
    'Email rate limit exceeded': 'Too many emails sent. Please wait before requesting another.',
    'Invalid email or password': 'Invalid email or password. Please check your credentials and try again.'
  }
  
  // Check for specific error patterns
  const errorMessage = error.message || ''
  
  // Handle email confirmation errors
  if (errorMessage.includes('email') && errorMessage.includes('confirm')) {
    return 'Please check your email and click the confirmation link before signing in.'
  }
  
  // Handle authentication errors
  if (errorMessage.includes('Invalid') && (errorMessage.includes('login') || errorMessage.includes('credentials'))) {
    return 'Invalid email or password. Please check your credentials and try again.'
  }
  
  // Handle email not confirmed errors
  if (errorMessage.includes('Email not confirmed') || errorMessage.includes('not confirmed')) {
    return 'Please check your email and click the confirmation link before signing in.'
  }
  
  return errorMessages[errorMessage] || errorMessage || 'An unexpected error occurred. Please try again.'
}

// Helper functions for user data can be implemented using createClientComponentClient
// when needed in specific components to avoid multiple client instances
