#!/bin/bash

# Agent Runner Script with Virtual Environment
# This script runs agents in the production virtual environment with proper user context

# Check if required arguments are provided
if [ $# -lt 2 ]; then
    echo "Usage: $0 <user_id> <agent_script>"
    echo "Example: $0 99d3ff50-dcb5-4389-8e76-2ecd626902bc 2_langchain_tweet_scraping_agent_simple.py"
    exit 1
fi

USER_ID="$1"
AGENT_SCRIPT="$2"

echo "🚀 Starting agent with virtual environment..."
echo "👤 User ID: $USER_ID"
echo "🤖 Agent: $AGENT_SCRIPT"

# Navigate to project directory
cd /home/coraluser/Coral_Social_Media

# Check if virtual environment exists
if [ ! -d "coral_env" ]; then
    echo "❌ Virtual environment not found. Please run setup_production_agents.sh first."
    exit 1
fi

# Check if agent script exists
if [ ! -f "$AGENT_SCRIPT" ]; then
    echo "❌ Agent script not found: $AGENT_SCRIPT"
    exit 1
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source coral_env/bin/activate

# Set user context
export AGENT_USER_ID="$USER_ID"

# Load environment variables
if [ -f ".env" ]; then
    echo "📋 Loading environment variables..."
    set -a
    source .env
    set +a
fi

# Verify required environment variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo "❌ Missing required environment variables (SUPABASE_URL, SUPABASE_KEY)"
    exit 1
fi

echo "✅ Environment ready, starting agent..."
echo "📊 Agent will log to database with user context"

# Run the agent with user_id argument
python "$AGENT_SCRIPT" "$USER_ID"

echo "🏁 Agent execution completed"
