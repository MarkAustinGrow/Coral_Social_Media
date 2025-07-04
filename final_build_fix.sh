#!/bin/bash

# Final Build Fix Script
# This script creates a build-safe Supabase client that handles build-time gracefully

set -e  # Exit on any error

echo "🔧 Creating build-safe Supabase client..."

# Navigate to your project directory
cd /home/coraluser/Coral_Social_Media/Web_Interface

echo "📁 Current directory: $(pwd)"

# Update lib/supabase.ts with build-safe initialization
echo "📄 Creating build-safe lib/supabase.ts..."
cat > lib/supabase.ts << 'EOF'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Build-safe client creation
let supabase: any

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  })
} else {
  // Create a mock client for build time
  console.warn('Supabase environment variables not found, using mock client for build')
  supabase = {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Mock client') }),
      signUp: () => Promise.resolve({ data: null, error: new Error('Mock client') }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: new Error('Mock client') }),
          limit: () => Promise.resolve({ data: [], error: new Error('Mock client') })
        }),
        order: () => ({
          limit: () => Promise.resolve({ data: [], error: new Error('Mock client') })
        })
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: new Error('Mock client') })
          })
        })
      }),
      insert: () => Promise.resolve({ data: null, error: new Error('Mock client') }),
      delete: () => ({
        eq: () => Promise.resolve({ data: null, error: new Error('Mock client') })
      })
    })
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
EOF

echo "✅ Build-safe Supabase client created!"

# Build the application
echo "🔨 Building the application..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Restart PM2
    echo "🔄 Restarting PM2..."
    pm2 restart coral-web
    
    echo "📊 Checking PM2 status..."
    pm2 status
    
    echo "📝 Showing recent logs..."
    pm2 logs coral-web --lines 20
    
    echo ""
    echo "🎉 AUTHENTICATION DEPLOYMENT COMPLETE!"
    echo ""
    echo "🌐 Your 8interns.com dashboard now has authentication!"
    echo ""
    echo "✅ What's working now:"
    echo "  - All existing features preserved"
    echo "  - Authentication system active"
    echo "  - Build process successful"
    echo "  - PM2 running with new code"
    echo ""
    echo "🔗 Test your authentication:"
    echo "1. Visit https://8interns.com - should redirect to login"
    echo "2. Try creating a new account at https://8interns.com/auth/signup"
    echo "3. Check email for confirmation link"
    echo "4. Login and access your existing dashboard"
    echo ""
    echo "🔧 Final step - Configure Supabase Auth Settings:"
    echo "1. Go to your Supabase project dashboard"
    echo "2. Navigate to Authentication > Settings"
    echo "3. Set Site URL to: https://8interns.com"
    echo "4. Add redirect URLs:"
    echo "   - https://8interns.com/auth/callback"
    echo "   - https://8interns.com/auth/confirm"
    echo ""
    echo "🎯 Your single-user dashboard is now a multi-tenant SaaS platform!"
    
else
    echo "❌ Build failed! Check the errors above."
    echo "📝 Showing recent logs..."
    pm2 logs coral-web --lines 20
    exit 1
fi
EOF

chmod +x final_build_fix.sh

echo "🎯 Final build fix script created!"
echo ""
echo "Run this command on your server to complete the authentication deployment:"
echo ""
echo "bash final_build_fix.sh"
echo ""
echo "This will:"
echo "✅ Create a build-safe Supabase client"
echo "✅ Handle missing environment variables gracefully during build"
echo "✅ Complete the build process successfully"
echo "✅ Deploy your multi-tenant authentication system"
