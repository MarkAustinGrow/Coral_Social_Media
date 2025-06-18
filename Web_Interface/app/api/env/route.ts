import { NextResponse } from 'next/server';
import { loadEnvFromRoot } from '@/lib/env-loader';

export async function GET() {
  try {
    // Get environment variables
    const envVars = loadEnvFromRoot();
    
    // Debug: Log the keys found in the environment variables
    console.log('Environment variables loaded. Keys found:', Object.keys(envVars));
    
    // Debug: Check if specific keys exist
    console.log('OPENAI_API_KEY exists:', !!envVars['OPENAI_API_KEY']);
    console.log('TWITTER_API_KEY exists:', !!envVars['TWITTER_API_KEY']);
    console.log('SUPABASE_URL exists:', !!envVars['SUPABASE_URL']);
    
    // Create a sanitized version of the environment variables
    // Only include what's needed and mask sensitive values
    const sanitizedEnv = {
      // Supabase
      SUPABASE_URL: envVars['SUPABASE_URL'],
      SUPABASE_KEY: envVars['SUPABASE_KEY'],
      
      // API Keys (masked for security)
      OPENAI_API_KEY: maskApiKey(envVars['OPENAI_API_KEY']),
      TWITTER_CLIENT_ID: maskApiKey(envVars['TWITTER_CLIENT_ID']),
      TWITTER_CLIENT_SECRET: maskApiKey(envVars['TWITTER_CLIENT_SECRET']),
      TWITTER_OAUTH2_TOKEN: maskApiKey(envVars['TWITTER_OAUTH2_TOKEN']),
      TWITTER_API_KEY: maskApiKey(envVars['TWITTER_API_KEY']),
      TWITTER_API_SECRET: maskApiKey(envVars['TWITTER_API_SECRET']),
      TWITTER_ACCESS_TOKEN: maskApiKey(envVars['TWITTER_ACCESS_TOKEN']),
      TWITTER_ACCESS_TOKEN_SECRET: maskApiKey(envVars['TWITTER_ACCESS_TOKEN_SECRET']),
      TWITTER_BEARER_TOKEN: maskApiKey(envVars['TWITTER_BEARER_TOKEN']),
      PERPLEXITY_API_KEY: maskApiKey(envVars['PERPLEXITY_API_KEY']),
      ANTHROPIC_API_KEY: maskApiKey(envVars['ANTHROPIC_API_KEY']),
      WORLD_NEWS_API_KEY: maskApiKey(envVars['WORLD_NEWS_API_KEY']),
      
      // Agent Configuration
      ENABLE_TWEET_SCRAPING: envVars['ENABLE_TWEET_SCRAPING'],
      ENABLE_TWEET_RESEARCH: envVars['ENABLE_TWEET_RESEARCH'],
      ENABLE_BLOG_WRITING: envVars['ENABLE_BLOG_WRITING'],
      ENABLE_BLOG_TO_TWEET: envVars['ENABLE_BLOG_TO_TWEET'],
      ENABLE_X_REPLY: envVars['ENABLE_X_REPLY'],
      ENABLE_TWITTER_POSTING: envVars['ENABLE_TWITTER_POSTING'],
      MAX_CONCURRENT_AGENTS: envVars['MAX_CONCURRENT_AGENTS'],
      ENABLE_AUTO_RESTART: envVars['ENABLE_AUTO_RESTART'],
      
      // Other
      SETUP_COMPLETE: envVars['SETUP_COMPLETE'],
    };
    
    // Debug: Log the sanitized environment
    console.log('Sanitized environment:', {
      OPENAI_API_KEY_LENGTH: sanitizedEnv.OPENAI_API_KEY?.length || 0,
      TWITTER_API_KEY_LENGTH: sanitizedEnv.TWITTER_API_KEY?.length || 0,
      SUPABASE_URL_LENGTH: sanitizedEnv.SUPABASE_URL?.length || 0,
    });
    
    return NextResponse.json(sanitizedEnv);
  } catch (error) {
    console.error('Error fetching environment variables:', error);
    return NextResponse.json(
      { error: 'Failed to fetch environment variables' },
      { status: 500 }
    );
  }
}

// Helper function to mask API keys
function maskApiKey(key?: string): string | undefined {
  // Debug the input
  console.log(`maskApiKey called with key of length: ${key?.length || 0}`);
  
  if (!key) {
    console.log('Key is undefined or empty');
    return undefined;
  }
  
  // Always return something for any key, even if it's just the key itself
  // For very short keys, just return the key with minimal masking
  if (key.length < 8) {
    console.log('Key is very short, returning with minimal masking');
    return key.substring(0, 1) + '•••••';
  }
  
  // For longer keys, show first 2 and last 2 characters
  const firstChars = key.substring(0, 2);
  const lastChars = key.substring(key.length - 2);
  const maskedPortion = '•'.repeat(Math.min(key.length - 4, 20));
  
  const result = `${firstChars}${maskedPortion}${lastChars}`;
  console.log(`Masked key: ${result}, length: ${result.length}`);
  
  return result;
}
