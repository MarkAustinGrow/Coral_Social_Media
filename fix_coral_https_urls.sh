#!/bin/bash

# Fix HTTP to HTTPS URLs in all Coral agent files
# This script updates all agent configurations to use HTTPS instead of HTTP

echo "🔧 Fixing HTTP to HTTPS URLs in Coral agent files..."

# List of active agent files that need to be updated
AGENT_FILES=(
    "2_langchain_tweet_scraping_agent_coral.py"
    "3_langchain_tweet_research_agent_multiuser_coral.py"
    "3.5_langchain_hot_topic_agent_simple_coral.py"
    "4_langchain_blog_writing_agent_coral.py"
    "4_langchain_blog_critique_agent_coral.py"
    "5_langchain_blog_to_tweet_agent_coral.py"
    "6_langchain_x_reply_agent_coral.py"
    "7_langchain_twitter_posting_agent_coral.py"
    "0_langchain_interface_web.py"
    "0_langchain_interface.py"
    "1_langchain_world_news_agent.py"
    "cleanup_stale_interface_agents.py"
)

# Also update non-coral versions for consistency
NON_CORAL_FILES=(
    "2_langchain_tweet_scraping_agent.py"
    "3_langchain_tweet_research_agent_multiuser.py"
    "3.5_langchain_hot_topic_agent_simple.py"
    "4_langchain_blog_writing_agent.py"
    "4_langchain_blog_critique_agent.py"
    "5_langchain_blog_to_tweet_agent.py"
    "6_langchain_x_reply_agent.py"
    "7_langchain_twitter_posting_agent.py"
)

# Function to update URLs in a file
update_file() {
    local file="$1"
    if [ -f "$file" ]; then
        echo "  📝 Updating $file"
        # Replace HTTP with HTTPS for coral.8interns.com
        sed -i 's|http://coral\.8interns\.com|https://coral.8interns.com|g' "$file"
        # Also fix any port references that might exist
        sed -i 's|https://coral\.8interns\.com:5555|https://coral.8interns.com|g' "$file"
        echo "    ✅ Updated $file"
    else
        echo "    ⚠️  File not found: $file"
    fi
}

# Update all coral agent files
echo "🚀 Updating active Coral agent files..."
for file in "${AGENT_FILES[@]}"; do
    update_file "$file"
done

# Update non-coral files for consistency
echo "🔄 Updating non-coral agent files for consistency..."
for file in "${NON_CORAL_FILES[@]}"; do
    update_file "$file"
done

echo ""
echo "✅ All agent files have been updated to use HTTPS!"
echo "🔧 The agents should now connect properly to the Coral Server."
echo ""
echo "Next steps:"
echo "1. Restart any running agents to pick up the new configuration"
echo "2. Test agent connectivity through the web interface"
echo "3. Monitor PM2 logs for successful connections"
