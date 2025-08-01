#!/bin/bash

# Coral Studio Official Protocol Implementation Deployment Script
# This script switches from our broken SSE implementation to the official WebSocket implementation

echo "🚀 Deploying Coral Studio Official Protocol Implementation..."
echo "================================================================"

# Check if we're in the correct directory
if [ ! -f "Web_Interface/lib/coral-protocol-bridge.ts" ]; then
    echo "❌ Error: coral-protocol-bridge.ts not found. Please run this script from the project root directory."
    exit 1
fi

# STEP 1: Remove Coral Inspector interference
echo "🧹 STEP 1: Removing Coral Inspector interference..."
if [ -f "remove_coral_inspector_interference.sh" ]; then
    chmod +x remove_coral_inspector_interference.sh
    ./remove_coral_inspector_interference.sh
    if [ $? -eq 0 ]; then
        echo "✅ Coral Inspector removal completed successfully"
    else
        echo "❌ Coral Inspector removal failed"
        exit 1
    fi
else
    echo "⚠️  remove_coral_inspector_interference.sh not found, skipping interference removal"
fi

echo ""
echo "🔄 STEP 2: Implementing Official Protocol..."

# Backup current implementation
echo "📋 Creating backup of current implementation..."
cp Web_Interface/lib/coral-protocol-bridge.ts Web_Interface/lib/coral-protocol-bridge-old.ts.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Backup created: coral-protocol-bridge-old.ts.backup.$(date +%Y%m%d_%H%M%S)"

# Replace with official implementation
echo "🔄 Replacing with official WebSocket implementation..."
cp Web_Interface/lib/coral-protocol-bridge-official.ts Web_Interface/lib/coral-protocol-bridge.ts
echo "✅ Official implementation deployed"

# Navigate to Web_Interface directory
echo "📁 Navigating to Web_Interface directory..."
cd Web_Interface || {
    echo "❌ Error: Web_Interface directory not found"
    exit 1
}

# Build the application
echo "🔨 Building application with new implementation..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed - please check for errors"
    exit 1
fi

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
echo "🎉 Coral Studio Official Protocol Implementation Deployment Complete!"
echo "===================================================================="
echo ""
echo "📋 Summary of Changes:"
echo "  ✅ Replaced SSE implementation with official WebSocket implementation"
echo "  ✅ Changed from /devmode/.../sse to /debug/.../websocket endpoints"
echo "  ✅ Removed bridge agent registration logic"
echo "  ✅ Implemented official event handling patterns"
echo "  ✅ Application rebuilt and restarted"
echo ""
echo "🔧 Key Protocol Changes:"
echo "  • Protocol: SSE → WebSocket"
echo "  • Endpoint: /devmode/.../sse → /debug/.../websocket"
echo "  • Role: Bridge Agent → Debug Observer"
echo "  • Events: Custom → Official (ThreadList, AgentList, MessageSent)"
echo ""
echo "🧪 Testing Instructions:"
echo "  1. Navigate to https://8interns.com/coral-studio"
echo "  2. Open browser developer console (F12)"
echo "  3. Look for WebSocket connection messages instead of SSE"
echo "  4. Check for official event types (ThreadList, AgentList, etc.)"
echo "  5. Verify 503 'Coral Bridge connection failed' error is resolved"
echo ""
echo "📊 Expected Results:"
echo "  ✅ WebSocket connection to ws://coral.8interns.com/debug/..."
echo "  ✅ Official Coral Protocol events received"
echo "  ✅ Agent status panel should load with real data"
echo "  ✅ No more 503 Service Unavailable errors"
echo "  ✅ Real-time session observation working"
echo ""
echo "🔧 If issues persist:"
echo "  - Check browser console for WebSocket connection errors"
echo "  - Verify Coral server supports /debug/ endpoints"
echo "  - Check PM2 logs: pm2 logs coral-web"
echo "  - Verify WebSocket connectivity to coral.8interns.com"
echo ""
echo "📝 Documentation:"
echo "  - CORAL_STUDIO_PROTOCOL_ARCHITECTURE_ANALYSIS_COMPLETE.md"
echo "  - Web_Interface/lib/coral-protocol-bridge-official.ts"
echo ""
echo "✨ Deployment completed at: $(date)"
echo ""
echo "🚨 CRITICAL: This implements the official Coral Studio WebSocket protocol"
echo "   instead of our previous incorrect SSE bridge agent implementation."
