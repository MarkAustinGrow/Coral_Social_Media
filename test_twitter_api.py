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

def test_oauth2_v2():
    """Test Twitter API v2 with OAuth 2.0"""
    logger.info("Testing Twitter API v2 with OAuth 2.0...")
    
    # Check if OAuth 2.0 token is available
    oauth2_token = os.getenv("TWITTER_OAUTH2_TOKEN")
    if not oauth2_token:
        logger.warning("TWITTER_OAUTH2_TOKEN not found in .env file")
        return False
    
    # Check if client credentials are available
    client_id = os.getenv("TWITTER_CLIENT_ID")
    client_secret = os.getenv("TWITTER_CLIENT_SECRET")
    
    if not client_id or not client_secret:
        logger.warning("TWITTER_CLIENT_ID or TWITTER_CLIENT_SECRET not found in .env file")
        logger.warning("These are required for OAuth 2.0 authentication with Twitter API v2")
        return False
    
    logger.info(f"Using OAuth 2.0 token: {oauth2_token[:10]}...")
    logger.info(f"Using Client ID: {client_id[:5]}...")
    
    try:
        # Initialize Twitter API v2 client with OAuth 2.0 token
        # For OAuth 2.0 User Context tokens, we need to use it as access_token, not bearer_token
        # bearer_token is for app-only auth, while access_token is for user context auth
        client = tweepy.Client(
            consumer_key=client_id,
            consumer_secret=client_secret,
            access_token=oauth2_token,
            wait_on_rate_limit=True
        )
        
        # Test API by getting user information
        me = client.get_me()
        if not me or not me.data:
            logger.error("Failed to get user information. API returned empty response.")
            return False
            
        logger.info(f"Successfully authenticated with Twitter API v2 as: {me.data.username}")
        
        # Test posting a tweet if --post flag is provided
        if "--post" in sys.argv:
            tweet = client.create_tweet(text="This is a test tweet from the Twitter API v2 test script. #testing")
            logger.info(f"Successfully posted a test tweet with ID: {tweet.data['id']}")
        
        return True
    
    except Exception as e:
        logger.error(f"Error testing Twitter API v2: {str(e)}")
        logger.error("This could be due to:")
        logger.error("1. Invalid OAuth 2.0 token (try regenerating with generate_twitter_oauth2_token.py)")
        logger.error("2. Incorrect Client ID or Client Secret")
        logger.error("3. Missing required scopes (tweet.read, tweet.write, users.read)")
        return False

def test_oauth1_v1():
    """Test Twitter API v1.1 with OAuth 1.0a"""
    logger.info("Testing Twitter API v1.1 with OAuth 1.0a...")
    
    # Check if OAuth 1.0a credentials are available
    if not all([
        os.getenv("TWITTER_API_KEY"),
        os.getenv("TWITTER_API_SECRET"),
        os.getenv("TWITTER_ACCESS_TOKEN"),
        os.getenv("TWITTER_ACCESS_SECRET")
    ]):
        logger.warning("One or more OAuth 1.0a credentials not found in .env file")
        return False
    
    try:
        # Initialize Twitter API v1.1 client
        auth = tweepy.OAuth1UserHandler(
            os.getenv("TWITTER_API_KEY"),
            os.getenv("TWITTER_API_SECRET"),
            os.getenv("TWITTER_ACCESS_TOKEN"),
            os.getenv("TWITTER_ACCESS_SECRET")
        )
        api = tweepy.API(auth, wait_on_rate_limit=True)
        
        # Test API by getting user information
        me = api.verify_credentials()
        logger.info(f"Successfully authenticated with Twitter API v1.1 as: {me.screen_name}")
        
        # Test posting a tweet if --post flag is provided
        if "--post" in sys.argv:
            tweet = api.update_status(status="This is a test tweet from the Twitter API v1.1 test script. #testing")
            logger.info(f"Successfully posted a test tweet with ID: {tweet.id_str}")
        
        return True
    
    except Exception as e:
        logger.error(f"Error testing Twitter API v1.1: {str(e)}")
        return False

def main():
    """Main function to test Twitter API credentials"""
    logger.info("Starting Twitter API credentials test...")
    
    # Check for quotes in environment variables
    for key in ["TWITTER_API_KEY", "TWITTER_API_SECRET", "TWITTER_ACCESS_TOKEN", "TWITTER_ACCESS_SECRET", "TWITTER_OAUTH2_TOKEN"]:
        value = os.getenv(key)
        if value and (value.startswith('"') or value.startswith("'")):
            logger.warning(f"WARNING: {key} has quotes around it in your .env file. This may cause authentication issues.")
    
    # Test OAuth 2.0 with Twitter API v2
    v2_success = test_oauth2_v2()
    
    # Test OAuth 1.0a with Twitter API v1.1
    v1_success = test_oauth1_v1()
    
    # Print summary
    logger.info("\n--- Test Summary ---")
    logger.info(f"Twitter API v2 with OAuth 2.0: {'SUCCESS' if v2_success else 'FAILED'}")
    logger.info(f"Twitter API v1.1 with OAuth 1.0a: {'SUCCESS' if v1_success else 'FAILED'}")
    
    if not v2_success and not v1_success:
        logger.error("All tests failed. Please check your credentials and try again.")
        return 1
    
    logger.info("At least one authentication method succeeded.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
