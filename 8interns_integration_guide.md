# 8interns.com Authentication Integration Guide
## Coral Social Media - Phase 2 Integration for Your Server

This guide is specifically tailored for your 8interns.com setup using `.env` configuration.

## Current Setup ✅
- ✅ Domain: 8interns.com
- ✅ Environment: Using `.env` (not `.env.local`)
- ✅ Existing Supabase variables: `SUPABASE_URL` and `SUPABASE_KEY`
- ✅ Authentication secrets: `NEXTAUTH_SECRET` and `ENCRYPTION_KEY` already added

## Step 1: Add Authentication Environment Variables

Add the variables from `env_additions_safe.txt` to your existing `.env` file:

```bash
# On your server, add these lines to your .env file
cd /home/coraluser/Coral_Social_Media/Web_Interface

# Add the new authentication variables (keeping your existing ones)
cat >> .env << 'EOF'

# Authentication-specific Supabase variables (in addition to existing ones)
NEXT_PUBLIC_SUPABASE_URL=https://mmvxxgjfkzramonfnmox.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tdnh4Z2pma3pyYW1vbmZubW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NTIwNDMsImV4cCI6MjA2NzEyODA0M30.Ej6629210d-1132-4faa-a3ce-5f7bd455e1b
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tdnh4Z2pma3pyYW1vbmZubW94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTU1MjA0MywiZXhwIjoyMDY3MTI4MDQzfQ.ueoPFjHbFb1k2CPKrgY_CpCfKV-M0GmDO--slG9qLDw

# App Configuration for Authentication
NEXT_PUBLIC_APP_URL=https://8interns.com
EOF
```

## Step 2: Create Authentication Files

**File 1: types/database.ts**
```bash
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
EOF
```

**File 2: lib/supabase.ts**
```bash
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
    'Password should be at least 6 characters': 'Password must be at least 6 characters long'
  }
  
  return errorMessages[error.message] || error.message || 'An unexpected error occurred'
}
EOF
```

**File 3: contexts/AuthContext.tsx**
```bash
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
```

**File 4: app/auth/login/page.tsx**
```bash
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
```

**File 5: app/auth/signup/page.tsx**
```bash
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
```

**File 6: app/auth/callback/page.tsx**
```bash
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
```

**File 7: middleware.ts (in root directory)**
```bash
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
EOF
```

## Step 3: Update Your Layout (Backup First!)

```bash
# Backup your original layout
cp app/layout.tsx app/layout.tsx.backup

# Create new layout with authentication
cat > app/layout.tsx << 'EOF'
"use client"

import { AuthProvider } from "@/contexts/AuthContext"
import { ThemeProvider } from "@/components/theme-provider"
import { TopNav } from "@/components/top-nav"
import { SideNav } from "@/components/side-nav"
import "./globals.css"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background" suppressHydrationWarning>
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <div className="flex min-h-screen flex-col">
              <TopNav />
              <div className="container flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
                <SideNav />
                <main className="flex w-full flex-col overflow-hidden pt-4 md:pt-8">
                  {children}
                </main>
              </div>
            </div>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
EOF
```

## Step 4: Test Supabase Connection

```bash
# Test your Supabase connection
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
"
```

## Step 5: Build and Deploy

```bash
# Build the application
npm run build

# If build is successful, restart PM2
pm2 restart coral-web

# Check logs
pm2 logs coral-web

# Monitor the application
pm2 monit
```

## Step 6: Configure Supabase Auth Settings

1. Go to your Supabase project dashboard
2. Navigate to Authentication > Settings
3. Set Site URL to: `https://8interns.com`
4. Add redirect URLs:
   - `https://8interns.com/auth/callback`
   - `https://8interns.com/auth/confirm`

## Testing the Integration

1. Visit `https://8interns.com` - should redirect to login
2. Try to register a new account
3. Check email for confirmation
4. Login and verify access to your existing dashboard

## Troubleshooting

**If build fails:**
```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

**If authentication doesn't work:**
```bash
# Check environment variables
grep -E "(NEXT_PUBLIC_|NEXTAUTH_|ENCRYPTION_)" .env

# Check PM2 logs
pm2 logs coral-web --lines 50
```

**If existing features break:**
```bash
# Restore original layout if needed
cp app/layout.tsx.backup app/layout.tsx
pm2 restart coral-web
```

Your 8interns.com dashboard is now ready for multi-tenant authentication! 🚀
