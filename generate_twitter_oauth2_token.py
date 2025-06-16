#!/usr/bin/env python
"""
Twitter OAuth 2.0 Token Generator

This script helps you generate an OAuth 2.0 User Context token for Twitter API v2.
This token is required for posting tweets with the Twitter API v2 when using a Pro tier subscription.

Instructions:
1. Make sure you have a Twitter Developer account with Pro tier access
2. Create a project and app in the Twitter Developer Portal
3. Configure your app with OAuth 2.0 settings:
   - Set the App type to "Web App, Automated App or Bot"
   - Add a callback URL (e.g., http://127.0.0.1:8080/callback)
   - Select the scopes: tweet.read, tweet.write, users.read
4. Get your Client ID and Client Secret from the "Keys and tokens" tab
5. Run this script and follow the prompts

The script will:
- Open a browser window for you to authorize your app
- Receive the authorization code via a local callback server
- Exchange the code for an OAuth 2.0 token
- Save the token to your .env file
"""

import os
import sys
import webbrowser
import http.server
import socketserver
import urllib.parse
import requests
import base64
import json
import tweepy
import secrets
import hashlib
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
dotenv_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=dotenv_path)

# Configuration
PORT = 8080
CALLBACK_URL = f"http://127.0.0.1:{PORT}/callback"
AUTH_URL = "https://twitter.com/i/oauth2/authorize"
TOKEN_URL = "https://api.twitter.com/2/oauth2/token"
SCOPES = ["tweet.read", "tweet.write", "users.read"]

# Global variables to store the authorization code and code verifier
authorization_code = None
server_running = True
code_verifier = None

def generate_code_verifier():
    """Generate a cryptographically random code verifier for PKCE."""
    token = secrets.token_bytes(32)
    code_verifier = base64.urlsafe_b64encode(token).decode('utf-8')
    return code_verifier.rstrip('=')  # Remove padding

def generate_code_challenge(verifier, method="S256"):
    """Generate a code challenge from the verifier string."""
    if method == "plain":
        return verifier
    elif method == "S256":
        digest = hashlib.sha256(verifier.encode('utf-8')).digest()
        challenge = base64.urlsafe_b64encode(digest).decode('utf-8')
        return challenge.rstrip('=')  # Remove padding
    else:
        raise ValueError(f"Unsupported code challenge method: {method}")

class CallbackHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        global authorization_code, server_running
        
        # Parse the query parameters
        query = urllib.parse.urlparse(self.path).query
        params = urllib.parse.parse_qs(query)
        
        if self.path.startswith("/callback") and "code" in params:
            # Extract the authorization code
            authorization_code = params["code"][0]
            
            # Send a success response
            self.send_response(200)
            self.send_header("Content-type", "text/html")
            self.end_headers()
            
            response = """
            <html>
            <head><title>Authorization Successful</title></head>
            <body>
            <h1>Authorization Successful!</h1>
            <p>You can now close this window and return to the script.</p>
            </body>
            </html>
            """
            
            self.wfile.write(response.encode())
            
            # Stop the server after handling the callback
            server_running = False
            return
        
        # Handle other requests
        self.send_response(404)
        self.end_headers()

def get_client_credentials():
    """Get the client ID and client secret from the user."""
    print("\n=== Twitter OAuth 2.0 Token Generator ===\n")
    print("You'll need your Twitter API Client ID and Client Secret.")
    print("You can find these in the Twitter Developer Portal under 'Keys and tokens'.\n")
    
    client_id = input("Enter your Client ID: ").strip()
    client_secret = input("Enter your Client Secret: ").strip()
    
    return client_id, client_secret

def start_auth_server():
    """Start a local server to receive the callback."""
    global server_running
    
    # Create a server to handle the callback
    with socketserver.TCPServer(("", PORT), CallbackHandler) as httpd:
        print(f"\nStarting callback server on port {PORT}...")
        print("Waiting for authorization...")
        
        # Keep the server running until we receive the callback
        while server_running:
            httpd.handle_request()

def get_authorization_code(client_id):
    """Get the authorization code by redirecting the user to Twitter."""
    global code_verifier
    
    # Generate a code verifier and challenge
    code_verifier = generate_code_verifier()
    challenge_method = "S256"  # Use S256 for better security
    code_challenge = generate_code_challenge(code_verifier, method=challenge_method)
    
    print(f"Generated code verifier: {code_verifier[:10]}...")
    print(f"Generated code challenge: {code_challenge[:10]}...")
    print(f"Using challenge method: {challenge_method}")
    
    # Construct the authorization URL
    auth_params = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": CALLBACK_URL,
        "scope": " ".join(SCOPES),
        "state": "state",
        "code_challenge": code_challenge,
        "code_challenge_method": challenge_method
    }
    
    auth_url = f"{AUTH_URL}?{urllib.parse.urlencode(auth_params)}"
    
    print(f"\nOpening browser to authorize the application...")
    webbrowser.open(auth_url)
    
    # Start the server to receive the callback
    start_auth_server()
    
    return authorization_code

def exchange_code_for_token(client_id, client_secret, code):
    """Exchange the authorization code for an access token."""
    global code_verifier
    
    if not code_verifier:
        print("Error: No code verifier found. Authorization process may have failed.")
        return None
    
    # Encode the client credentials
    credentials = f"{client_id}:{client_secret}"
    encoded_credentials = base64.b64encode(credentials.encode()).decode()
    
    # Set up the request headers and data
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": f"Basic {encoded_credentials}"
    }
    
    data = {
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": CALLBACK_URL,
        "code_verifier": code_verifier
    }
    
    print(f"Using code_verifier: {code_verifier[:10]}... for token exchange")
    
    # Make the request to exchange the code for a token
    response = requests.post(TOKEN_URL, headers=headers, data=data)
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error exchanging code for token: {response.status_code}")
        print(response.text)
        return None

def update_env_file(token_data, client_id, client_secret):
    """Update the .env file with the OAuth 2.0 token and client credentials."""
    access_token = token_data.get("access_token")
    
    if not access_token:
        print("No access token found in the response.")
        return False
    
    # Check if .env file exists
    if not os.path.exists(dotenv_path):
        print(f"Creating new .env file at {dotenv_path}")
        with open(dotenv_path, "w") as f:
            f.write(f"TWITTER_OAUTH2_TOKEN={access_token}\n")
            f.write(f"TWITTER_CLIENT_ID={client_id}\n")
            f.write(f"TWITTER_CLIENT_SECRET={client_secret}\n")
    else:
        # Read the existing .env file
        with open(dotenv_path, "r") as f:
            lines = f.readlines()
        
        # Check if variables already exist
        token_exists = False
        client_id_exists = False
        client_secret_exists = False
        
        for i, line in enumerate(lines):
            if line.startswith("TWITTER_OAUTH2_TOKEN="):
                lines[i] = f"TWITTER_OAUTH2_TOKEN={access_token}\n"
                token_exists = True
            elif line.startswith("TWITTER_CLIENT_ID="):
                lines[i] = f"TWITTER_CLIENT_ID={client_id}\n"
                client_id_exists = True
            elif line.startswith("TWITTER_CLIENT_SECRET="):
                lines[i] = f"TWITTER_CLIENT_SECRET={client_secret}\n"
                client_secret_exists = True
        
        # Add any variables that don't exist
        if not token_exists:
            lines.append(f"TWITTER_OAUTH2_TOKEN={access_token}\n")
        if not client_id_exists:
            lines.append(f"TWITTER_CLIENT_ID={client_id}\n")
        if not client_secret_exists:
            lines.append(f"TWITTER_CLIENT_SECRET={client_secret}\n")
        
        # Write the updated .env file
        with open(dotenv_path, "w") as f:
            f.writelines(lines)
    
    print(f"\nSuccessfully updated .env file with Twitter credentials.")
    return True

def test_token(access_token):
    """Test the OAuth 2.0 token by making a request to the Twitter API."""
    # For OAuth 2.0 User Context tokens, we need to use tweepy.Client
    # with consumer keys and the access token
    try:
        client = tweepy.Client(
            consumer_key=os.getenv("TWITTER_CLIENT_ID"),
            consumer_secret=os.getenv("TWITTER_CLIENT_SECRET"),
            access_token=access_token,
            wait_on_rate_limit=True
        )
        
        # Get the authenticated user's information
        me = client.get_me()
        username = me.data.username
        print(f"\nSuccessfully authenticated as @{username}")
        return True
    except Exception as e:
        print(f"\nError testing token: {str(e)}")
        return False

def main():
    """Main function to generate an OAuth 2.0 token."""
    try:
        # Get client credentials
        client_id, client_secret = get_client_credentials()
        
        # Get authorization code
        code = get_authorization_code(client_id)
        
        if not code:
            print("Failed to get authorization code.")
            return 1
        
        print(f"\nAuthorization code received: {code[:10]}...")
        
        # Exchange code for token
        token_data = exchange_code_for_token(client_id, client_secret, code)
        
        if not token_data:
            print("Failed to exchange code for token.")
            return 1
        
        print("\nSuccessfully obtained OAuth 2.0 token!")
        
        # Update .env file
        if not update_env_file(token_data, client_id, client_secret):
            print("Failed to update .env file.")
            return 1
        
        # Test the token
        if not test_token(token_data.get("access_token")):
            print("Token test failed.")
            return 1
        
        print("\n=== OAuth 2.0 Token Generation Complete ===")
        print("You can now use the Twitter posting agent with OAuth 2.0 authentication.")
        return 0
    
    except KeyboardInterrupt:
        print("\nOperation cancelled by user.")
        return 1
    except Exception as e:
        print(f"\nAn error occurred: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
