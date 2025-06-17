import os
import json
import logging
import time
import argparse
from supabase import create_client, Client
from dotenv import load_dotenv
import tweepy
from tweepy.errors import TweepyException
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Parse command line arguments
parser = argparse.ArgumentParser(description='Twitter Posting Agent')
parser.add_argument('--tweet_id', type=int, help='ID of the tweet to post')
parser.add_argument('--thread', type=str, choices=['true', 'false'], default='false', help='Whether to post as a thread')
args = parser.parse_args()

# Initialize API clients
try:
    # Twitter API client
    twitter_client = tweepy.Client(
        bearer_token=os.getenv("TWITTER_BEARER_TOKEN"),
        consumer_key=os.getenv("TWITTER_API_KEY"),
        consumer_secret=os.getenv("TWITTER_API_SECRET"),
        access_token=os.getenv("TWITTER_ACCESS_TOKEN"),
        access_token_secret=os.getenv("TWITTER_ACCESS_SECRET")
    )
    
    # Supabase client
    supabase_client = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_KEY")
    )
    
    # Ensure potential_tweets table exists in Supabase
    try:
        # Check if table exists by attempting to select from it
        supabase_client.table("potential_tweets").select("id").limit(1).execute()
        logger.info("Supabase table 'potential_tweets' exists")
    except Exception as e:
        logger.error(f"Error checking potential_tweets table: {str(e)}")
        logger.info("Make sure to run the SQL scripts in supabase_schema.sql")
        raise
        
except Exception as e:
    logger.error(f"Error initializing API clients: {str(e)}")
    raise

# Validate API keys
if not os.getenv("TWITTER_BEARER_TOKEN"):
    raise ValueError("TWITTER_BEARER_TOKEN is not set in environment variables.")
if not os.getenv("TWITTER_API_KEY") or not os.getenv("TWITTER_API_SECRET"):
    raise ValueError("TWITTER_API_KEY or TWITTER_API_SECRET is not set in environment variables.")
if not os.getenv("TWITTER_ACCESS_TOKEN") or not os.getenv("TWITTER_ACCESS_SECRET"):
    raise ValueError("TWITTER_ACCESS_TOKEN or TWITTER_ACCESS_SECRET is not set in environment variables.")
if not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_KEY"):
    raise ValueError("SUPABASE_URL or SUPABASE_KEY is not set in environment variables.")

# Log API version information
logger.info("Using Twitter API v2 with Tweepy Client")

def post_tweet(content, in_reply_to_id=None):
    """
    Post a tweet to Twitter.
    
    Args:
        content: Content of the tweet
        in_reply_to_id: ID of the tweet to reply to (optional)
        
    Returns:
        Dictionary containing the result of the operation
    """
    try:
        # Post the tweet using Twitter API v2
        if in_reply_to_id:
            response = twitter_client.create_tweet(
                text=content,
                in_reply_to_tweet_id=in_reply_to_id
            )
        else:
            response = twitter_client.create_tweet(
                text=content
            )
        
        if response.data:
            return {
                "result": "Tweet posted successfully",
                "tweet_id": response.data.get("id")
            }
        else:
            return {
                "error": "Failed to post tweet",
                "result": None
            }
        
    except TweepyException as e:
        logger.error(f"Twitter API error: {str(e)}")
        return {
            "error": f"Failed to post tweet: {str(e)}",
            "result": None
        }
    except Exception as e:
        logger.error(f"Error posting tweet: {str(e)}")
        return {
            "error": f"Failed to post tweet: {str(e)}",
            "result": None
        }

def post_single_tweet(tweet_id):
    """
    Post a single tweet by ID.
    
    Args:
        tweet_id: ID of the tweet to post
        
    Returns:
        Dictionary containing the result of the operation
    """
    try:
        # Fetch the tweet from Supabase
        result = supabase_client.table("potential_tweets").select("*").eq("id", tweet_id).execute()
        
        if not result.data or len(result.data) == 0:
            logger.error(f"Tweet with ID {tweet_id} not found")
            return {
                "error": f"Tweet with ID {tweet_id} not found",
                "result": None
            }
        
        tweet = result.data[0]
        
        # Check if the tweet is already posted
        if tweet.get("status") == "posted" and tweet.get("posted_at"):
            logger.error(f"Tweet with ID {tweet_id} is already posted")
            return {
                "error": f"Tweet with ID {tweet_id} is already posted",
                "result": None
            }
        
        # Update the tweet status to 'posting'
        supabase_client.table("potential_tweets").update({
            "status": "posting"
        }).eq("id", tweet_id).execute()
        
        # Post the tweet
        response = post_tweet(tweet.get("content", ""))
        
        if "error" in response:
            # Update the tweet status to 'failed'
            supabase_client.table("potential_tweets").update({
                "status": "failed"
            }).eq("id", tweet_id).execute()
            
            return response
        
        # Update the tweet status to 'posted'
        supabase_client.table("potential_tweets").update({
            "status": "posted",
            "posted_at": datetime.now().isoformat()
        }).eq("id", tweet_id).execute()
        
        return {
            "result": "Tweet posted successfully",
            "tweet_id": response.get("tweet_id")
        }
        
    except Exception as e:
        logger.error(f"Error posting tweet: {str(e)}")
        
        # Update the tweet status to 'failed'
        try:
            supabase_client.table("potential_tweets").update({
                "status": "failed"
            }).eq("id", tweet_id).execute()
        except Exception as update_error:
            logger.error(f"Error updating tweet status: {str(update_error)}")
        
        return {
            "error": f"Failed to post tweet: {str(e)}",
            "result": None
        }

def post_tweet_thread(tweet_id):
    """
    Post a thread of tweets starting with the given tweet ID.
    
    Args:
        tweet_id: ID of the first tweet in the thread
        
    Returns:
        Dictionary containing the result of the operation
    """
    try:
        # Fetch the tweet from Supabase
        result = supabase_client.table("potential_tweets").select("*").eq("id", tweet_id).execute()
        
        if not result.data or len(result.data) == 0:
            logger.error(f"Tweet with ID {tweet_id} not found")
            return {
                "error": f"Tweet with ID {tweet_id} not found",
                "result": None
            }
        
        first_tweet = result.data[0]
        blog_post_id = first_tweet.get("blog_post_id")
        
        if not blog_post_id:
            logger.error(f"Tweet with ID {tweet_id} is not part of a thread (no blog_post_id)")
            return post_single_tweet(tweet_id)
        
        # Fetch all tweets in the thread
        thread_result = supabase_client.table("potential_tweets").select("*").eq("blog_post_id", blog_post_id).order("position", desc=False).execute()
        
        if not thread_result.data or len(thread_result.data) == 0:
            logger.error(f"No tweets found for blog post ID {blog_post_id}")
            return {
                "error": f"No tweets found for blog post ID {blog_post_id}",
                "result": None
            }
        
        thread_tweets = thread_result.data
        
        # Update all tweets in the thread to 'posting'
        for tweet in thread_tweets:
            supabase_client.table("potential_tweets").update({
                "status": "posting"
            }).eq("id", tweet.get("id")).execute()
        
        # Post the first tweet
        first_response = post_tweet(first_tweet.get("content", ""))
        
        if "error" in first_response:
            # Update the tweet status to 'failed'
            supabase_client.table("potential_tweets").update({
                "status": "failed"
            }).eq("id", first_tweet.get("id")).execute()
            
            # Update the rest of the tweets back to 'scheduled'
            for tweet in thread_tweets[1:]:
                supabase_client.table("potential_tweets").update({
                    "status": "scheduled"
                }).eq("id", tweet.get("id")).execute()
            
            return first_response
        
        # Update the first tweet status to 'posted'
        supabase_client.table("potential_tweets").update({
            "status": "posted",
            "posted_at": datetime.now().isoformat()
        }).eq("id", first_tweet.get("id")).execute()
        
        # Post the rest of the tweets as replies
        previous_tweet_id = first_response.get("tweet_id")
        posted_tweets = [first_response]
        
        for tweet in thread_tweets[1:]:
            # Post as reply to previous tweet
            response = post_tweet(tweet.get("content", ""), previous_tweet_id)
            
            if "error" in response:
                # Update the tweet status to 'failed'
                supabase_client.table("potential_tweets").update({
                    "status": "failed"
                }).eq("id", tweet.get("id")).execute()
                
                # Update the rest of the tweets back to 'scheduled'
                for remaining_tweet in thread_tweets[thread_tweets.index(tweet) + 1:]:
                    supabase_client.table("potential_tweets").update({
                        "status": "scheduled"
                    }).eq("id", remaining_tweet.get("id")).execute()
                
                return {
                    "error": f"Failed to post tweet {tweet.get('position')}: {response.get('error')}",
                    "posted_tweets": posted_tweets
                }
            
            # Update the tweet status to 'posted'
            supabase_client.table("potential_tweets").update({
                "status": "posted",
                "posted_at": datetime.now().isoformat()
            }).eq("id", tweet.get("id")).execute()
            
            # Update previous_tweet_id for next reply
            previous_tweet_id = response.get("tweet_id")
            posted_tweets.append(response)
            
            # Sleep to avoid rate limiting
            time.sleep(2)
        
        return {
            "result": "Tweet thread posted successfully",
            "posted_tweets": posted_tweets,
            "count": len(posted_tweets)
        }
        
    except Exception as e:
        logger.error(f"Error posting tweet thread: {str(e)}")
        
        # Try to update the tweet status to 'failed'
        try:
            supabase_client.table("potential_tweets").update({
                "status": "failed"
            }).eq("id", tweet_id).execute()
        except Exception as update_error:
            logger.error(f"Error updating tweet status: {str(update_error)}")
        
        return {
            "error": f"Failed to post tweet thread: {str(e)}",
            "result": None
        }

def main():
    """Main function to run the Twitter posting agent."""
    try:
        if args.tweet_id:
            logger.info(f"Posting tweet with ID: {args.tweet_id}")
            
            if args.thread == 'true':
                logger.info("Posting as a thread")
                result = post_tweet_thread(args.tweet_id)
            else:
                logger.info("Posting as a single tweet")
                result = post_single_tweet(args.tweet_id)
            
            logger.info(f"Result: {json.dumps(result)}")
            
            if "error" in result:
                logger.error(f"Error: {result['error']}")
                return 1
            else:
                logger.info(f"Success: {result['result']}")
                return 0
        else:
            logger.error("No tweet ID provided")
            return 1
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return 1

if __name__ == "__main__":
    exit_code = main()
    exit(exit_code)
