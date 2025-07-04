#!/bin/bash

# Runtime Environment Fix Script
# This script fixes the PM2 environment variable loading issue

set -e  # Exit on any error

echo "🔧 Fixing runtime environment variable loading..."

# Navigate to your project directory
cd /home/coraluser/Coral_Social_Media/Web_Interface

echo "📁 Current directory: $(pwd)"

# Copy .env file to Web_Interface directory where PM2 expects it
echo "📄 Copying .env file to Web_Interface directory..."
cp /home/coraluser/Coral_Social_Media/.env .env

echo "✅ Environment file copied!"

# Verify the file exists and has content
if [ -f ".env" ]; then
    echo "✅ .env file exists in Web_Interface directory"
    echo "📊 File size: $(wc -l < .env) lines"
else
    echo "❌ .env file not found!"
    exit 1
fi

# Restart PM2 with environment variables
echo "🔄 Restarting PM2 with updated environment..."
pm2 restart coral-web --update-env

echo "📊 Checking PM2 status..."
pm2 status

echo "📝 Showing recent logs..."
pm2 logs coral-web --lines 10

echo ""
echo "🎉 RUNTIME ENVIRONMENT FIX COMPLETE!"
echo ""
echo "🌐 Your 8interns.com authentication system should now be fully operational!"
echo ""
echo "🔗 Test your authentication:"
echo "1. Visit https://8interns.com"
echo "2. Should redirect to login page (no more middleware errors)"
echo "3. Try creating a new account"
echo "4. Test login functionality"
echo ""
echo "🔧 Final step - Configure Supabase Auth Settings:"
echo "1. Go to your Supabase project dashboard"
echo "2. Navigate to Authentication > Settings"
echo "3. Set Site URL to: https://8interns.com"
echo "4. Add redirect URLs:"
echo "   - https://8interns.com/auth/callback"
echo "   - https://8interns.com/auth/confirm"
echo ""
echo "🎯 Your multi-tenant SaaS platform is now LIVE! 🚀"
EOF

chmod +x runtime_env_fix.sh

echo "🎯 Runtime environment fix script created!"
echo ""
echo "Run this command on your server to complete the deployment:"
echo ""
echo "bash runtime_env_fix.sh"
echo ""
echo "This will:"
echo "✅ Copy .env file to the correct location for PM2"
echo "✅ Restart PM2 with updated environment variables"
echo "✅ Complete your authentication system deployment"
echo "✅ Make 8interns.com fully operational with authentication"
