## Twitter Authentication Setup

### 1. Authentication Type

MacroBot uses __OAuth 1.0a__ authentication with the Twitter API v2. This requires:

- API Key (Consumer Key)
- API Secret (Consumer Secret)
- Access Token
- Access Token Secret
- Bearer Token (optional but included)

### 2. Environment Variables Required

In your `.env` file, you need these credentials:

```env
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_twitter_access_token_secret
TWITTER_BEARER_TOKEN=your_twitter_bearer_token  # Optional
```

### 3. How Authentication Works

#### Configuration Loading (`config/index.ts`):

```typescript
twitter: {
    apiKey: process.env.TWITTER_API_KEY || '',
    apiSecret: process.env.TWITTER_API_SECRET || '',
    accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
    accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET || '',
    bearerToken: process.env.TWITTER_BEARER_TOKEN || '',
}
```

#### Twitter Client Initialization (`TwitterService.ts`):

```typescript
this.client = new TwitterApi({
    appKey: config.twitter.apiKey,
    appSecret: config.twitter.apiSecret,
    accessToken: config.twitter.accessToken,
    accessSecret: config.twitter.accessTokenSecret,
});
```

### 4. Twitter Developer Setup Steps

To get these credentials for your other app:

1. __Create Twitter Developer Account__

   - Go to [](https://developer.twitter.com)<https://developer.twitter.com>
   - Apply for a developer account if you haven't already

2. __Create a Project and App__

   - In the developer portal, create a new Project
   - Create an App within that project
   - Choose "Production" environment

3. __Configure App Permissions__

   - Go to your App's settings
   - Under "User authentication settings", click "Set up"
   - Set App permissions to __"Read and write"__ (important!)
   - Add callback URL: `https://localhost:3000/callback` (or your app's URL)
   - Add website URL: Your website or `https://example.com`

4. __Generate Credentials__

   - In the "Keys and tokens" section:
   - __Consumer Keys__: Copy the API Key and API Secret
   - __Authentication Tokens__: Generate Access Token and Secret
   - __Important__: After changing permissions to Read+Write, you MUST regenerate the Access Token and Secret

### 5. Common Authentication Issues & Solutions

1. __403 Forbidden Error__

   - Usually means the app doesn't have write permissions
   - Solution: Set app to Read+Write permissions and regenerate tokens

2. __401 Unauthorized Error__

   - Invalid credentials
   - Solution: Double-check all 4 credentials are correct

3. __"Read-only application cannot POST"__

   - Access tokens were generated when app was read-only
   - Solution: Regenerate Access Token after changing to Read+Write

4. __Rate Limiting (429 Error)__

   - MacroBot implements token bucket rate limiting (250 requests/day)
   - Uses smart API call management to avoid hitting limits

### 6. Using twitter-api-v2 Library

MacroBot uses the `twitter-api-v2` npm package. To use it in your app:

```bash
npm install twitter-api-v2
```

Basic usage:

```typescript
import { TwitterApi } from 'twitter-api-v2';

const client = new TwitterApi({
    appKey: 'YOUR_API_KEY',
    appSecret: 'YOUR_API_SECRET',
    accessToken: 'YOUR_ACCESS_TOKEN',
    accessSecret: 'YOUR_ACCESS_TOKEN_SECRET',
});

// Post a tweet
const result = await client.v2.tweet({ text: 'Hello Twitter!' });
```

### 7. Testing Your Configuration

MacroBot includes a test script. You can create similar for your app:

```typescript
// Test Twitter connection
try {
    const me = await client.v2.me();
    console.log('Connected as:', me.data.username);
} catch (error) {
    console.error('Authentication failed:', error);
}
```

Would you like me to help you:

1. Debug specific authentication errors you're facing?
2. Create a simple test script for your other app?
3. Explain how to migrate credentials between apps?
