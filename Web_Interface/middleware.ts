import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // Check if Supabase environment variables are available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not found in middleware, allowing request to proceed')
    return res
  }

  try {
    const supabase = createMiddlewareClient({ req, res })

    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession()

    const { pathname } = req.nextUrl

    console.log('🔧 Middleware check:', {
      pathname,
      hasSession: !!session,
      userEmail: session?.user?.email,
      sessionError: sessionError?.message,
      timestamp: new Date().toISOString()
    })

    // Public routes that don't require authentication
    const publicRoutes = ['/auth/login', '/auth/signup', '/auth/callback', '/debug/env', '/debug/supabase']
    
    const isPublicRoute = publicRoutes.includes(pathname)

    // If it's a public route, allow access
    if (isPublicRoute) {
      console.log('✅ Middleware: Public route, allowing access to', pathname)
      return res
    }

    // For all other routes, check authentication
    if (!session) {
      console.log('❌ Middleware: No session found, redirecting to login from', pathname)
      const redirectUrl = new URL('/auth/login', req.url)
      return NextResponse.redirect(redirectUrl)
    }

    console.log('✅ Middleware: Session found, allowing access to', pathname)
    return res
  } catch (error) {
    console.error('❌ Middleware error:', error)
    // On error, allow request to proceed (don't break the app)
    return res
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
