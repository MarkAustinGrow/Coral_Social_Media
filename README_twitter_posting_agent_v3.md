# Twitter Posting Agent v3

This is an improved version of the Twitter Posting Agent that uses the `requests-oauthlib` library to authenticate with Twitter API v2 using OAuth 1.0a, similar to how the `twitter-api-v2` JavaScript library works.

## Key Improvements

1. **Simplified Authentication**: Uses OAuth 1.0a exclusively, matching the approach used in the MacroBot application
2. **Direct API Access**: Implements direct API calls using `requests` and `requests-oauthlib` instead of relying on the Tweepy abstraction
3. **Better Error Handling**: Provides more detailed error messages and improved logging
4. **Credential Verification**: Verifies credentials at startup by checking the authenticated user

## Prerequisites

Before running the agent, make sure you have the following:

1. Python 3.8+ installed
2. Required Python packages installed:
   ```bash
   pip install -r requirements.txt
   ```
3. Twitter API credentials with **Read and Write permissions** set in your `.env` file:
   ```
   TWITTER_API_KEY=your_twitter_api_key
   TWITTER_API_SECRET=your_twitter_api_secret
   TWITTER_ACCESS_TOKEN=your_twitter_access_token
   TWITTER_ACCESS_SECRET=your_twitter_access_token_secret
   ```

## Testing Authentication

Before running the full agent, you can test your Twitter API authentication using the included test script:

```bash
# Test authentication only
python test_twitter_api_v3.py

# Test authentication and post a test tweet
python test_twitter_api_v3.py --post
```

This will verify that your credentials are working correctly and that you can post tweets.

## Running the Agent

To run the Twitter Posting Agent:

```bash
python 7_langchain_twitter_posting_agent_v3.py
```

The agent will:
1. Connect to the Coral Protocol server
2. Verify Twitter API credentials
3. Wait for mentions from other agents or check for scheduled tweets
4. Post tweets and update their status in Supabase

## Troubleshooting

### Common Issues

1. **Authentication Errors**:
   - Ensure your Twitter API credentials have **Read and Write permissions**
   - If you changed permissions, regenerate your Access Token and Secret
   - Verify credentials using the test script

2. **Rate Limiting**:
   - The agent includes built-in rate limit handling
   - If you encounter rate limit errors, the agent will automatically retry

3. **API Errors**:
   - Check the logs for detailed error messages
   - Verify that your Twitter developer account is in good standing

### Debugging

For more detailed logging, you can modify the logging level in the agent:

```python
# Change this line in 7_langchain_twitter_posting_agent_v3.py
logging.basicConfig(level=logging.DEBUG, format="%(asctime)s - %(levelname)s - %(message)s")
```

## Differences from v2

The main differences between this version and the previous version are:

1. **Authentication Method**: 
   - v2: Uses Tweepy with both OAuth 2.0 and OAuth 1.0a
   - v3: Uses requests-oauthlib with OAuth 1.0a only (matching twitter-api-v2)

2. **API Access**:
   - v2: Uses Tweepy's abstraction layer
   - v3: Makes direct API calls using requests

3. **Error Handling**:
   - v3: Provides more detailed error messages and better logging

4. **Credential Verification**:
   - v3: Verifies credentials at startup by checking the authenticated user

## Credits

This agent is part of the Coral Social Media Infrastructure and uses the Coral Protocol for agent orchestration.

## Proposed Refactoring

After comparing with other agents in the codebase (like the world news agent), we've identified opportunities to refactor the Twitter posting agent to follow a cleaner, more consistent pattern.

### Motivation

The world news agent has a cleaner structure because:
- It uses an external library (`worldnewsapi`) that handles API complexity
- The main file focuses on agent logic, not infrastructure
- Tools are simple and focused on business logic

### Proposed File Structure

```
twitter_client_utils.py  # New file for infrastructure
7_langchain_twitter_posting_agent_v3.py  # Simplified main file
```

### Code Examples

#### 1. Extract Infrastructure to a Separate Module

Create `twitter_client_utils.py`:
```python
# twitter_client_utils.py
from requests_oauthlib import OAuth1
import requests
import time
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class SimpleRateLimiter:
    # ... (move the entire class here)

class TwitterClient:
    # ... (move the entire class here)
```

#### 2. Simplify the Main Agent File

The Twitter posting agent would then look more like:
```python
# 7_langchain_twitter_posting_agent_v3.py
import asyncio
import os
import json
import logging
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain.prompts import ChatPromptTemplate
from langchain.chat_models import init_chat_model
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.tools import tool
from supabase import create_client
from dotenv import load_dotenv
from datetime import datetime
import urllib.parse

# Import our utilities
from twitter_client_utils import TwitterClient

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Configure Twitter client (similar to how world news configures its API)
twitter_client = TwitterClient(
    os.getenv("TWITTER_API_KEY"),
    os.getenv("TWITTER_API_SECRET"),
    os.getenv("TWITTER_ACCESS_TOKEN"),
    os.getenv("TWITTER_ACCESS_TOKEN_SECRET")
)

# Configure Supabase
supabase_client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

# MCP Server configuration
base_url = "http://localhost:5555/devmode/exampleApplication/privkey/session1/sse"
params = {
    "waitForAgents": 2,
    "agentId": "twitter_posting_agent",
    "agentDescription": "You are twitter_posting_agent, responsible for posting scheduled tweets to Twitter"
}
query_string = urllib.parse.urlencode(params)
MCP_SERVER_URL = f"{base_url}?{query_string}"

# Validate API keys
if not os.getenv("OPENAI_API_KEY"):
    raise ValueError("OPENAI_API_KEY is not set in environment variables.")
# ... other validations

# Tools definitions
@tool
def get_scheduled_tweets(limit: int = 10):
    # ... (same implementation)

@tool
def post_tweet(content: str, in_reply_to_id: str = None):
    # ... (same implementation)

# ... rest of the tools

# Agent creation and main loop (same pattern as world news)
```

#### 3. Additional Improvements

##### a. Error Handling Wrapper
```python
def handle_twitter_errors(func):
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            logger.error(f"Error in {func.__name__}: {str(e)}")
            return {"success": False, "error": str(e)}
    return wrapper

@tool
@handle_twitter_errors
def post_tweet(content: str, in_reply_to_id: str = None):
    # Simplified implementation
```

##### b. Configuration Object
```python
class TwitterConfig:
    def __init__(self):
        self.api_key = os.getenv("TWITTER_API_KEY")
        self.api_secret = os.getenv("TWITTER_API_SECRET")
        self.access_token = os.getenv("TWITTER_ACCESS_TOKEN")
        self.access_token_secret = os.getenv("TWITTER_ACCESS_TOKEN_SECRET")
        self.validate()
    
    def validate(self):
        if not all([self.api_key, self.api_secret, self.access_token, self.access_token_secret]):
            raise ValueError("Missing Twitter API credentials")

# Use it like:
twitter_config = TwitterConfig()
twitter_client = TwitterClient.from_config(twitter_config)
```

### Benefits of This Refactoring

- **Cleaner main file**: Focus on agent logic, not infrastructure
- **Reusable components**: The TwitterClient can be used in other agents
- **Easier testing**: Can unit test the client separately
- **Better separation of concerns**: Infrastructure vs business logic
- **More like other agents**: Follows the established pattern in the codebase
