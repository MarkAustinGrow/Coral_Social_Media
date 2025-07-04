'use client'

export default function EnvDebugPage() {
  // In client-side code, environment variables are available as globals
  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: typeof window !== 'undefined' ? (window as any).ENV?.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL : 'Loading...',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: typeof window !== 'undefined' ? (window as any).ENV?.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : 'Loading...',
    NEXT_PUBLIC_APP_URL: typeof window !== 'undefined' ? (window as any).ENV?.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL : 'Loading...',
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Environment Variables Debug</h1>
      <div className="space-y-4">
        {Object.entries(envVars).map(([key, value]) => (
          <div key={key} className="border p-4 rounded">
            <strong>{key}:</strong>
            <br />
            <code className="bg-gray-100 p-2 rounded block mt-2">
              {value ? `${value.substring(0, 50)}...` : 'undefined'}
            </code>
            <div className="mt-2 text-sm">
              Status: {value ? '✅ Loaded' : '❌ Missing'}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 p-4 bg-yellow-100 rounded">
        <h2 className="font-bold">Instructions:</h2>
        <p>1. Deploy this to your server</p>
        <p>2. Visit https://8interns.com/debug/env</p>
        <p>3. Check if environment variables are loaded</p>
      </div>
    </div>
  )
}
