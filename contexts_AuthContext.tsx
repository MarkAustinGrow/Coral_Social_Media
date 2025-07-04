'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { 
  supabase, 
  getCurrentUser, 
  getCurrentSession, 
  getUserProfile, 
  getUserSettings,
  UserProfile,
  UserSettings,
  handleSupabaseError
} from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  settings: UserSettings | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, metadata?: any) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  refreshSettings: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const session = await getCurrentSession()
        setSession(session)
        
        if (session?.user) {
          setUser(session.user)
          await loadUserData(session.user.id)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()
  }, [])

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          await loadUserData(session.user.id)
        } else {
          setProfile(null)
          setSettings(null)
        }

        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Load user profile and settings
  const loadUserData = async (userId: string) => {
    try {
      const [profileData, settingsData] = await Promise.all([
        getUserProfile(userId),
        getUserSettings(userId)
      ])
      
      setProfile(profileData)
      setSettings(settingsData)
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) throw error
      
      // Auth state change will be handled by the listener
    } catch (error: any) {
      setLoading(false)
      throw new Error(handleSupabaseError(error))
    }
  }

  // Sign up function
  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
          data: metadata
        }
      })
      
      if (error) throw error
      
      // User will need to confirm email before they can sign in
    } catch (error: any) {
      setLoading(false)
      throw new Error(handleSupabaseError(error))
    }
  }

  // Sign out function
  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // Auth state change will be handled by the listener
    } catch (error: any) {
      setLoading(false)
      throw new Error(handleSupabaseError(error))
    }
  }

  // Refresh user profile
  const refreshProfile = async () => {
    if (!user) return
    
    try {
      const profileData = await getUserProfile(user.id)
      setProfile(profileData)
    } catch (error) {
      console.error('Error refreshing profile:', error)
    }
  }

  // Refresh user settings
  const refreshSettings = async () => {
    if (!user) return
    
    try {
      const settingsData = await getUserSettings(user.id)
      setSettings(settingsData)
    } catch (error) {
      console.error('Error refreshing settings:', error)
    }
  }

  // Update user profile
  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('No authenticated user')
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single()
      
      if (error) throw error
      
      setProfile(data)
    } catch (error: any) {
      throw new Error(handleSupabaseError(error))
    }
  }

  // Update user settings
  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!user) throw new Error('No authenticated user')
    
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single()
      
      if (error) throw error
      
      setSettings(data)
    } catch (error: any) {
      throw new Error(handleSupabaseError(error))
    }
  }

  const value: AuthContextType = {
    user,
    session,
    profile,
    settings,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    refreshSettings,
    updateProfile,
    updateSettings
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook for checking if user is authenticated
export function useRequireAuth() {
  const { user, loading } = useAuth()
  
  useEffect(() => {
    if (!loading && !user) {
      // Redirect to login page
      window.location.href = '/auth/login'
    }
  }, [user, loading])
  
  return { user, loading }
}

// Hook for checking if user has completed setup
export function useRequireSetup() {
  const { user, profile, loading } = useAuth()
  
  useEffect(() => {
    if (!loading && user && profile && !profile.setup_completed) {
      // Redirect to setup page
      window.location.href = '/setup'
    }
  }, [user, profile, loading])
  
  return { user, profile, loading }
}

// Hook for subscription tier checks
export function useSubscription() {
  const { profile } = useAuth()
  
  const isFreeTier = profile?.subscription_tier === 'free'
  const isProTier = profile?.subscription_tier === 'pro'
  const isEnterpriseTier = profile?.subscription_tier === 'enterprise'
  
  const hasFeature = (feature: string) => {
    if (!profile) return false
    
    const features = {
      'unlimited_api_calls': isProTier || isEnterpriseTier,
      'priority_support': isProTier || isEnterpriseTier,
      'custom_branding': isEnterpriseTier,
      'team_collaboration': isEnterpriseTier,
      'advanced_analytics': isProTier || isEnterpriseTier
    }
    
    return features[feature as keyof typeof features] || false
  }
  
  const usagePercentage = profile 
    ? (profile.api_usage_current / profile.api_usage_limit) * 100 
    : 0
  
  const isNearLimit = usagePercentage > 80
  const isOverLimit = usagePercentage >= 100
  
  return {
    tier: profile?.subscription_tier,
    isFreeTier,
    isProTier,
    isEnterpriseTier,
    hasFeature,
    usagePercentage,
    isNearLimit,
    isOverLimit,
    currentUsage: profile?.api_usage_current || 0,
    usageLimit: profile?.api_usage_limit || 0
  }
}
