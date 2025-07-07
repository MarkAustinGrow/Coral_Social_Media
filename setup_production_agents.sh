#!/bin/bash

# Production Agent Environment Setup Script
# This script sets up a virtual environment for running agents in production

set -e  # Exit on any error

echo "🚀 Setting up production agent environment..."

# Navigate to project directory
cd /home/coraluser/Coral_Social_Media

# Create virtual environment if it doesn't exist
if [ ! -d "agent_venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv agent_venv
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source agent_venv/bin/activate

# Upgrade pip
echo "⬆️ Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo "📚 Installing Python dependencies..."
pip install -r requirements.txt

# Verify key packages
echo "🔍 Verifying key packages..."
python -c "import langchain_mcp_adapters; print('✅ langchain_mcp_adapters installed')"
python -c "import supabase; print('✅ supabase installed')"
python -c "import tweepy; print('✅ tweepy installed')"
python -c "import agent_multiuser_utils_simple; print('✅ multiuser utils available')"

# Test basic logging functionality
echo "🧪 Testing logging functionality..."
export AGENT_USER_ID="test-user-id"
python -c "
import agent_multiuser_utils_simple as amu
print('User context test:', amu.get_user_context())
print('✅ Multiuser utilities working correctly')
"

echo "🎉 Production agent environment setup complete!"
echo ""
echo "To use the virtual environment:"
echo "  source /home/coraluser/Coral_Social_Media/agent_venv/bin/activate"
echo ""
echo "To run an agent with user context:"
echo "  export AGENT_USER_ID=\"your-user-id\""
echo "  python 2_langchain_tweet_scraping_agent_simple.py"
