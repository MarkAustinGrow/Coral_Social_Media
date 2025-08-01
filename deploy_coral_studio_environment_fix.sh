#!/bin/bash

# Coral Studio Environment Variable Fix Deployment Script
# This script applies the environment variable fix and restarts the application

echo "🚀 Deploying Coral Studio Environment Variable Fix..."
echo "=================================================="

# Check if we're in the correct directory
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found. Please run this script from the project root directory."
    exit 1
fi

# Backup current .env file
echo "📋 Creating backup of current .env file..."
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Backup created: .env.backup.$(date +%Y%m%d_%H%M%S)"

# Check if the environment variable is already commented out
if grep -q "^# NEXT_PUBLIC_CORAL_API_BASE_URL=" .env; then
    echo "✅ Environment variable is already commented out - no changes needed"
else
    echo "🔧 Commenting out NEXT_PUBLIC_CORAL_API_BASE_URL environment variable..."
    
    # Comment out the environment variable and add explanation
    sed -i 's/^NEXT_PUBLIC_CORAL_API_BASE_URL=/#NEXT_PUBLIC_CORAL_API_BASE_URL=/' .env
    
    # Add explanation comment if not already present
    if ! grep -q "Commented out to use same-origin API calls" .env; then
        sed -i '/^# NEXT_PUBLIC_CORAL_API_BASE_URL=/a # Commented out to use same-origin API calls (empty string default in use-coral-studio.ts)' .env
    fi
    
    echo "✅ Environment variable commented out successfully"
fi

# Verify the change
echo "🔍 Verifying environment variable configuration..."
if grep -q "^# NEXT_PUBLIC_CORAL_API_BASE_URL=" .env; then
    echo "✅ Verification successful - environment variable is commented out"
    echo "📋 Current configuration:"
    grep -A1 "^# NEXT_PUBLIC_CORAL_API_BASE_URL=" .env
else
    echo "❌ Verification failed - environment variable may not be properly commented out"
    exit 1
fi

# Navigate to Web_Interface directory
echo "📁 Navigating to Web_Interface directory..."
cd Web_Interface || {
    echo "❌ Error: Web_Interface directory not found"
    exit 1
}

# Check if PM2 is running
echo "🔍 Checking PM2 status..."
if pm2 list | grep -q "coral-web"; then
    echo "🔄 Restarting PM2 application..."
    pm2 restart coral-web
    
    # Wait for restart to complete
    sleep 3
    
    # Check if restart was successful
    if pm2 list | grep -q "coral-web.*online"; then
        echo "✅ PM2 application restarted successfully"
    else
        echo "⚠️  PM2 restart may have issues - please check PM2 status manually"
        pm2 list
    fi
else
    echo "⚠️  PM2 coral-web process not found - you may need to start it manually"
    echo "💡 To start: pm2 start ecosystem.config.js"
fi

echo ""
echo "🎉 Coral Studio Environment Variable Fix Deployment Complete!"
echo "============================================================"
echo ""
echo "📋 Summary of Changes:"
echo "  ✅ Environment variable NEXT_PUBLIC_CORAL_API_BASE_URL commented out"
echo "  ✅ Web interface will now use same-origin API calls"
echo "  ✅ Application restarted (if PM2 was running)"
echo ""
echo "🧪 Testing Instructions:"
echo "  1. Navigate to https://8interns.com/coral-studio"
echo "  2. Open browser developer console (F12)"
echo "  3. Check for 404 errors - there should be none for /api/socket.io"
echo "  4. Verify 'Socket.IO connected' status at top of page"
echo "  5. Check if 'Coral Bridge connection failed' error is resolved"
echo ""
echo "📊 Expected Results:"
echo "  ✅ No 404 errors in browser console"
echo "  ✅ Agent status panel should load"
echo "  ✅ Session management should work"
echo "  ✅ No more connection failed errors"
echo ""
echo "🔧 If issues persist:"
echo "  - Check PM2 logs: pm2 logs coral-web"
echo "  - Verify environment: grep CORAL_API .env"
echo "  - Check browser network tab for API calls"
echo ""
echo "📝 Documentation: CORAL_STUDIO_ENVIRONMENT_VARIABLE_FIX_COMPLETE.md"
echo ""
echo "✨ Fix completed at: $(date)"
