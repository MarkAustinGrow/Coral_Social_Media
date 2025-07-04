#!/bin/bash

echo "🔧 Fixing login redirect loop issue..."

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

echo "🧹 Cleaning Next.js cache..."
cd Web_Interface
rm -rf .next
rm -rf node_modules/.cache
cd ..

echo "🚀 Starting application with fixed authentication flow..."
pm2 start ecosystem.config.js

# Wait for application to start
echo "⏳ Waiting for application to start..."
sleep 5

# Check PM2 status
echo "📊 Checking PM2 status..."
pm2 status

echo ""
echo "✅ Login redirect loop fix deployed!"
echo ""
echo "🔧 **What was fixed:**"
echo "   - Created ConditionalLayout to prevent navigation components from loading on auth pages"
echo "   - Fixed login page to wait for auth state change before redirecting"
echo "   - Improved AuthContext loading state management"
echo "   - Separated auth pages from main app layout"
echo ""
echo "🌐 Application should be available at: http://localhost:3000"
echo "🔗 Login page: http://localhost:3000/auth/login"
echo "📝 Signup page: http://localhost:3000/auth/signup"
echo ""
echo "📋 To monitor logs: pm2 logs coral-web"
echo "🔄 To restart: pm2 restart coral-web"
echo ""
echo "🧪 **Test the fix:**"
echo "   1. Go to http://localhost:3000/auth/login"
echo "   2. Enter your credentials and click 'Sign In'"
echo "   3. You should be redirected to the dashboard without getting stuck in a loop"
