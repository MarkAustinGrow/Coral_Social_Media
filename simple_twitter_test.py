import os
import tweepy
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
dotenv_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=dotenv_path)

def test_oauth2():
    """Test Twitter API v2 with OAuth 2.0 using tweepy directly."""
    print("Testing Twitter API v2 with OAuth 2.0...")
    
    # Get credentials from environment variables
    client_id = os.getenv("TWITTER_CLIENT_ID")
    client_secret = os.getenv("TWITTER_CLIENT_SECRET")
    oauth2_token = os.getenv("TWITTER_OAUTH2_TOKEN")
    
    print(f"Client ID: {client_id[:5]}...")
    print(f"Client Secret: {client_secret[:5]}...")
    print(f"OAuth 2.0 Token: {oauth2_token[:10]}...")
    
    try:
        # Initialize Twitter API v2 client with OAuth 2.0 token
        client = tweepy.Client(
            consumer_key=client_id,
            consumer_secret=client_secret,
            access_token=oauth2_token,
            wait_on_rate_limit=True
        )
        
        # Test API by getting user information
        me = client.get_me()
        print(f"Successfully authenticated with Twitter API v2 as: {me.data.username}")
        return True
    
    except Exception as e:
        print(f"Error testing Twitter API v2: {str(e)}")
        return False

def test_oauth1():
    """Test Twitter API v1.1 with OAuth 1.0a using tweepy directly."""
    print("\nTesting Twitter API v1.1 with OAuth 1.0a...")
    
    # Get credentials from environment variables
    api_key = os.getenv("TWITTER_API_KEY")
    api_secret = os.getenv("TWITTER_API_SECRET")
    access_token = os.getenv("TWITTER_ACCESS_TOKEN")
    access_secret = os.getenv("TWITTER_ACCESS_SECRET")
    
    print(f"API Key: {api_key[:5]}...")
    print(f"API Secret: {api_secret[:5]}...")
    print(f"Access Token: {access_token[:10]}...")
    print(f"Access Secret: {access_secret[:5]}...")
    
    try:
        # Initialize Twitter API v1.1 client
        auth = tweepy.OAuth1UserHandler(
            api_key,
            api_secret,
            access_token,
            access_secret
        )
        api = tweepy.API(auth, wait_on_rate_limit=True)
        
        # Test API by getting user information
        me = api.verify_credentials()
        print(f"Successfully authenticated with Twitter API v1.1 as: {me.screen_name}")
        return True
    
    except Exception as e:
        print(f"Error testing Twitter API v1.1: {str(e)}")
        return False

def test_bearer_token():
    """Test Twitter API v2 with Bearer Token using tweepy directly."""
    print("\nTesting Twitter API v2 with Bearer Token...")
    
    # Get credentials from environment variables
    bearer_token = os.getenv("TWITTER_BEARER_TOKEN")
    
    print(f"Bearer Token: {bearer_token[:10]}...")
    
    try:
        # Initialize Twitter API v2 client with Bearer Token
        client = tweepy.Client(
            bearer_token=bearer_token,
            wait_on_rate_limit=True
        )
        
        # Test API by getting a user's information (read-only)
        user = client.get_user(username="twitter")
        print(f"Successfully authenticated with Twitter API v2 using Bearer Token")
        print(f"User data: {user.data}")
        if user.data:
            print(f"Retrieved user ID: {user.data.id}")
            return True
        else:
            print("User data is None")
            return False
    
    except Exception as e:
        print(f"Error testing Twitter API v2 with Bearer Token: {str(e)}")
        return False

if __name__ == "__main__":
    print("=== Simple Twitter API Test ===\n")
    
    # Test OAuth 2.0
    oauth2_success = test_oauth2()
    
    # Test OAuth 1.0a
    oauth1_success = test_oauth1()
    
    # Test Bearer Token
    bearer_success = test_bearer_token()
    
    # Print summary
    print("\n=== Test Summary ===")
    print(f"OAuth 2.0: {'SUCCESS' if oauth2_success else 'FAILED'}")
    print(f"OAuth 1.0a: {'SUCCESS' if oauth1_success else 'FAILED'}")
    print(f"Bearer Token: {'SUCCESS' if bearer_success else 'FAILED'}")
    
    if not oauth2_success and not oauth1_success and not bearer_success:
        print("\nAll tests failed. Please check your credentials and try again.")
    else:
        print("\nAt least one authentication method succeeded.")
