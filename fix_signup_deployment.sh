#!/bin/bash

echo "🔧 Fixing signup feature deployment..."

# Get current directory
CURRENT_DIR=$(pwd)
echo "📁 Current directory: $CURRENT_DIR"

# Check if we're in the right directory
if [[ ! -d "Web_Interface" ]]; then
    echo "❌ Error: Web_Interface directory not found. Please run this script from the Coral_Social_Media root directory."
    exit 1
fi

# Check if .env file exists
if [[ ! -f ".env" ]]; then
    echo "❌ Error: .env file not found in root directory."
    exit 1
fi

echo "✅ Found .env file in root directory"

# Copy .env to Web_Interface directory for Next.js
echo "📄 Copying .env file to Web_Interface directory..."
cp .env Web_Interface/.env
echo "✅ Environment file copied!"

# Create logs directory if it doesn't exist
mkdir -p logs

# Stop any existing PM2 processes
echo "🛑 Stopping existing PM2 processes..."
pm2 delete coral-web 2>/dev/null || echo "No existing coral-web process found"

# Clean Next.js build cache
echo "🧹 Cleaning Next.js build cache..."
cd Web_Interface
rm -rf .next
rm -rf node_modules/.cache
cd ..

# Start with ecosystem config
echo "🚀 Starting application with ecosystem config..."
pm2 start ecosystem.config.js

# Wait for application to start
echo "⏳ Waiting for application to start..."
sleep 5

# Check PM2 status
echo "📊 Checking PM2 status..."
pm2 status

# Show recent logs
echo "📝 Showing recent logs..."
pm2 logs coral-web --lines 20

echo ""
echo "✅ Deployment complete!"
echo "🌐 Application should be available at: http://localhost:3000"
echo "🔗 Login page: http://localhost:3000/auth/login"
echo "📝 Signup page: http://localhost:3000/auth/signup"
echo ""
echo "📋 To monitor logs in real-time, run: pm2 logs coral-web"
echo "🔄 To restart the application, run: pm2 restart coral-web"
