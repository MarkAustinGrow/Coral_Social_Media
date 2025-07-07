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
    console.log('🔧 AuthContext: Setting up auth listeners...')
    
    const getSession = async () => {
      try {
        console.log('🔧 AuthContext: Getting initial session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('❌ AuthContext: Error getting session:', error)
        } else {
          console.log('✅ AuthContext: Initial session:', session?.user?.email || 'No user')
          setSession(session)
          setUser(session?.user ?? null)
        }
      } catch (error) {
        console.error('❌ AuthContext: Exception getting session:', error)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    console.log('🔧 AuthContext: Setting up onAuthStateChange listener...')
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔥 AUTH STATE CHANGED:', {
          event,
          userEmail: session?.user?.email,
          hasSession: !!session,
          hasUser: !!session?.user,
          timestamp: new Date().toISOString()
        })
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        
        if (session?.user) {
          console.log('✅ User authenticated successfully:', session.user.email)
        } else {
          console.log('❌ User signed out or session cleared')
        }
      }
    )

    console.log('✅ AuthContext: Auth listener set up successfully')

    return () => {
      console.log('🔧 AuthContext: Cleaning up auth listener')
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 AuthContext: Starting signIn process for:', email)
      setLoading(true)
      
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      
      if (error) {
        console.error('❌ AuthContext: SignIn error:', error)
        throw error
      }
      
      console.log('✅ AuthContext: SignIn successful:', {
        hasUser: !!data.user,
        hasSession: !!data.session,
        userEmail: data.user?.email
      })
      
      // Don't set loading to false here - let the auth state change handler do it
    } catch (error: any) {
      console.error('❌ AuthContext: SignIn exception:', error)
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
