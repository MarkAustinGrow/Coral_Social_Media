# Twitter API Setup Guide

This guide will help you set up your Twitter API credentials for the Twitter Posting Agent. There are three authentication methods supported:

1. **OAuth 2.0 User Context** (Recommended for posting tweets)
2. **OAuth 2.0 Application-Only** (For read-only operations)
3. **OAuth 1.0a User Context** (Legacy)

## Important Note About Authentication Types

Different Twitter API endpoints require different types of authentication:

- **For posting tweets**: You must use either OAuth 2.0 User Context or OAuth 1.0a User Context
- **For read-only operations**: You can use OAuth 2.0 Application-Only (Bearer Token)

The error message "Unsupported Authentication" occurs when you try to use Application-Only authentication for endpoints that require User Context authentication.

## OAuth 2.0 User Context (Recommended for posting tweets)

OAuth 2.0 User Context is the modern authentication method recommended by Twitter for API v2 when you need to perform actions on behalf of a user, such as posting tweets. It provides better security and is simpler to implement than OAuth 1.0a.

### Step 1: Create a Twitter Developer Account

1. Go to [developer.twitter.com](https://developer.twitter.com/) and sign in with your Twitter account
2. Apply for a developer account if you don't already have one
3. Create a new project and app in the Developer Portal

### Step 2: Configure Your App

1. In the Developer Portal, navigate to your app's settings
2. Under "User authentication settings", click "Set up"
3. Enable "OAuth 2.0"
4. Set the App type to "Web App, Automated App or Bot"
5. Add a callback URL (e.g., `https://yourwebsite.com/callback` or `http://localhost:3000/callback` for testing)
6. Add a website URL (your website or GitHub repository)
7. Select the following scopes:
   - `tweet.read` (to read tweets)
   - `tweet.write` (to post tweets)
   - `users.read` (to read user information)
8. Save your changes

### Step 3: Generate OAuth 2.0 User Context Token

1. In your app's settings, go to the "Keys and tokens" tab
2. Under "OAuth 2.0 Client ID and Client Secret", note down your Client ID and Client Secret
3. Use these credentials to generate an OAuth 2.0 token with the required scopes

#### Option A: Using the Twitter API Playground

1. Go to the [Twitter API Playground](https://oauth-playground.glitch.me/)
2. Enter your Client ID and Client Secret
3. Select the scopes: `tweet.read`, `tweet.write`, `users.read`
4. Click "Generate Token"
5. Follow the authorization flow
6. Copy the generated access token

#### Option B: Using the Authorization Code Flow

If you're building a web application, you can implement the OAuth 2.0 Authorization Code flow:

```
https://twitter.com/i/oauth2/authorize?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_CALLBACK_URL&scope=tweet.read%20tweet.write%20users.read&state=state&code_challenge=challenge&code_challenge_method=plain
```

After the user authorizes your app, exchange the authorization code for an access token:

```bash
curl -X POST "https://api.twitter.com/2/oauth2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Authorization: Basic BASE64_ENCODED_CLIENT_ID_CLIENT_SECRET" \
  -d "code=AUTHORIZATION_CODE&grant_type=authorization_code&redirect_uri=YOUR_CALLBACK_URL&code_verifier=challenge"
```

### Step 4: Update Your .env File

Add your OAuth 2.0 User Context token to your `.env` file:

```
TWITTER_OAUTH2_TOKEN=your_oauth2_user_context_token
```

## OAuth 2.0 Application-Only (For read-only operations)

OAuth 2.0 Application-Only authentication is used for making API requests on behalf of your application rather than a specific user. This authentication method is limited to read-only endpoints and cannot be used for posting tweets.

### Step 1: Create a Twitter Developer Account

Follow the same steps as for OAuth 2.0 User Context to create a developer account and app.

### Step 2: Obtain a Bearer Token

1. Encode your consumer key and consumer secret according to RFC 1738
   - Format: `{consumer_key}:{consumer_secret}`
   - URL encode this string
   - Base64 encode the result

2. Make a POST request to obtain the Bearer Token:
   ```bash
   curl -X POST "https://api.twitter.com/oauth2/token" \
     -H "Authorization: Basic YOUR_BASE64_ENCODED_CREDENTIALS" \
     -H "Content-Type: application/x-www-form-urlencoded;charset=UTF-8" \
     -d "grant_type=client_credentials"
   ```

3. The response will contain your Bearer Token:
   ```json
   {
     "token_type": "bearer",
     "access_token": "YOUR_BEARER_TOKEN"
   }
   ```

### Step 3: Update Your .env File

Add your Bearer Token to your `.env` file:

```
TWITTER_BEARER_TOKEN=your_bearer_token
```

### Limitations of Application-Only Authentication

Application-Only authentication can only be used for read-only operations such as:
- Searching tweets
- Retrieving user profiles
- Accessing public lists

It cannot be used for operations that require user context, such as:
- Posting tweets
- Sending direct messages
- Accessing user-specific data

## OAuth 1.0a User Context (Legacy)

If you prefer to use OAuth 1.0a or need it for compatibility reasons, follow these steps:

### Step 1: Create a Twitter Developer Account

Follow the same steps as for OAuth 2.0 to create a developer account and app.

### Step 2: Configure Your App

1. In the Developer Portal, navigate to your app's settings
2. Under "App permissions", select "Read and write and Direct message"
3. Save your changes

### Step 3: Generate OAuth 1.0a Tokens

1. In your app's settings, go to the "Keys and tokens" tab
2. Under "Consumer Keys", note down your API Key and API Key Secret
3. Under "Authentication Tokens", generate an Access Token and Access Token Secret for your account
4. Make sure these tokens have read and write permissions

### Step 4: Update Your .env File

Add your OAuth 1.0a credentials to your `.env` file:

```
TWITTER_BEARER_TOKEN=your_twitter_bearer_token
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_SECRET=your_twitter_access_secret
```

## Troubleshooting

### 401 Unauthorized Error

If you receive a 401 Unauthorized error when trying to post tweets:

1. Check that your tokens have the correct permissions (read and write)
2. Verify that your tokens haven't expired (OAuth 2.0 tokens expire after 2 hours by default)
3. Regenerate your tokens using the `generate_twitter_oauth2_token.py` script
4. Make sure you're using the correct authentication method (OAuth 2.0 User Context or OAuth 1.0a User Context)
5. Verify that your Client ID and Client Secret (for OAuth 2.0) or API Key and API Secret (for OAuth 1.0a) are correct
6. Check that you're not using quotes around your tokens in the .env file

### 403 Forbidden Error with "Unsupported Authentication"

If you receive a 403 Forbidden error with a message about unsupported authentication:

```
"Unsupported Authentication: Authenticating with OAuth 2.0 Application-Only is forbidden for this endpoint. Supported authentication types are [OAuth 1.0a User Context, OAuth 2.0 User Context]."
```

This means you're trying to use an Application-Only Bearer Token for an endpoint that requires User Context authentication. To fix this:

1. Make sure you're using OAuth 2.0 User Context or OAuth 1.0a User Context for posting tweets
2. Application-Only Bearer Tokens can only be used for read-only operations
3. Update your code to use the appropriate authentication method for the endpoint you're calling

### 403 Forbidden Error with "Access to endpoint is limited"

If you receive a 403 Forbidden error with a message like:

```
"You currently have access to a subset of X API V2 endpoints and limited v1.1 endpoints (e.g. media post, oauth) only. If you need access to this endpoint, you may need a different access level."
```

This means your Twitter Developer account doesn't have the necessary access level for the endpoint you're trying to use. To fix this:

1. **Check your access level**: Log in to the [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard) and check your account status.
2. **Apply for elevated access**: If you're on the Essential tier, you'll need to apply for the Pro tier or higher to access more endpoints.
3. **Wait for approval**: Twitter may take some time to review and approve your application for elevated access.
4. **Check endpoint requirements**: Some endpoints are only available to certain access levels. Check the [Twitter API documentation](https://developer.twitter.com/en/docs/twitter-api) for details.
5. **Verify app permissions**: Make sure your app has the "Read and Write" permissions enabled in the Developer Portal.

### Access Level Requirements

Twitter API has different access tiers with different capabilities:

1. **Essential (Free)**: Limited access to Twitter API v2 endpoints
   - Read-only access to public data
   - Limited to 500,000 tweets per month
   - No access to post tweets via API

2. **Pro ($100/month)**: Full access to Twitter API v2 endpoints
   - Read and write access
   - Up to 10,000 tweets per month
   - Access to post tweets via API
   - Required for the Twitter Posting Agent

3. **Enterprise**: Custom pricing and capabilities
   - Higher rate limits
   - Dedicated support
   - Custom features

If you're trying to use the Twitter Posting Agent, you'll need at least the Pro tier.

### Network Errors

If you're experiencing network errors:

1. Check your internet connection
2. Verify that you can reach api.twitter.com
3. Check if there are any Twitter API outages
4. The agent includes automatic retry logic with exponential backoff for network errors

## Resources

- [Twitter API Documentation](https://developer.twitter.com/en/docs/twitter-api)
- [Twitter OAuth 2.0 Guide](https://developer.twitter.com/en/docs/authentication/oauth-2-0)
- [Twitter API v2 Endpoints](https://developer.twitter.com/en/docs/twitter-api/data-dictionary/object-model/tweet)
