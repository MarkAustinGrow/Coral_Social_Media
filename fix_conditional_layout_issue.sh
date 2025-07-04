#!/bin/bash

echo "🔧 Fixing ConditionalLayout import issue..."

# Get current directory
CURRENT_DIR=$(pwd)
echo "📁 Current directory: $CURRENT_DIR"

# Check if we're in the right directory
if [[ ! -d "Web_Interface" ]]; then
    echo "❌ Error: Web_Interface directory not found. Please run this script from the Coral_Social_Media root directory."
    exit 1
fi

echo "🛑 Stopping PM2 process..."
pm2 delete coral-web 2>/dev/null || echo "No existing coral-web process found"

echo "📁 Ensuring components directory exists..."
mkdir -p Web_Interface/components

echo "📄 Recreating ConditionalLayout component..."
cat > Web_Interface/components/conditional-layout.tsx << 'EOF'
"use client"

import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { TopNav } from '@/components/top-nav'
import { SideNav } from '@/components/side-nav'

interface ConditionalLayoutProps {
  children: React.ReactNode
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname()
  const { user, loading } = useAuth()

  // Check if current page is an auth page
  const isAuthPage = pathname?.startsWith('/auth/')

  // If it's an auth page, render without navigation
  if (isAuthPage) {
    return <>{children}</>
  }

  // If user is not authenticated and not on auth page, show minimal layout
  if (!loading && !user) {
    return <>{children}</>
  }

  // For authenticated users on non-auth pages, show full layout
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
        <SideNav />
        <main className="flex w-full flex-col overflow-hidden pt-4 md:pt-8">
          {children}
        </main>
      </div>
    </div>
  )
}
EOF

echo "✅ ConditionalLayout component recreated!"

echo "🧹 Cleaning Next.js cache and node_modules cache..."
cd Web_Interface
rm -rf .next
rm -rf node_modules/.cache
cd ..

echo "📄 Verifying component file exists..."
if [[ -f "Web_Interface/components/conditional-layout.tsx" ]]; then
    echo "✅ ConditionalLayout component file exists"
    echo "📏 File size: $(wc -c < Web_Interface/components/conditional-layout.tsx) bytes"
else
    echo "❌ ConditionalLayout component file missing!"
    exit 1
fi

echo "🚀 Starting application with fixed component..."
pm2 start ecosystem.config.js

# Wait for application to start
echo "⏳ Waiting for application to start..."
sleep 8

# Check PM2 status
echo "📊 Checking PM2 status..."
pm2 status

echo ""
echo "✅ ConditionalLayout fix deployed!"
echo ""
echo "🔧 **What was fixed:**"
echo "   - Recreated ConditionalLayout component on server"
echo "   - Cleared Next.js cache to force module resolution refresh"
echo "   - Restarted application cleanly"
echo ""
echo "🌐 Application should be available at: http://localhost:3000"
echo "🔗 Login page: http://localhost:3000/auth/login"
echo "📝 Signup page: http://localhost:3000/auth/signup"
echo ""
echo "📋 To monitor logs: pm2 logs coral-web"
echo ""
echo "🧪 **Test the signup now:**"
echo "   1. Go to http://localhost:3000/auth/signup"
echo "   2. Enter email and password"
echo "   3. Click 'Create Account'"
echo "   4. Check if it works without runtime errors"
