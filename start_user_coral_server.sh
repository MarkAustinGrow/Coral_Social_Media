#!/bin/bash

# Start User-Specific Coral Server Script
# Usage: ./start_user_coral_server.sh <user_id>

if [ $# -lt 1 ]; then
    echo "Usage: $0 <user_id>"
    echo "Example: $0 99d3ff50-dcb5-4389-8e76-2ecd626902bc"
    exit 1
fi

USER_ID="$1"

echo "🚀 Starting Coral server for user: $USER_ID"

# Generate port based on user ID hash
USER_HASH=$(echo -n "$USER_ID" | md5sum | cut -c1-8)
USER_PORT=$((5555 + (0x$USER_HASH % 1000)))

echo "📡 Allocated port: $USER_PORT for user: $USER_ID"

# Check if port is already in use
if netstat -tlnp | grep ":$USER_PORT " > /dev/null; then
    echo "✅ Coral server already running on port $USER_PORT"
    exit 0
fi

# Navigate to Coral server directory
cd coral-server-master

# Check if Coral server directory exists
if [ ! -d "." ]; then
    echo "❌ Coral server directory not found"
    exit 1
fi

# Start Coral server with user-specific port
echo "🔧 Starting Coral server on port $USER_PORT..."

# Set environment variables for user-specific server
export SERVER_PORT=$USER_PORT
export USER_SESSION=$USER_ID

# Start the server in background
nohup ./gradlew run > "../coral_server_${USER_ID}.log" 2>&1 &

# Get the process ID
CORAL_PID=$!

echo "✅ Coral server started with PID: $CORAL_PID"
echo "📊 Server running on port: $USER_PORT"
echo "📝 Logs: coral_server_${USER_ID}.log"

# Wait a moment for server to start
sleep 3

# Check if server is responding
if netstat -tlnp | grep ":$USER_PORT " > /dev/null; then
    echo "🎉 Coral server successfully started for user $USER_ID on port $USER_PORT"
else
    echo "❌ Coral server failed to start properly"
    exit 1
fi
