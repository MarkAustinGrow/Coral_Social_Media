import os
import tweepy
import logging
from dotenv import load_dotenv
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Load environment variables
dotenv_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=dotenv_path)

def test_tweepy_auth():
    """
    Test Tweepy authentication with Twitter API.
    This is a simple test to verify that the credentials work.
    """
    # Check if credentials are available
    if not all([
        os.getenv("TWITTER_API_KEY"),
        os.getenv("TWITTER_API_SECRET"),
        os.getenv("TWITTER_ACCESS_TOKEN"),
        os.getenv("TWITTER_ACCESS_TOKEN_SECRET")
    ]):
        logger.error("Twitter API credentials not found in environment variables")
        logger.error("Please ensure TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, and TWITTER_ACCESS_TOKEN_SECRET are set")
        return False
    
    try:
        # Create Tweepy auth handler
        auth = tweepy.OAuth1UserHandler(
            os.getenv("TWITTER_API_KEY"),
            os.getenv("TWITTER_API_SECRET"),
            os.getenv("TWITTER_ACCESS_TOKEN"),
            os.getenv("TWITTER_ACCESS_TOKEN_SECRET")
        )
        
        # Create Tweepy API client
        api = tweepy.API(auth)
        
        # Verify credentials
        user = api.verify_credentials()
        
        logger.info(f"Authentication successful! Connected as: @{user.screen_name}")
        logger.info(f"User ID: {user.id_str}")
        logger.info(f"Account name: {user.name}")
        logger.info(f"Account created: {user.created_at}")
        logger.info(f"Followers: {user.followers_count}")
        
        # Test posting a tweet (commented out by default)
        # Uncomment to test posting
        """
        test_tweet = api.update_status("This is a test tweet from Tweepy. It will be deleted immediately.")
        logger.info(f"Test tweet posted successfully with ID: {test_tweet.id_str}")
        
        # Delete the test tweet
        api.destroy_status(test_tweet.id)
        logger.info("Test tweet deleted successfully")
        """
        
        return True
        
    except tweepy.TweepyException as e:
        logger.error(f"Authentication failed: {str(e)}")
        
        # Check for specific error types
        error_message = str(e).lower()
        
        if "401" in error_message or "authentication" in error_message:
            logger.error("This appears to be an authentication error. Check your API keys and tokens.")
        elif "403" in error_message or "permission" in error_message:
            logger.error("This appears to be a permissions error. Make sure your app has the right permissions.")
        elif "429" in error_message or "rate limit" in error_message:
            logger.error("You've hit a rate limit. Try again later.")
            
        return False

if __name__ == "__main__":
    logger.info("Testing Tweepy authentication with Twitter API...")
    success = test_tweepy_auth()
    
    if success:
        logger.info("✅ Authentication test passed! Your Twitter credentials are working correctly.")
        logger.info("You can now use the Twitter posting agent with Tweepy.")
    else:
        logger.error("❌ Authentication test failed. Please check your credentials and try again.")
