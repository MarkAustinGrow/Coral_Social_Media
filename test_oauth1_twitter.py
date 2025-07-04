#!/usr/bin/env python3
"""
Simple Twitter OAuth 1.0a Test Script

This script tests Twitter API authentication using OAuth 1.0a credentials
and attempts to post a test tweet. It's designed to match the authentication
approach used in MacroBot's TwitterService.ts.
"""

import os
import sys
import logging
import time
from pathlib import Path
from dotenv import load_dotenv
import tweepy

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Load environment variables
dotenv_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=dotenv_path)

def test_oauth1_authentication():
    """Test Twitter API authentication using OAuth 1.0a"""
    logger.info("Testing Twitter API authentication using OAuth 1.0a...")
    
    # Check if OAuth 1.0a credentials are available
    api_key = os.getenv("TWITTER_API_KEY")
    api_secret = os.getenv("TWITTER_API_SECRET")
    access_token = os.getenv("TWITTER_ACCESS_TOKEN")
    access_secret = os.getenv("TWITTER_ACCESS_SECRET")
    
    if not all([api_key, api_secret, access_token, access_secret]):
        logger.error("One or more OAuth 1.0a credentials not found in .env file")
        logger.error("Please ensure the following variables are set:")
        logger.error("TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET")
        return False
    
    try:
        # Log credential info (first few characters only for security)
        logger.info(f"Using API Key: {api_key[:5]}...")
        logger.info(f"Using Access Token: {access_token[:5]}...")
        
        # Initialize Twitter API v1.1 client with OAuth 1.0a
        auth = tweepy.OAuth1UserHandler(
            api_key,
            api_secret,
            access_token,
            access_secret
        )
        api = tweepy.API(auth, wait_on_rate_limit=True)
        
        # Test API by getting user information
        me = api.verify_credentials()
        logger.info(f"Successfully authenticated with Twitter API v1.1 as: {me.screen_name}")
        
        return True, api, me.screen_name
    
    except Exception as e:
        logger.error(f"Error authenticating with Twitter API: {str(e)}")
        return False, None, None

def post_test_tweet(api, username):
    """Post a test tweet using the authenticated API client"""
    logger.info("Attempting to post a test tweet...")
    
    try:
        # Create a unique test tweet with timestamp to avoid duplicate errors
        timestamp = int(time.time())
        tweet_text = f"This is a test tweet from the OAuth 1.0a test script. Timestamp: {timestamp} #testing"
        
        # Post the tweet
        tweet = api.update_status(status=tweet_text)
        
        logger.info(f"Successfully posted a test tweet with ID: {tweet.id_str}")
        logger.info(f"Tweet URL: https://twitter.com/{username}/status/{tweet.id_str}")
        
        return True, tweet.id_str
    
    except Exception as e:
        logger.error(f"Error posting test tweet: {str(e)}")
        return False, None

def main():
    """Main function to test Twitter API OAuth 1.0a authentication and posting"""
    logger.info("Starting Twitter API OAuth 1.0a test...")
    
    # Test OAuth 1.0a authentication
    auth_success, api, username = test_oauth1_authentication()
    
    if not auth_success:
        logger.error("Authentication failed. Please check your credentials.")
        return 1
    
    # Ask user if they want to post a test tweet
    if "--post" in sys.argv:
        post_success, tweet_id = post_test_tweet(api, username)
        
        if not post_success:
            logger.error("Failed to post test tweet.")
            return 1
        
        logger.info("Test completed successfully!")
    else:
        logger.info("Authentication successful! Run with --post flag to post a test tweet.")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
