#!/bin/bash

# Complete Authentication Deployment Script for 8interns.com
# This script copies all authentication files to the correct locations and builds the app

set -e  # Exit on any error

echo "🚀 Starting Complete Authentication Deployment for 8interns.com..."

# Navigate to your project directory
cd /home/coraluser/Coral_Social_Media/Web_Interface

echo "📁 Current directory: $(pwd)"

# Create necessary directories
echo "📂 Creating directory structure..."
mkdir -p types lib contexts app/auth/login app/auth/signup app/auth/callback app/api/user/profile

# Copy types/database.ts
echo "📄 Creating types/database.ts..."
cat > types/database.ts << 'EOF'
export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: number
          user_id: string
          email: string
          full_name: string | null
          company_name: string | null
          subscription_tier: string
          api_usage_limit: number
          api_usage_current: number
          setup_completed: boolean
          onboarding_step: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          email: string
          full_name?: string | null
          company_name?: string | null
          subscription_tier?: string
          api_usage_limit?: number
          api_usage_current?: number
          setup_completed?: boolean
          onboarding_step?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          email?: string
          full_name?: string | null
          company_name?: string | null
          subscription_tier?: string
          api_usage_limit?: number
          api_usage_current?: number
          setup_completed?: boolean
          onboarding_step?: number
          created_at?: string
          updated_at?: string
        }
      }
      user_api_keys: {
        Row: {
          id: number
          user_id: string
          service_name: string
          encrypted_key: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          service_name: string
          encrypted_key: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          service_name?: string
          encrypted_key?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_settings: {
        Row: {
          id: number
          user_id: string
          timezone: string
          email_notifications: boolean
          theme_preference: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          timezone?: string
          email_notifications?: boolean
          theme_preference?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          timezone?: string
          email_notifications?: boolean
          theme_preference?: string
          created_at?: string
          updated_at?: string
        }
      }
      api_usage_logs: {
        Row: {
          id: number
          user_id: string
          service_name: string
          endpoint: string | null
          cost_cents: number
          success: boolean
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          service_name: string
          endpoint?: string | null
          cost_cents: number
          success?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          service_name?: string
          endpoint?: string | null
          cost_cents?: number
          success?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      user_dashboard_summary: {
        Row: {
          user_id: string
          email: string
          full_name: string | null
          subscription_tier: string
          api_usage_current: number
          api_usage_limit: number
          setup_completed: boolean
          total_tweets_cache: number | null
          total_blog_posts: number | null
          total_x_accounts: number | null
        }
      }
    }
    Functions: {
      handle_new_user: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      subscription_tier: 'free' | 'pro' | 'enterprise'
    }
  }
}

export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type UserApiKey = Database['public']['Tables']['user_api_keys']['Row']
export type UserSettings = Database['public']['Tables']['user_settings']['Row']
export type ApiUsageLog = Database['public']['Tables']['api_usage_logs']['Row']
export type DashboardSummary = Database['public']['Views']['user_dashboard_summary']['Row']
EOF

# Copy lib/supabase.ts
echo "📄 Creating lib/supabase.ts..."
cat > lib/supabase.ts << 'EOF'
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
EOF

# Copy contexts/AuthContext.tsx
echo "📄 Creating contexts/AuthContext.tsx..."
cat > contexts/AuthContext.tsx << 'EOF'
'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, handleSupabaseError } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)
      } catch (error) {
        console.error('Error getting session:', error)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } catch (error: any) {
      setLoading(false)
      throw new Error(handleSupabaseError(error))
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
        }
      })
      if (error) throw error
    } catch (error: any) {
      setLoading(false)
      throw new Error(handleSupabaseError(error))
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error: any) {
      setLoading(false)
      throw new Error(handleSupabaseError(error))
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
EOF

# Copy middleware.ts
echo "📄 Creating middleware.ts..."
cat > middleware.ts << 'EOF'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const { pathname } = req.nextUrl

    // Public routes that don't require authentication
    const publicRoutes = ['/auth/login', '/auth/signup', '/auth/callback']
    
    const isPublicRoute = publicRoutes.includes(pathname)

    // If it's a public route, allow access
    if (isPublicRoute) {
      return res
    }

    // For all other routes, check authentication
    if (!session) {
      const redirectUrl = new URL('/auth/login', req.url)
      return NextResponse.redirect(redirectUrl)
    }

    return res
  } catch (error) {
    console.error('Middleware error:', error)
    // On error, redirect to login
    const redirectUrl = new URL('/auth/login', req.url)
    return NextResponse.redirect(redirectUrl)
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
EOF

# Copy app/auth/login/page.tsx
echo "📄 Creating app/auth/login/page.tsx..."
cat > app/auth/login/page.tsx << 'EOF'
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { signIn } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(email, password)
      router.push('/')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sign In to 8interns</CardTitle>
          <CardDescription>
            Enter your credentials to access your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="your@email.com"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="Enter your password"
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          
          <div className="mt-4 text-center text-sm">
            Don't have an account?{' '}
            <Link href="/auth/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
EOF

# Copy app/auth/signup/page.tsx
echo "📄 Creating app/auth/signup/page.tsx..."
cat > app/auth/signup/page.tsx << 'EOF'
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  const { signUp } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signUp(email, password)
      setSuccess(true)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Check Your Email</CardTitle>
            <CardDescription>
              We've sent you a confirmation link. Please check your email and click the link to activate your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/auth/login">Back to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Join 8interns</CardTitle>
          <CardDescription>
            Create your account to access the social media dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="your@email.com"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password (minimum 6 characters)
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
                placeholder="Create a secure password"
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
          
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
EOF

# Copy app/auth/callback/page.tsx
echo "📄 Creating app/auth/callback/page.tsx..."
cat > app/auth/callback/page.tsx << 'EOF'
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          router.push('/auth/login?error=callback_error')
          return
        }

        if (data.session) {
          router.push('/')
        } else {
          router.push('/auth/login')
        }
      } catch (error) {
        console.error('Unexpected error:', error)
        router.push('/auth/login')
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
    </div>
  )
}
EOF

# Copy app/api/user/profile/route.ts
echo "📄 Creating app/api/user/profile/route.ts..."
cat > app/api/user/profile/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Get the current user
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Get the current user
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { full_name, company_name, timezone } = body

    // Update user profile
    const { data: profile, error: updateError } = await supabase
      .from('user_profiles')
      .update({
        full_name,
        company_name,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', session.user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    // Update user settings if timezone is provided
    if (timezone) {
      const { error: settingsError } = await supabase
        .from('user_settings')
        .update({
          timezone,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', session.user.id)

      if (settingsError) {
        console.error('Error updating settings:', settingsError)
        // Don't fail the request for settings error
      }
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
EOF

echo "✅ All authentication files created successfully!"

# Test Supabase connection
echo "🔍 Testing Supabase connection..."
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
console.log('Testing Supabase connection...');
supabase.from('user_profiles').select('count').then(result => {
  console.log('✅ Supabase connection successful:', result);
}).catch(error => {
  console.log('❌ Supabase connection error:', error.message);
});
" || echo "⚠️  Supabase test failed - check environment variables"

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
    echo "🎉 DEPLOYMENT COMPLETE!"
    echo ""
    echo "🌐 Your 8interns.com dashboard now has authentication!"
    echo ""
    echo "Next steps:"
    echo "1. Visit https://8interns.com - should redirect to login"
    echo "2. Try creating a new account at https://8interns.com/auth/signup"
    echo "3. Check email for confirmation link"
    echo "4. Login and access your existing dashboard"
    echo ""
    echo "🔧 Configure Supabase Auth Settings:"
    echo "1. Go to your Supabase project dashboard"
    echo "2. Navigate to Authentication > Settings"
    echo "3. Set Site URL to: https://8interns.com"
    echo "4. Add redirect URLs:"
    echo "   - https://8interns.com/auth/callback"
    echo "   - https://8interns.com/auth/confirm"
    echo ""
    
else
    echo "❌ Build failed! Check the errors above."
    echo "📝 Showing recent logs..."
    pm2 logs coral-web --lines 20
    exit 1
fi
EOF

chmod +x complete_deployment_script.sh

echo "🎯 Deployment script created successfully!"
echo ""
echo "To deploy the authentication system, run this command on your server:"
echo ""
echo "bash complete_deployment_script.sh"
echo ""
echo "This script will:"
echo "✅ Create all authentication files in the correct locations"
echo "✅ Test Supabase connection"
echo "✅ Build the application"
echo "✅ Restart PM2"
echo "✅ Show deployment status"
