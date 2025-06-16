# Twitter Posting Agent V2

This is an enhanced version of the Twitter Posting Agent that supports both Twitter API v2 with OAuth 2.0 and Twitter API v1.1 with OAuth 1.0a. It's designed to be more robust and handle the limitations of different Twitter API access tiers.

## Key Features

- **Dual API Support**: Uses Twitter API v2 (preferred) with fallback to v1.1 if needed
- **Multiple Authentication Methods**: Supports both OAuth 2.0 and OAuth 1.0a
- **Automatic Fallback**: If one API or authentication method fails, it tries another
- **Improved Error Handling**: Better logging and retry logic
- **Supabase Integration**: Tracks tweet status in a database

## Setup Instructions

1. Make sure you have a Twitter Developer account with the appropriate access level (Pro tier recommended)
2. Set up your environment variables in the `.env` file:

```
# Twitter/X API
# Option 1: OAuth 2.0 (Recommended for Twitter API v2)
# Generate this token in the Twitter Developer Portal with 'tweet.write' scope
TWITTER_OAUTH2_TOKEN=your_oauth2_user_context_token
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret

# Option 2: OAuth 1.0a (Legacy approach)
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_SECRET=your_twitter_access_secret

# Other required variables
OPENAI_API_KEY=your_openai_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

3. Make sure you have the required Python packages installed:
```
pip install -r requirements.txt
```

## Important Notes

- **No Quotes in .env File**: Do not put quotes around your API keys and tokens in the .env file
- **API Access Tiers**: Different Twitter Developer account tiers have different API access levels
- **OAuth 2.0 vs OAuth 1.0a**: OAuth 2.0 is recommended for Twitter API v2, while OAuth 1.0a is used for v1.1
- **Client Credentials Required**: Even when using OAuth 2.0, you still need to provide your Client ID and Client Secret in the .env file as TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET
- **Separate Credentials**: OAuth 2.0 uses TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET, while OAuth 1.0a uses TWITTER_API_KEY and TWITTER_API_SECRET

## Running the Agent

```
python 7_langchain_twitter_posting_agent_v2.py
```

## Troubleshooting

If you encounter errors:

1. **403 Forbidden Error**: This usually means your Twitter Developer account doesn't have the necessary access level for the API endpoint you're trying to use. Make sure you have a Pro tier account and have set up OAuth 2.0 with the 'tweet.write' scope.
   - Error message like "You currently have access to a subset of X API V2 endpoints..." indicates you need to upgrade your Twitter Developer account access level.
   - Visit the [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard) and check your account status.
   - Make sure you've applied for and been approved for the appropriate access level (Pro tier or higher).
   - Verify that your app has the "Read and Write" permissions enabled.

2. **401 Unauthorized Error**: This indicates an issue with your authentication credentials.
   - Make sure your OAuth 2.0 token is valid and hasn't expired (they expire after 2 hours by default).
   - Regenerate your token using the `generate_twitter_oauth2_token.py` script.
   - Ensure you've authorized your app with the correct scopes (tweet.read, tweet.write, users.read).
   - Check that your Client ID and Client Secret are correctly entered in the .env file.
   - If using OAuth 1.0a, verify that your API Key, API Secret, Access Token, and Access Secret are correct.

3. **Authentication Errors**: Double-check your API keys and tokens in the .env file. Make sure they don't have quotes around them and are correctly copied from the Twitter Developer Portal.

4. **Rate Limiting**: The agent includes built-in rate limit handling, but if you're posting many tweets in a short period, you might still hit limits. The agent will automatically retry with exponential backoff.

5. **Scope Issues**: If you're getting errors about missing permissions, make sure your app has been authorized with the correct scopes. The OAuth 2.0 token needs the following scopes:
   - tweet.read
   - tweet.write
   - users.read
   - offline.access (if you want the token to last longer than 2 hours)

## How It Works

1. The agent first tries to initialize both Twitter API v2 (with OAuth 2.0) and v1.1 (with OAuth 1.0a) clients
2. When posting tweets, it first tries the v2 API
3. If that fails, it falls back to the v1.1 API
4. It includes retry logic with exponential backoff for both APIs
5. It updates the status of tweets in Supabase after posting

## Generating an OAuth 2.0 Token

You can generate an OAuth 2.0 token using the included helper script:

```
python generate_twitter_oauth2_token.py
```

This script will:
1. Ask for your Twitter API Client ID and Client Secret
2. Generate a secure PKCE code verifier and challenge
3. Open a browser window for you to authorize your app with the proper scopes
4. Receive the authorization code via a local callback server
5. Exchange the code for an OAuth 2.0 token using the PKCE code verifier
6. Save the token and credentials to your .env file

Before running the script, make sure you have:
1. A Twitter Developer account with Pro tier access
2. Created a project and app in the Twitter Developer Portal
3. Configured your app with OAuth 2.0 settings:
   - Set the App type to "Web App, Automated App or Bot"
   - Added a callback URL (e.g., http://127.0.0.1:8080/callback)
   - Selected the scopes: tweet.read, tweet.write, users.read
4. Your Client ID and Client Secret from the "Keys and tokens" tab

The script uses the OAuth 2.0 Authorization Code Flow with PKCE (Proof Key for Code Exchange) for enhanced security. This is the recommended approach for obtaining user-context tokens that can perform write operations like posting tweets.

For more detailed instructions on Twitter API setup, see the [TWITTER_API_SETUP.md](TWITTER_API_SETUP.md) file.
