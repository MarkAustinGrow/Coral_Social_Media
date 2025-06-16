#!/usr/bin/env python
"""
Twitter OAuth 2.0 Test Script

This script tests different ways of using an OAuth 2.0 token with the Twitter API.
"""

import os
import sys
import logging
import tweepy
from dotenv import load_dotenv
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Load environment variables
dotenv_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=dotenv_path)

def test_as_bearer_token():
    """Test using the OAuth 2.0 token as a bearer token."""
    logger.info("Testing OAuth 2.0 token as bearer token...")
    
    oauth2_token = os.getenv("TWITTER_OAUTH2_TOKEN")
    if not oauth2_token:
        logger.error("TWITTER_OAUTH2_TOKEN not found in .env file")
        return False
    
    try:
        # Initialize client with OAuth 2.0 token as bearer token
        client = tweepy.Client(
            bearer_token=oauth2_token,
            wait_on_rate_limit=True
        )
        
        # Test API by getting a user's information (read-only)
        user = client.get_user(username="twitter")
        if user and user.data:
            logger.info(f"Successfully retrieved user: {user.data.username}")
            return True
        else:
            logger.error("Failed to retrieve user information")
            return False
    
    except Exception as e:
        logger.error(f"Error testing OAuth 2.0 token as bearer token: {str(e)}")
        return False

def test_as_access_token():
    """Test using the OAuth 2.0 token as an access token."""
    logger.info("Testing OAuth 2.0 token as access token...")
    
    oauth2_token = os.getenv("TWITTER_OAUTH2_TOKEN")
    client_id = os.getenv("TWITTER_CLIENT_ID")
    client_secret = os.getenv("TWITTER_CLIENT_SECRET")
    
    if not oauth2_token or not client_id or not client_secret:
        logger.error("One or more required credentials not found in .env file")
        return False
    
    try:
        # Initialize client with OAuth 2.0 token as access token
        client = tweepy.Client(
            consumer_key=client_id,
            consumer_secret=client_secret,
            access_token=oauth2_token,
            wait_on_rate_limit=True
        )
        
        # Test API by getting authenticated user's information
        me = client.get_me()
        if me and me.data:
            logger.info(f"Successfully authenticated as: {me.data.username}")
            return True
        else:
            logger.error("Failed to get authenticated user information")
            return False
    
    except Exception as e:
        logger.error(f"Error testing OAuth 2.0 token as access token: {str(e)}")
        return False

def test_with_access_token_secret():
    """Test using the OAuth 2.0 token with an access token secret."""
    logger.info("Testing OAuth 2.0 token with access token secret...")
    
    oauth2_token = os.getenv("TWITTER_OAUTH2_TOKEN")
    client_id = os.getenv("TWITTER_CLIENT_ID")
    client_secret = os.getenv("TWITTER_CLIENT_SECRET")
    
    if not oauth2_token or not client_id or not client_secret:
        logger.error("One or more required credentials not found in .env file")
        return False
    
    try:
        # Initialize client with OAuth 2.0 token as access token and client secret as access token secret
        client = tweepy.Client(
            consumer_key=client_id,
            consumer_secret=client_secret,
            access_token=oauth2_token,
            access_token_secret=client_secret,  # Using client secret as access token secret
            wait_on_rate_limit=True
        )
        
        # Test API by getting authenticated user's information
        me = client.get_me()
        if me and me.data:
            logger.info(f"Successfully authenticated as: {me.data.username}")
            return True
        else:
            logger.error("Failed to get authenticated user information")
            return False
    
    except Exception as e:
        logger.error(f"Error testing OAuth 2.0 token with access token secret: {str(e)}")
        return False

def test_with_bearer_token_auth():
    """Test using the OAuth 2.0 token with BearerTokenAuth."""
    logger.info("Testing OAuth 2.0 token with BearerTokenAuth...")
    
    oauth2_token = os.getenv("TWITTER_OAUTH2_TOKEN")
    if not oauth2_token:
        logger.error("TWITTER_OAUTH2_TOKEN not found in .env file")
        return False
    
    try:
        # Initialize client with OAuth 2.0 token using BearerTokenAuth
        auth = tweepy.OAuth2BearerHandler(oauth2_token)
        api = tweepy.API(auth, wait_on_rate_limit=True)
        
        # Test API by getting a user's information (read-only)
        user = api.get_user(screen_name="twitter")
        if user:
            logger.info(f"Successfully retrieved user: {user.screen_name}")
            return True
        else:
            logger.error("Failed to retrieve user information")
            return False
    
    except Exception as e:
        logger.error(f"Error testing OAuth 2.0 token with BearerTokenAuth: {str(e)}")
        return False

def test_with_app_only_auth():
    """Test using app-only authentication with client credentials."""
    logger.info("Testing app-only authentication with client credentials...")
    
    client_id = os.getenv("TWITTER_CLIENT_ID")
    client_secret = os.getenv("TWITTER_CLIENT_SECRET")
    
    if not client_id or not client_secret:
        logger.error("TWITTER_CLIENT_ID or TWITTER_CLIENT_SECRET not found in .env file")
        return False
    
    try:
        # Initialize client with app-only authentication
        auth = tweepy.AppAuthHandler(client_id, client_secret)
        api = tweepy.API(auth, wait_on_rate_limit=True)
        
        # Test API by getting a user's information (read-only)
        user = api.get_user(screen_name="twitter")
        if user:
            logger.info(f"Successfully retrieved user: {user.screen_name}")
            return True
        else:
            logger.error("Failed to retrieve user information")
            return False
    
    except Exception as e:
        logger.error(f"Error testing app-only authentication: {str(e)}")
        return False

def test_with_bearer_token_from_env():
    """Test using the bearer token from the environment."""
    logger.info("Testing with bearer token from environment...")
    
    bearer_token = os.getenv("TWITTER_BEARER_TOKEN")
    if not bearer_token:
        logger.error("TWITTER_BEARER_TOKEN not found in .env file")
        return False
    
    try:
        # Initialize client with bearer token
        client = tweepy.Client(
            bearer_token=bearer_token,
            wait_on_rate_limit=True
        )
        
        # Test API by getting a user's information (read-only)
        user = client.get_user(username="twitter")
        if user and user.data:
            logger.info(f"Successfully retrieved user: {user.data.username}")
            return True
        else:
            logger.error("Failed to retrieve user information")
            return False
    
    except Exception as e:
        logger.error(f"Error testing with bearer token: {str(e)}")
        return False

def main():
    """Main function to test different OAuth 2.0 authentication methods."""
    logger.info("Starting OAuth 2.0 authentication tests...")
    
    # Test different authentication methods
    bearer_token_success = test_as_bearer_token()
    access_token_success = test_as_access_token()
    access_token_secret_success = test_with_access_token_secret()
    bearer_token_auth_success = test_with_bearer_token_auth()
    app_only_auth_success = test_with_app_only_auth()
    bearer_token_from_env_success = test_with_bearer_token_from_env()
    
    # Print summary
    logger.info("\n=== Test Summary ===")
    logger.info(f"OAuth 2.0 token as bearer token: {'SUCCESS' if bearer_token_success else 'FAILED'}")
    logger.info(f"OAuth 2.0 token as access token: {'SUCCESS' if access_token_success else 'FAILED'}")
    logger.info(f"OAuth 2.0 token with access token secret: {'SUCCESS' if access_token_secret_success else 'FAILED'}")
    logger.info(f"OAuth 2.0 token with BearerTokenAuth: {'SUCCESS' if bearer_token_auth_success else 'FAILED'}")
    logger.info(f"App-only authentication: {'SUCCESS' if app_only_auth_success else 'FAILED'}")
    logger.info(f"Bearer token from environment: {'SUCCESS' if bearer_token_from_env_success else 'FAILED'}")
    
    # Check if any test succeeded
    if any([bearer_token_success, access_token_success, access_token_secret_success, 
            bearer_token_auth_success, app_only_auth_success, bearer_token_from_env_success]):
        logger.info("At least one authentication method succeeded.")
        return 0
    else:
        logger.error("All authentication methods failed.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
