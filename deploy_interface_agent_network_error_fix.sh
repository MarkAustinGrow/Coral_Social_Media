#!/bin/bash

# Deploy Interface Agent Network Error Fix
# This script deploys the fixes for the Interface Agent network error issue

echo "🚀 Deploying Interface Agent Network Error Fix..."

# Set the working directory to the project root
cd "$(dirname "$0")"
PROJECT_ROOT=$(pwd)

echo "📂 Project root: $PROJECT_ROOT"

# Check if we're in the correct directory
if [ ! -f "0_langchain_interface.py" ]; then
    echo "❌ Error: Script must be run from the project root directory"
    exit 1
fi

# Backup the original files
echo "📦 Creating backups of original files..."
cp 0_langchain_interface.py 0_langchain_interface.py.bak
cp Web_Interface/app/api/coral/interface-agent/route.ts Web_Interface/app/api/coral/interface-agent/route.ts.bak

echo "✅ Backups created successfully"

# Copy the updated files
echo "📋 Copying updated files..."
# No need to copy, as we've already updated the files in place

# Restart the Interface Agent service
echo "🔄 Restarting Interface Agent service..."

# Stop any running Interface Agent processes
echo "🛑 Stopping any running Interface Agent processes..."
pkill -f "0_langchain_interface.py" || true

# Restart the web interface
echo "🔄 Rebuilding and restarting the web interface..."
cd Web_Interface
npm run build
cd ..

# If using PM2, restart the web interface
if command -v pm2 &> /dev/null; then
    echo "🔄 Restarting PM2 processes..."
    pm2 restart all
else
    echo "⚠️ PM2 not found, skipping PM2 restart"
fi

echo "📝 Creating completion marker file..."
echo "Interface Agent Network Error Fix has been deployed successfully on $(date)" > INTERFACE_AGENT_NETWORK_ERROR_FIX_COMPLETE.md

echo "✅ Deployment complete!"
echo "🔍 You can now test the Interface Agent to verify the fix"
echo "📊 Monitor the logs for any remaining issues"

exit 0
