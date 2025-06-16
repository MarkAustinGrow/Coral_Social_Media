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
