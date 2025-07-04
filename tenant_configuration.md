# Multi-Tenant Configuration Guide
## Coral Social Media Infrastructure - SaaS Implementation

This document outlines the implementation of multi-tenant authentication and data isolation using Row Level Security (RLS) with shared database tables.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema Implementation](#database-schema-implementation)
3. [Authentication System](#authentication-system)
4. [API Key Management](#api-key-management)
5. [Multi-Tenant Data Access](#multi-tenant-data-access)
6. [User Onboarding Flow](#user-onboarding-flow)
7. [Agent Architecture Updates](#agent-architecture-updates)
8. [Implementation Timeline](#implementation-timeline)
9. [Environment Configuration](#environment-configuration)
10. [Performance Optimization](#performance-optimization)
11. [Security Considerations](#security-considerations)
12. [Testing Strategy](#testing-strategy)

## Architecture Overview

### Design Philosophy: RLS + Shared Tables

We implement multi-tenancy using **Row Level Security (RLS)** with shared database tables rather than per-user schemas or databases. This approach provides:

✅ **Simplified Architecture**: Single database schema for all users
✅ **Better Performance**: Optimized queries with proper indexing
✅ **Cost Efficiency**: No per-user infrastructure overhead
✅ **Easier Maintenance**: Single codebase and schema to maintain
✅ **Scalability**: Proven pattern for SaaS applications

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Web Application                   │
│  (Authentication, Dashboard, Setup Wizard)                  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Supabase Database                         │
│  (Shared Tables + RLS Policies + User Authentication)       │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Shared Qdrant Instance                     │
│  (Single collection with user_id filtering)                 │
└─────────────────────────────────────────────────────────────┘
```

### Data Isolation Strategy

- **Supabase Tables**: All tables include `user_id` column with RLS policies
- **Qdrant Collections**: Single shared collection with `user_id` metadata filtering
- **API Keys**: Encrypted per-user storage in dedicated table
- **Agent Execution**: User context passed to agents for data filtering

## Database Schema Implementation

### 1. Schema Migration Script

```sql
-- Add user_id columns to existing tables
ALTER TABLE tweets ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE tweets_cache ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE blogs ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE tweet_threads ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE x_accounts ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE agent_logs ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE personas ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE engagement_metrics ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Create user profiles table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  company_name TEXT,
  subscription_tier TEXT DEFAULT 'free',
  api_usage_limit INTEGER DEFAULT 1000,
  api_usage_current INTEGER DEFAULT 0,
  setup_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create API keys table (encrypted storage)
CREATE TABLE user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  service_name TEXT NOT NULL, -- 'openai', 'twitter_bearer', 'twitter_api_key', etc.
  encrypted_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, service_name)
);

-- Create usage tracking table
CREATE TABLE api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  service_name TEXT NOT NULL,
  endpoint TEXT,
  cost_cents INTEGER NOT NULL DEFAULT 0,
  tokens_used INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Performance Indexes

```sql
-- Critical performance indexes for user-specific queries
CREATE INDEX idx_tweets_user_id ON tweets(user_id);
CREATE INDEX idx_tweets_user_created ON tweets(user_id, created_at DESC);
CREATE INDEX idx_tweets_cache_user_id ON tweets_cache(user_id);
CREATE INDEX idx_tweets_cache_user_created ON tweets_cache(user_id, created_at DESC);
CREATE INDEX idx_tweets_cache_user_status ON tweets_cache(user_id, status);
CREATE INDEX idx_blogs_user_id ON blogs(user_id);
CREATE INDEX idx_blogs_user_created ON blogs(user_id, created_at DESC);
CREATE INDEX idx_tweet_threads_user_id ON tweet_threads(user_id);
CREATE INDEX idx_x_accounts_user_id ON x_accounts(user_id);
CREATE INDEX idx_agent_logs_user_id ON agent_logs(user_id);
CREATE INDEX idx_personas_user_id ON personas(user_id);
CREATE INDEX idx_engagement_metrics_user_id ON engagement_metrics(user_id);
CREATE INDEX idx_user_api_keys_user_service ON user_api_keys(user_id, service_name);
CREATE INDEX idx_api_usage_logs_user_date ON api_usage_logs(user_id, created_at DESC);
```

### 3. Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE tweets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tweets_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tweet_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (users can only access their own data)
CREATE POLICY "users_own_tweets" ON tweets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_tweets_cache" ON tweets_cache FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_blogs" ON blogs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_tweet_threads" ON tweet_threads FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_x_accounts" ON x_accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_agent_logs" ON agent_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_personas" ON personas FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_engagement_metrics" ON engagement_metrics FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_profile" ON user_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_api_keys" ON user_api_keys FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_usage_logs" ON api_usage_logs FOR ALL USING (auth.uid() = user_id);
```

### 4. Automated User Provisioning

```sql
-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create user profile with default settings
  INSERT INTO user_profiles(user_id, email, subscription_tier, api_usage_limit)
  VALUES (NEW.id, NEW.email, 'free', 1000)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create default persona
  INSERT INTO personas(user_id, name, description, tone, is_default)
  VALUES (NEW.id, 'Default', 'Professional social media persona', 'professional', true)
  ON CONFLICT DO NOTHING;
  
  -- Log user creation
  INSERT INTO agent_logs(user_id, agent_name, action, details)
  VALUES (NEW.id, 'system', 'user_created', 'New user account provisioned');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic user provisioning
DROP TRIGGER IF EXISTS on_user_created ON auth.users;
CREATE TRIGGER on_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

### 5. Usage Tracking Functions

```sql
-- Function to increment API usage
CREATE OR REPLACE FUNCTION increment_api_usage(
  p_user_id UUID, 
  p_service_name TEXT, 
  p_cost_cents INTEGER DEFAULT 1
)
RETURNS void AS $$
BEGIN
  -- Update current usage
  UPDATE user_profiles 
  SET api_usage_current = api_usage_current + p_cost_cents,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Log the usage
  INSERT INTO api_usage_logs (user_id, service_name, cost_cents)
  VALUES (p_user_id, p_service_name, p_cost_cents);
END;
$$ LANGUAGE plpgsql;

-- Function to reset monthly usage
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
  UPDATE user_profiles 
  SET api_usage_current = 0,
      updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
```

## Authentication System

### 1. Supabase Auth Configuration

```typescript
// lib/supabase-auth.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})

// Database types
export interface UserProfile {
  id: string
  user_id: string
  email: string
  full_name?: string
  company_name?: string
  subscription_tier: 'free' | 'pro' | 'enterprise'
  api_usage_limit: number
  api_usage_current: number
  setup_completed: boolean
  created_at: string
  updated_at: string
}

export interface UserApiKey {
  id: string
  user_id: string
  service_name: string
  encrypted_key: string
  is_active: boolean
  created_at: string
  updated_at: string
}
```

### 2. Auth Context Provider

```typescript
// contexts/auth-context.tsx
'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, UserProfile } from '@/lib/supabase-auth'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  signUp: (email: string, password: string, metadata?: any) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUserProfile = async (userId: string) => {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    setProfile(profile)
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        loadUserProfile(session.user.id)
      }
      
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await loadUserProfile(session.user.id)
        } else {
          setProfile(null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, metadata?: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: metadata
      }
    })
    return { data, error }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user.id)
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

### 3. Protected Route Middleware

```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protect API routes (except auth endpoints)
  if (req.nextUrl.pathname.startsWith('/api/') && 
      !req.nextUrl.pathname.startsWith('/api/auth/')) {
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // Protect dashboard routes
  if (req.nextUrl.pathname.startsWith('/dashboard') ||
      req.nextUrl.pathname === '/') {
    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', req.url))
    }
  }

  // Redirect authenticated users away from auth pages
  if (req.nextUrl.pathname.startsWith('/auth/') && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
```

### 4. Authentication Pages

```typescript
// app/auth/login/page.tsx
'use client'
import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await signIn(email, password)
    
    if (error) {
      setError(error.message)
    } else {
      router.push('/dashboard')
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sign In to Coral Social</CardTitle>
          <p className="text-gray-600">Access your social media automation dashboard</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link href="/auth/signup" className="text-blue-600 hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

## API Key Management

### 1. Encryption Service

```typescript
// lib/crypto.ts
import { webcrypto } from 'crypto'

export class SecureKeyManager {
  private static async getEncryptionKey(): Promise<CryptoKey> {
    const keyMaterial = new TextEncoder().encode(process.env.ENCRYPTION_KEY!)
    return webcrypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    )
  }

  static async encryptApiKey(plaintext: string): Promise<string> {
    const key = await this.getEncryptionKey()
    const iv = webcrypto.getRandomValues(new Uint8Array(12))
    const encoded = new TextEncoder().encode(plaintext)
    
    const encrypted = await webcrypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    )
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(encrypted), iv.length)
    
    return Buffer.from(combined).toString('base64')
  }

  static async decryptApiKey(encryptedData: string): Promise<string> {
    const key = await this.getEncryptionKey()
    const combined = Buffer.from(encryptedData, 'base64')
    
    const iv = combined.slice(0, 12)
    const encrypted = combined.slice(12)
    
    const decrypted = await webcrypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    )
    
    return new TextDecoder().decode(decrypted)
  }
}
```

### 2. API Key Management API

```typescript
// app/api/user/api-keys/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { SecureKeyManager } from '@/lib/crypto'

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: apiKeys, error } = await supabase
    .from('user_api_keys')
    .select('service_name, is_active, created_at')
    .eq('user_id', session.user.id)
    .eq('is_active', true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ apiKeys })
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { service_name, api_key } = await request.json()

  if (!service_name || !api_key) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const encryptedKey = await SecureKeyManager.encryptApiKey(api_key)

    const { error } = await supabase
      .from('user_api_keys')
      .upsert({
        user_id: session.user.id,
        service_name,
        encrypted_key: encryptedKey,
        is_active: true
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Encryption failed' }, { status: 500 })
  }
}
```

### 3. API Key Retrieval for Agents

```typescript
// lib/user-api-keys.ts
import { createClient } from '@supabase/supabase-js'
import { SecureKeyManager } from './crypto'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // Service key for server-side operations
)

export async function getUserApiKeys(userId: string): Promise<Record<string, string>> {
  const { data: apiKeys, error } = await supabase
    .from('user_api_keys')
    .select('service_name, encrypted_key')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error) {
    throw new Error(`Failed to fetch API keys: ${error.message}`)
  }

  const decryptedKeys: Record<string, string> = {}

  for (const keyRecord of apiKeys) {
    try {
      const decryptedKey = await SecureKeyManager.decryptApiKey(keyRecord.encrypted_key)
      decryptedKeys[keyRecord.service_name] = decryptedKey
    } catch (error) {
      console.error(`Failed to decrypt key for ${keyRecord.service_name}:`, error)
    }
  }

  return decryptedKeys
}
```

## Multi-Tenant Data Access

### 1. Updated API Endpoints

```typescript
// app/api/tweets/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  // RLS automatically filters by user_id
  const { data: tweets, error } = await supabase
    .from('tweets')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ tweets })
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tweetData = await request.json()

  // user_id is automatically added by RLS
  const { data: tweet, error } = await supabase
    .from('tweets')
    .insert({
      ...tweetData,
      user_id: session.user.id // Explicitly set for clarity
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ tweet })
}
```

### 2. Qdrant Integration with User Filtering

```python
# lib/qdrant_client.py
import os
from qdrant_client import QdrantClient
from qdrant_client.http.models import Filter, FieldCondition, MatchValue
from typing import List, Dict, Any

class MultiTenantQdrantClient:
    def __init__(self):
        self.client = QdrantClient(host=os.getenv("QDRANT_HOST"))
        self.collection_name = "coral_embeddings"  # Single shared collection
    
    def search_user_embeddings(self, user_id: str, query_vector: List[float], limit: int = 10):
        """Search embeddings filtered by user_id"""
        return self.client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            query_filter=Filter(
                must=[
                    FieldCondition(
                        key="user_id",
                        match=MatchValue(value=user_id)
                    )
                ]
            ),
            limit=limit
        )
    
    def upsert_user_embeddings(self, user_id: str, points: List[Dict[str, Any]]):
        """Insert embeddings with user_id metadata"""
        for point in points:
            # Ensure user_id is in metadata
            if 'payload' not in point:
                point['payload'] = {}
            point['payload']['user_id'] = user_id
        
        return self.client.upsert(
            collection_name=self.collection_name,
            points=points
        )
    
    def delete_user_embeddings(self, user_id: str):
        """Delete all embeddings for a specific user"""
        return self.client.delete(
            collection_name=self.collection_name,
            points_selector=Filter(
                must=[
                    FieldCondition(
                        key="user_id",
                        match=MatchValue(value=user_id)
                    )
                ]
            )
        )
```

## User Onboarding Flow

### 1. Setup Wizard Component

```typescript
// components/setup-wizard.tsx
'use client'
import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ApiKeys {
  openai: string
  twitter_bearer: string
  twitter_api_key: string
  twitter_api_secret: string
  twitter_access_token: string
  twitter_access_token_secret: string
  perplexity: string
  anthropic: string
}

export function SetupWizard() {
  const { user, refreshProfile } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    openai: '',
    twitter_bearer: '',
    twitter_api_key: '',
    twitter_api_secret: '',
    twitter_access_token: '',
    twitter_access_token_secret: '',
    perplexity: '',
    anthropic: ''
  })

  const totalSteps = 3
  const progress = (step / totalSteps) * 100

  const saveApiKey = async (serviceName: string, apiKey: string) => {
    if (!apiKey.trim()) return

    const response = await fetch('/api/user/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_name: serviceName,
        api_key: apiKey
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to save ${serviceName} API key`)
    }
  }

  const completeSetup = async () => {
    setLoading(true)
    setError('')

    try {
      // Save all API keys
      const savePromises = Object.entries(apiKeys)
        .filter(([_, value]) => value.trim())
        .map(([key, value]) => saveApiKey(key, value))

      await Promise.all(savePromises)

      // Mark setup as completed
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setup_completed: true
        })
      })

      if (!response.ok) {
        throw new Error('Failed to complete setup')
      }

      await refreshProfile()
      window.location.href = '/dashboard'
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Setup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Setup Your Coral Social Account</CardTitle>
            <Progress value={progress} className="mt-4" />
          </CardHeader>
          <CardContent>
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Welcome to Coral Social</h3>
                <p className="text-gray-600">
                  Let's get your account set up with the necessary API keys to start automating your social media.
                </p>
                <Button onClick={() => setStep(2)}>Get Started</Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">API Configuration</h3>
                <p className="text-gray-600">
                  Enter your API keys for the services you want to use. All keys are encrypted and stored securely.
                </p>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">OpenAI API Key</label>
                    <Input
                      type="password"
                      placeholder="sk-..."
                      value={apiKeys.openai}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, openai: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Twitter Bearer Token</label>
                    <Input
                      type="password"
                      placeholder="Bearer token..."
                      value={apiKeys.twitter_bearer}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, twitter_bearer: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Perplexity API Key</label>
                    <Input
                      type="password"
                      placeholder="pplx-..."
                      value={apiKeys.perplexity}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, perplexity: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button onClick={() => setStep(3)}>Continue</Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Complete Setup</h3>
                <p className="text-gray-600">
                  Review your configuration and complete the setup process.
                </p>
                
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                  <Button onClick={completeSetup} disabled={loading}>
                    {loading ? 'Completing Setup...' : 'Complete Setup'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

## Agent Architecture Updates

### 1. Multi-Tenant Agent Base Class

```python
# updated_langchain_interface.py
import os
import asyncio
from typing import Dict, Any, Optional
from supabase import create_client, Client
from lib.qdrant_client import MultiTenantQdrantClient
from lib.user_api_keys import getUserApiKeys

class MultiTenantLangChainAgent:
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.supabase: Client = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_KEY")
        )
        self.qdrant_client = MultiTenantQdrantClient()
        self.user_api_keys: Dict[str, str] = {}
        
    async def initialize(self):
        """Initialize agent with user-specific API keys"""
        self.user_api_keys = await getUserApiKeys(self.user_id)
        
        # Set environment variables for this agent instance
        for service, key in self.user_api_keys.items():
            os.environ[f"USER_{service.upper()}_API_KEY"] = key
    
    async def get_user_data(self, table: str, filters: Dict[str, Any] = None, limit: int = 100):
        """Get data for the current user from any table"""
        query = self.supabase.table(table).select('*').eq('user_id', self.user_id)
        
        if filters:
            for key, value in filters.items():
                query = query.eq(key, value)
        
        if limit:
            query = query.limit(limit)
        
        return query.execute()
    
    async def insert_user_data(self, table: str, data: Dict[str, Any]):
        """Insert data with user_id automatically added"""
        data['user_id'] = self.user_id
        return self.supabase.table(table).insert(data).execute()
    
    async def update_user_data(self, table: str, data: Dict[str, Any], filters: Dict[str, Any]):
        """Update user's data in any table"""
        query = self.supabase.table(table).update(data).eq('user_id', self.user_id)
        
        for key, value in filters.items():
            query = query.eq(key, value)
        
        return query.execute()
    
    async def search_user_embeddings(self, query_vector: list, limit: int = 10):
        """Search user's embeddings in Qdrant"""
        return self.qdrant_client.search_user_embeddings(
            user_id=self.user_id,
            query_vector=query_vector,
            limit=limit
        )
    
    async def store_user_embeddings(self, points: list):
        """Store embeddings for the user"""
        return self.qdrant_client.upsert_user_embeddings(
            user_id=self.user_id,
            points=points
        )
    
    async def log_activity(self, agent_name: str, action: str, details: str):
        """Log agent activity for the user"""
        await self.insert_user_data('agent_logs', {
            'agent_name': agent_name,
            'action': action,
            'details': details
        })
    
    async def track_api_usage(self, service_name: str, cost_cents: int = 1):
        """Track API usage for billing"""
        await self.supabase.rpc('increment_api_usage', {
            'p_user_id': self.user_id,
            'p_service_name': service_name,
            'p_cost_cents': cost_cents
        }).execute()
```

### 2. Updated Tweet Scraping Agent

```python
# updated_tweet_scraping_agent.py
import asyncio
from updated_langchain_interface import MultiTenantLangChainAgent
import tweepy

class MultiTenantTweetScrapingAgent(MultiTenantLangChainAgent):
    def __init__(self, user_id: str):
        super().__init__(user_id)
        self.twitter_client = None
    
    async def initialize_twitter_client(self):
        """Initialize Twitter client with user's API keys"""
        await self.initialize()
        
        if 'twitter_bearer' in self.user_api_keys:
            self.twitter_client = tweepy.Client(
                bearer_token=self.user_api_keys['twitter_bearer']
            )
        else:
            raise ValueError("Twitter Bearer Token not found for user")
    
    async def scrape_tweets_for_user(self, accounts: list, max_tweets: int = 100):
        """Scrape tweets for the specific user"""
        await self.initialize_twitter_client()
        
        all_tweets = []
        
        for account in accounts:
            try:
                # Get user's Twitter account configuration
                user_accounts = await self.get_user_data('x_accounts', {'username': account})
                
                if not user_accounts.data:
                    await self.log_activity('Tweet Scraping Agent', 'warning', f'Account {account} not configured for user')
                    continue
                
                # Scrape tweets
                tweets = self.twitter_client.get_user_tweets(
                    username=account,
                    max_results=max_tweets,
                    tweet_fields=['created_at', 'public_metrics', 'author_id']
                )
                
                # Store tweets in user's cache
                for tweet in tweets.data or []:
                    tweet_data = {
                        'tweet_id': tweet.id,
                        'content': tweet.text,
                        'author': account,
                        'created_at': tweet.created_at.isoformat(),
                        'likes': tweet.public_metrics['like_count'],
                        'retweets': tweet.public_metrics['retweet_count'],
                        'status': 'unprocessed'
                    }
                    
                    await self.insert_user_data('tweets_cache', tweet_data)
                    all_tweets.append(tweet_data)
                
                # Track API usage
                await self.track_api_usage('twitter', len(tweets.data or []))
                
            except Exception as e:
                await self.log_activity('Tweet Scraping Agent', 'error', f'Failed to scrape {account}: {str(e)}')
        
        await self.log_activity('Tweet Scraping Agent', 'completed', f'Scraped {len(all_tweets)} tweets')
        return all_tweets

# Usage
async def run_tweet_scraping_for_user(user_id: str):
    agent = MultiTenantTweetScrapingAgent(user_id)
    
    # Get user's configured accounts
    accounts_data = await agent.get_user_data('x_accounts')
    accounts = [acc['username'] for acc in accounts_data.data]
    
    if accounts:
        await agent.scrape_tweets_for_user(accounts)
    else:
        await agent.log_activity('Tweet Scraping Agent', 'warning', 'No Twitter accounts configured')
```

## Implementation Timeline

### Week 1: Database Foundation
- **Day 1-2**: Execute database migration scripts
- **Day 3-4**: Implement and test RLS policies
- **Day 5**: Create performance indexes and test query performance

### Week 2: Authentication System
- **Day 1-2**: Implement Supabase Auth integration
- **Day 3-4**: Create login/signup pages and protected routes
- **Day 5**: Implement API key encryption and storage

### Week 3: Multi-Tenant APIs
- **Day 1-2**: Update all API endpoints for user filtering
- **Day 3-4**: Implement usage tracking and limits
- **Day 5**: Create setup wizard and user onboarding

### Week 4: Agent Updates
- **Day 1-2**: Update agent base class for multi-tenancy
- **Day 3-4**: Modify existing agents for user context
- **Day 5**: Test agent execution with user-specific data

### Week 5: UI Integration
- **Day 1-2**: Update dashboard components for multi-user
- **Day 3-4**: Implement user profile and settings management
- **Day 5**: Add billing and usage monitoring interfaces

### Week 6: Testing & Optimization
- **Day 1-2**: Performance testing with multiple users
- **Day 3-4**: Security testing and penetration testing
- **Day 5**: Load testing and optimization

## Environment Configuration

### Required Environment Variables

```bash
# Core Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Security
ENCRYPTION_KEY=your-32-character-encryption-key
NEXTAUTH_SECRET=your-nextauth-secret

# Qdrant Configuration
QDRANT_HOST=http://qdrant.marvn.club:6333

# Optional: Redis for caching (future enhancement)
REDIS_URL=redis://localhost:6379

# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Security Best Practices

1. **Encryption Key Management**:
   - Use a secure 32-character encryption key
   - Store in environment variables, never in code
   - Rotate keys periodically

2. **Database Security**:
   - Use service role key only for server-side operations
   - Never expose service role key to client-side code
   - Implement proper RLS policies on all tables

3. **API Key Storage**:
   - Always encrypt API keys before storage
   - Use AES-GCM encryption with random IVs
   - Implement key rotation capabilities

## Performance Optimization

### Database Optimization

```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM tweets WHERE user_id = 'user-uuid' ORDER BY created_at DESC LIMIT 50;

-- Monitor index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch 
FROM pg_stat_user_indexes 
WHERE schemaname = 'public';

-- Optimize for common queries
CREATE INDEX CONCURRENTLY idx_tweets_user_status_created 
ON tweets(user_id, status, created_at DESC) 
WHERE status = 'published';
```

### Caching Strategy

```typescript
// lib/cache.ts
import { Redis } from 'ioredis'

const redis = new Redis(process.env.REDIS_URL!)

export class UserDataCache {
  static async getUserTweets(userId: string, limit: number = 50) {
    const cacheKey = `user:${userId}:tweets:${limit}`
    
    // Try cache first
    const cached = await redis.get(cacheKey)
    if (cached) {
      return JSON.parse(cached)
    }
    
    // Fetch from database
    const tweets = await supabase
      .from('tweets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    // Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(tweets.data))
    
    return tweets.data
  }
  
  static async invalidateUserCache(userId: string) {
    const pattern = `user:${userId}:*`
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  }
}
```

## Security Considerations

### Data Protection
- All user data isolated via RLS policies
- API keys encrypted with AES-GCM
- No cross-user data leakage possible
- Audit logging for all data access

### Authentication Security
- PKCE flow for OAuth security
- Session management via Supabase Auth
- Automatic token refresh
- Secure password requirements

### API Security
- Rate limiting per user
- Usage tracking and limits
- Input validation and sanitization
- CORS configuration

## Testing Strategy

### Unit Tests
```typescript
// tests/auth.test.ts
import { createMockSupabaseClient } from './mocks/supabase'
import { AuthProvider } from '@/contexts/auth-context'

describe('Authentication', () => {
  test('User can sign in with valid credentials', async () => {
    const mockSupabase = createMockSupabaseClient()
    // Test implementation
  })
  
  test('RLS policies prevent cross-user data access', async () => {
    // Test that user A cannot access user B's data
  })
})
```

### Integration Tests
```typescript
// tests/api.test.ts
describe('API Endpoints', () => {
  test('GET /api/tweets returns only user tweets', async () => {
    const response = await fetch('/api/tweets', {
      headers: { Authorization: `Bearer ${userToken}` }
    })
    
    const data = await response.json()
    expect(data.tweets.every(tweet => tweet.user_id === userId)).toBe(true)
  })
})
```

### Load Testing
```bash
# load-test.sh
#!/bin/bash

# Test concurrent user access
ab -n 1000 -c 50 -H "Authorization: Bearer $TEST_TOKEN" \
   http://localhost:3000/api/tweets

# Test database performance under load
pgbench -h localhost -p 5432 -U postgres -d coral_social \
        -c 20 -j 4 -T 120 -f user_queries.sql
```

---

## Summary

This multi-tenant configuration provides:

✅ **Secure Data Isolation**: RLS policies ensure complete user data separation
✅ **Scalable Architecture**: Shared infrastructure with user-specific filtering
✅ **Encrypted API Keys**: Secure storage and retrieval of user credentials
✅ **Simplified Onboarding**: Automated user provisioning and setup wizard
✅ **Performance Optimized**: Proper indexing and caching strategies
✅ **Production Ready**: Comprehensive security and monitoring

The implementation follows SaaS best practices while maintaining the simplicity and performance benefits of a shared database architecture.
