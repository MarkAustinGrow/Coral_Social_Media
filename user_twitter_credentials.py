"""
User-specific Twitter credentials utility for agents.
This module provides functions to retrieve Twitter credentials for specific users.
"""

import os
from typing import Optional, Dict, Any
from supabase import create_client, Client
import tweepy

def get_supabase_client() -> Client:
    """Create and return a Supabase client."""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY environment variables are required")
    
    return create_client(url, key)

def get_user_twitter_credentials(user_id: str) -> Optional[Dict[str, str]]:
    """
    Retrieve Twitter credentials for a specific user.
    
    Args:
        user_id: The user's ID
        
    Returns:
        Dictionary containing Twitter credentials or None if not found
    """
    try:
        supabase = get_supabase_client()
        
        result = supabase.table('user_twitter_credentials').select(
            'api_key, api_secret, access_token, access_token_secret, twitter_username, bearer_token'
        ).eq('user_id', user_id).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
        
        return None
        
    except Exception as e:
        print(f"Error fetching Twitter credentials for user {user_id}: {e}")
        return None

def create_user_twitter_client(user_id: str) -> Optional[tweepy.Client]:
    """
    Create a Twitter API client for a specific user.
    
    Args:
        user_id: The user's ID
        
    Returns:
        Tweepy Client instance or None if credentials not found
    """
    credentials = get_user_twitter_credentials(user_id)
    
    if not credentials:
        print(f"No Twitter credentials found for user {user_id}")
        return None
    
    try:
        client = tweepy.Client(
            consumer_key=credentials['api_key'],
            consumer_secret=credentials['api_secret'],
            access_token=credentials['access_token'],
            access_token_secret=credentials['access_token_secret'],
            wait_on_rate_limit=True
        )
        
        return client
        
    except Exception as e:
        print(f"Error creating Twitter client for user {user_id}: {e}")
        return None

def create_user_twitter_api(user_id: str) -> Optional[tweepy.API]:
    """
    Create a Twitter API v1.1 instance for a specific user.
    
    Args:
        user_id: The user's ID
        
    Returns:
        Tweepy API instance or None if credentials not found
    """
    credentials = get_user_twitter_credentials(user_id)
    
    if not credentials:
        print(f"No Twitter credentials found for user {user_id}")
        return None
    
    try:
        auth = tweepy.OAuthHandler(
            credentials['api_key'],
            credentials['api_secret']
        )
        auth.set_access_token(
            credentials['access_token'],
            credentials['access_token_secret']
        )
        
        api = tweepy.API(auth, wait_on_rate_limit=True)
        
        return api
        
    except Exception as e:
        print(f"Error creating Twitter API for user {user_id}: {e}")
        return None

def has_user_twitter_credentials(user_id: str) -> bool:
    """
    Check if a user has Twitter credentials configured.
    
    Args:
        user_id: The user's ID
        
    Returns:
        True if credentials exist, False otherwise
    """
    try:
        supabase = get_supabase_client()
        
        result = supabase.table('user_twitter_credentials').select('id').eq('user_id', user_id).execute()
        
        return len(result.data) > 0
        
    except Exception as e:
        print(f"Error checking Twitter credentials for user {user_id}: {e}")
        return False

def get_user_twitter_username(user_id: str) -> Optional[str]:
    """
    Get the Twitter username for a specific user.
    
    Args:
        user_id: The user's ID
        
    Returns:
        Twitter username or None if not found
    """
    credentials = get_user_twitter_credentials(user_id)
    
    if credentials:
        return credentials.get('twitter_username')
    
    return None

# Example usage for agents:
def example_agent_usage():
    """
    Example of how agents should use this module.
    """
    # Get user ID from environment or agent context
    user_id = os.environ.get('USER_ID')
    
    if not user_id:
        print("No user ID provided")
        return
    
    # Check if user has Twitter credentials
    if not has_user_twitter_credentials(user_id):
        print(f"User {user_id} has not configured Twitter credentials")
        return
    
    # Create Twitter client for the user
    twitter_client = create_user_twitter_client(user_id)
    
    if twitter_client:
        try:
            # Example: Get user's own Twitter info
            me = twitter_client.get_me()
            print(f"Connected to Twitter as: @{me.data.username}")
            
            # Example: Post a tweet
            # tweet = twitter_client.create_tweet(text="Hello from 8 Interns!")
            # print(f"Posted tweet: {tweet.data.id}")
            
        except Exception as e:
            print(f"Error using Twitter API: {e}")
    else:
        print("Failed to create Twitter client")

if __name__ == "__main__":
    example_agent_usage()
