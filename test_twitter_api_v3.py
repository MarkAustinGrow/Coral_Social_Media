#!/usr/bin/env python3
"""
Twitter API v2 Test Script using requests-oauthlib

This script tests Twitter API authentication using OAuth 1.0a credentials
with the requests-oauthlib library, matching the approach used in the
twitter-api-v2 JavaScript library.
"""

import os
import sys
import logging
import time
from pathlib import Path
from dotenv import load_dotenv
import requests
from requests_oauthlib import OAuth1

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Load environment variables
dotenv_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=dotenv_path)

class TwitterApiV2Client:
    """
    A Twitter API v2 client that uses requests-oauthlib to authenticate with OAuth 1.0a,
    similar to how the twitter-api-v2 library works in JavaScript/TypeScript.
    """
    
    def __init__(self, api_key, api_secret, access_token, access_token_secret):
        """
        Initialize the Twitter API v2 client with OAuth 1.0a credentials.
        
        Args:
            api_key: Twitter API key (consumer key)
            api_secret: Twitter API secret (consumer secret)
            access_token: Twitter access token
            access_token_secret: Twitter access token secret
        """
        self.api_key = api_key
        self.api_secret = api_secret
        self.access_token = access_token
        self.access_token_secret = access_token_secret
        
        # Create OAuth1 auth object
        self.auth = OAuth1(
            api_key,
            client_secret=api_secret,
            resource_owner_key=access_token,
            resource_owner_secret=access_token_secret
        )
        
        # Base URLs for Twitter API
        self.api_v2_base_url = "https://api.twitter.com/2"
        self.api_v1_base_url = "https://api.twitter.com/1.1"
        
        logger.info("TwitterApiV2Client initialized with OAuth 1.0a")
    
    def create_tweet(self, text, in_reply_to_tweet_id=None):
        """
        Create a tweet using Twitter API v2.
        
        Args:
            text: The text of the tweet
            in_reply_to_tweet_id: Optional ID of a tweet to reply to
            
        Returns:
            Response from Twitter API
        """
        url = f"{self.api_v2_base_url}/tweets"
        
        # Prepare request payload
        payload = {"text": text}
        if in_reply_to_tweet_id:
            payload["reply"] = {"in_reply_to_tweet_id": in_reply_to_tweet_id}
        
        # Make the request
        response = requests.post(
            url,
            auth=self.auth,
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        # Check for errors
        if response.status_code != 201:
            logger.error(f"Error creating tweet: {response.status_code} - {response.text}")
            raise Exception(f"Error creating tweet: {response.status_code} - {response.text}")
        
        # Parse and return response
        return response.json()
    
    def verify_credentials(self):
        """
        Verify the credentials by getting the authenticated user's account info.
        
        Returns:
            User information
        """
        url = f"{self.api_v2_base_url}/users/me"
        
        response = requests.get(
            url,
            auth=self.auth,
            params={"user.fields": "id,name,username"}
        )
        
        if response.status_code != 200:
            logger.error(f"Error verifying credentials: {response.status_code} - {response.text}")
            raise Exception(f"Error verifying credentials: {response.status_code} - {response.text}")
        
        return response.json()

def test_oauth1_authentication():
    """Test Twitter API authentication using OAuth 1.0a with requests-oauthlib"""
    logger.info("Testing Twitter API authentication using OAuth 1.0a with requests-oauthlib...")
    
    # Check if OAuth 1.0a credentials are available
    api_key = os.getenv("TWITTER_API_KEY")
    api_secret = os.getenv("TWITTER_API_SECRET")
    access_token = os.getenv("TWITTER_ACCESS_TOKEN")
    access_secret = os.getenv("TWITTER_ACCESS_TOKEN_SECRET")
    
    if not all([api_key, api_secret, access_token, access_secret]):
        logger.error("One or more OAuth 1.0a credentials not found in .env file")
        logger.error("Please ensure the following variables are set:")
        logger.error("TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET")
        return False, None, None
    
    try:
        # Log credential info (first few characters only for security)
        logger.info(f"Using API Key: {api_key[:5]}...")
        logger.info(f"Using Access Token: {access_token[:5]}...")
        
        # Initialize Twitter API v2 client with OAuth 1.0a
        client = TwitterApiV2Client(
            api_key,
            api_secret,
            access_token,
            access_secret
        )
        
        # Test API by getting user information
        user_info = client.verify_credentials()
        username = user_info['data']['username']
        logger.info(f"Successfully authenticated with Twitter API v2 as: {username}")
        
        return True, client, username
    
    except Exception as e:
        logger.error(f"Error authenticating with Twitter API: {str(e)}")
        return False, None, None

def post_test_tweet(client, username):
    """Post a test tweet using the authenticated API client"""
    logger.info("Attempting to post a test tweet...")
    
    try:
        # Create a unique test tweet with timestamp to avoid duplicate errors
        timestamp = int(time.time())
        tweet_text = f"This is a test tweet from the OAuth 1.0a test script using requests-oauthlib. Timestamp: {timestamp} #testing"
        
        # Post the tweet
        response = client.create_tweet(tweet_text)
        
        tweet_id = response['data']['id']
        logger.info(f"Successfully posted a test tweet with ID: {tweet_id}")
        logger.info(f"Tweet URL: https://twitter.com/{username}/status/{tweet_id}")
        
        return True, tweet_id
    
    except Exception as e:
        logger.error(f"Error posting test tweet: {str(e)}")
        return False, None

def main():
    """Main function to test Twitter API OAuth 1.0a authentication and posting"""
    logger.info("Starting Twitter API OAuth 1.0a test with requests-oauthlib...")
    
    # Test OAuth 1.0a authentication
    auth_success, client, username = test_oauth1_authentication()
    
    if not auth_success:
        logger.error("Authentication failed. Please check your credentials.")
        return 1
    
    # Ask user if they want to post a test tweet
    if "--post" in sys.argv:
        post_success, tweet_id = post_test_tweet(client, username)
        
        if not post_success:
            logger.error("Failed to post test tweet.")
            return 1
        
        logger.info("Test completed successfully!")
    else:
        logger.info("Authentication successful! Run with --post flag to post a test tweet.")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
