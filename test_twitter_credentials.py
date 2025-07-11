#!/usr/bin/env python3
"""
Twitter Credentials Test Script
==============================

This script tests the Twitter API credentials stored in the Supabase database
for user 3b55275a-d666-4724-ae39-26a58fda3aff (@0xMaxMacro).

It will:
1. Connect to the Supabase database
2. Retrieve the Twitter credentials for the specified user
3. Test the credentials against Twitter's API
4. Provide detailed diagnostic information

Usage:
    python test_twitter_credentials.py

Requirements:
    pip install supabase tweepy python-dotenv
"""

import os
import sys
from typing import Dict, Optional, Any
import json
from datetime import datetime

try:
    from supabase import create_client, Client
    import tweepy
    from dotenv import load_dotenv
except ImportError as e:
    print(f"❌ Missing required package: {e}")
    print("Please install required packages:")
    print("pip install supabase tweepy python-dotenv")
    sys.exit(1)

# Load environment variables from the main project directory
load_dotenv()
# Also try to load from the main Coral Social Media project
load_dotenv("E:/8interns/Coral_Social_Media/.env")

# Configuration
USER_ID = "3b55275a-d666-4724-ae39-26a58fda3aff"
EXPECTED_TWITTER_USERNAME = "0xMaxMacro"

class TwitterCredentialTester:
    def __init__(self):
        self.supabase_url = None
        self.supabase_key = None
        self.supabase_client = None
        self.credentials = None
        
    def setup_supabase(self) -> bool:
        """Setup Supabase connection"""
        print("🔧 Setting up Supabase connection...")
        
        # Try to get Supabase credentials from environment
        self.supabase_url = os.getenv('SUPABASE_URL')
        # Use service role key for direct table access to user_twitter_credentials
        self.supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY') or os.getenv('SUPABASE_ANON_KEY')
        
        if not self.supabase_url or not self.supabase_key:
            print("❌ Supabase credentials not found in environment variables")
            print("Please set SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_KEY)")
            print("\nYou can create a .env file with:")
            print("SUPABASE_URL=your_supabase_url")
            print("SUPABASE_ANON_KEY=your_supabase_anon_key")
            return False
            
        try:
            self.supabase_client = create_client(self.supabase_url, self.supabase_key)
            print(f"✅ Connected to Supabase: {self.supabase_url}")
            return True
        except Exception as e:
            print(f"❌ Failed to connect to Supabase: {e}")
            return False
    
    def retrieve_credentials(self) -> bool:
        """Retrieve Twitter credentials from database"""
        print(f"\n🔍 Retrieving Twitter credentials for user: {USER_ID}")
        
        try:
            # Query the user_twitter_credentials table
            response = self.supabase_client.table('user_twitter_credentials').select(
                'api_key, api_secret, access_token, access_token_secret, twitter_username'
            ).eq('user_id', USER_ID).execute()
            
            if not response.data:
                print(f"❌ No Twitter credentials found for user {USER_ID}")
                print("The user may not have set up Twitter credentials yet.")
                return False
                
            self.credentials = response.data[0]
            
            # Verify we have all required fields
            required_fields = ['api_key', 'api_secret', 'access_token', 'access_token_secret', 'twitter_username']
            missing_fields = []
            
            for field in required_fields:
                if not self.credentials.get(field):
                    missing_fields.append(field)
            
            if missing_fields:
                print(f"❌ Missing required credential fields: {missing_fields}")
                return False
            
            print(f"✅ Retrieved credentials for Twitter user: @{self.credentials['twitter_username']}")
            
            # Verify the Twitter username matches expected
            if self.credentials['twitter_username'] != EXPECTED_TWITTER_USERNAME:
                print(f"⚠️  Warning: Expected @{EXPECTED_TWITTER_USERNAME}, got @{self.credentials['twitter_username']}")
            
            # Show credential info (without exposing sensitive data)
            print(f"📋 Credential Summary:")
            print(f"   - API Key: {self.credentials['api_key'][:8]}...")
            print(f"   - API Secret: {self.credentials['api_secret'][:8]}...")
            print(f"   - Access Token: {self.credentials['access_token'][:8]}...")
            print(f"   - Access Token Secret: {self.credentials['access_token_secret'][:8]}...")
            print(f"   - Twitter Username: @{self.credentials['twitter_username']}")
            
            return True
            
        except Exception as e:
            print(f"❌ Database error: {e}")
            return False
    
    def test_twitter_api(self) -> bool:
        """Test Twitter API authentication"""
        print(f"\n🐦 Testing Twitter API authentication...")
        
        try:
            # Create OAuth 1.0a handler
            auth = tweepy.OAuth1UserHandler(
                consumer_key=self.credentials['api_key'],
                consumer_secret=self.credentials['api_secret'],
                access_token=self.credentials['access_token'],
                access_token_secret=self.credentials['access_token_secret']
            )
            
            # Create API client
            api = tweepy.API(auth, wait_on_rate_limit=True)
            
            print("🔐 Testing credential verification...")
            
            # Test 1: Verify credentials
            try:
                user = api.verify_credentials()
                print(f"✅ Authentication successful!")
                print(f"   - Authenticated as: @{user.screen_name}")
                print(f"   - User ID: {user.id}")
                print(f"   - Account created: {user.created_at}")
                print(f"   - Followers: {user.followers_count:,}")
                print(f"   - Following: {user.friends_count:,}")
                print(f"   - Tweets: {user.statuses_count:,}")
                
                # Verify the authenticated user matches expected
                if user.screen_name.lower() != EXPECTED_TWITTER_USERNAME.lower():
                    print(f"⚠️  Warning: Authenticated as @{user.screen_name}, expected @{EXPECTED_TWITTER_USERNAME}")
                
            except tweepy.Unauthorized as e:
                print(f"❌ 401 Unauthorized: {e}")
                print("This indicates invalid credentials or revoked access.")
                return False
                
            except tweepy.Forbidden as e:
                print(f"❌ 403 Forbidden: {e}")
                print("This indicates the app doesn't have permission for this operation.")
                return False
                
            except Exception as e:
                print(f"❌ API Error: {e}")
                return False
            
            # Test 2: Check rate limits
            print(f"\n📊 Checking rate limits...")
            try:
                rate_limits = api.get_rate_limit_status()
                
                # Check specific endpoints we care about
                endpoints_to_check = [
                    '/statuses/user_timeline',
                    '/users/show',
                    '/application/rate_limit_status'
                ]
                
                for endpoint in endpoints_to_check:
                    if endpoint in rate_limits['resources'].get('statuses', {}):
                        limit_info = rate_limits['resources']['statuses'][endpoint]
                        print(f"   - {endpoint}: {limit_info['remaining']}/{limit_info['limit']} remaining")
                    elif endpoint in rate_limits['resources'].get('users', {}):
                        limit_info = rate_limits['resources']['users'][endpoint]
                        print(f"   - {endpoint}: {limit_info['remaining']}/{limit_info['limit']} remaining")
                    elif endpoint in rate_limits['resources'].get('application', {}):
                        limit_info = rate_limits['resources']['application'][endpoint]
                        print(f"   - {endpoint}: {limit_info['remaining']}/{limit_info['limit']} remaining")
                
            except Exception as e:
                print(f"⚠️  Could not check rate limits: {e}")
            
            # Test 3: Try to fetch a few tweets from a public account
            print(f"\n📱 Testing tweet fetching...")
            try:
                # Try to fetch tweets from a well-known public account
                tweets = api.user_timeline(screen_name='Twitter', count=5, tweet_mode='extended')
                print(f"✅ Successfully fetched {len(tweets)} tweets from @Twitter")
                
                if tweets:
                    latest_tweet = tweets[0]
                    print(f"   - Latest tweet: {latest_tweet.full_text[:100]}...")
                    print(f"   - Posted: {latest_tweet.created_at}")
                
            except Exception as e:
                print(f"⚠️  Could not fetch test tweets: {e}")
                print("This might indicate limited API permissions.")
            
            return True
            
        except Exception as e:
            print(f"❌ Failed to create Twitter API client: {e}")
            return False
    
    def run_full_test(self) -> bool:
        """Run the complete credential test"""
        print("🚀 Twitter Credential Test Starting...")
        print(f"📅 Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)
        
        # Step 1: Setup Supabase
        if not self.setup_supabase():
            return False
        
        # Step 2: Retrieve credentials
        if not self.retrieve_credentials():
            return False
        
        # Step 3: Test Twitter API
        if not self.test_twitter_api():
            return False
        
        print("\n" + "=" * 60)
        print("✅ All tests passed! Twitter credentials are working correctly.")
        print("\nIf the agent is still getting 401 errors, the issue may be:")
        print("1. Different credentials being used in production")
        print("2. Network/firewall issues on the server")
        print("3. Implementation differences in the agent code")
        
        return True

def main():
    """Main function"""
    tester = TwitterCredentialTester()
    
    try:
        success = tester.run_full_test()
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print("\n\n⏹️  Test interrupted by user")
        sys.exit(1)
        
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
