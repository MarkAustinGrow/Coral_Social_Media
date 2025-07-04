'use client'

import { useEffect, useState } from 'react'

export default function SupabaseDebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>({})

  useEffect(() => {
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const appUrl = process.env.NEXT_PUBLIC_APP_URL

    setDebugInfo({
      envVars: {
        NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
        NEXT_PUBLIC_APP_URL: appUrl,
      },
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseAnonKey,
      hasAppUrl: !!appUrl,
      urlLength: supabaseUrl?.length || 0,
      keyLength: supabaseAnonKey?.length || 0,
      isUsingMockClient: !supabaseUrl || !supabaseAnonKey,
    })
  }, [])

  const testSignup = async () => {
    try {
      // Import the supabase client
      const { supabase } = await import('@/lib/supabase')
      
      console.log('Testing signup with supabase client:', supabase)
      
      const result = await supabase.auth.signUp({
        email: 'test@example.com',
        password: 'testpassword123',
      })
      
      console.log('Signup result:', result)
      
      setDebugInfo(prev => ({
        ...prev,
        signupTest: {
          success: !result.error,
          error: result.error?.message,
          data: result.data,
        }
      }))
    } catch (error: any) {
      console.error('Signup test error:', error)
      setDebugInfo(prev => ({
        ...prev,
        signupTest: {
          success: false,
          error: error.message,
        }
      }))
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Supabase Client Debug</h1>
      
      <div className="space-y-6">
        <div className="border p-4 rounded">
          <h2 className="font-bold mb-2">Environment Variables</h2>
          <div className="space-y-2 text-sm">
            <div>NEXT_PUBLIC_SUPABASE_URL: {debugInfo.hasSupabaseUrl ? '✅ Present' : '❌ Missing'} ({debugInfo.urlLength} chars)</div>
            <div>NEXT_PUBLIC_SUPABASE_ANON_KEY: {debugInfo.hasSupabaseKey ? '✅ Present' : '❌ Missing'} ({debugInfo.keyLength} chars)</div>
            <div>NEXT_PUBLIC_APP_URL: {debugInfo.hasAppUrl ? '✅ Present' : '❌ Missing'}</div>
          </div>
        </div>

        <div className="border p-4 rounded">
          <h2 className="font-bold mb-2">Client Status</h2>
          <div className="text-sm">
            Using Mock Client: {debugInfo.isUsingMockClient ? '❌ YES (This is the problem!)' : '✅ NO'}
          </div>
        </div>

        <div className="border p-4 rounded">
          <h2 className="font-bold mb-2">Raw Values (First 50 chars)</h2>
          <div className="space-y-2 text-xs font-mono">
            <div>URL: {debugInfo.envVars?.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 50) || 'undefined'}</div>
            <div>KEY: {debugInfo.envVars?.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 50) || 'undefined'}</div>
          </div>
        </div>

        <div className="border p-4 rounded">
          <h2 className="font-bold mb-2">Test Signup</h2>
          <button 
            onClick={testSignup}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Test Signup Function
          </button>
          {debugInfo.signupTest && (
            <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
              <div>Success: {debugInfo.signupTest.success ? '✅' : '❌'}</div>
              {debugInfo.signupTest.error && <div>Error: {debugInfo.signupTest.error}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
