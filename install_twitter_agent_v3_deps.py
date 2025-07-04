#!/usr/bin/env python3
"""
Installation script for Twitter Posting Agent v3 dependencies.

This script checks if the required packages are installed and installs them if needed.
"""

import subprocess
import sys
import importlib.util
import os
from pathlib import Path

def check_package_installed(package_name):
    """Check if a Python package is installed."""
    spec = importlib.util.find_spec(package_name)
    return spec is not None

def install_package(package_name):
    """Install a Python package using pip."""
    print(f"Installing {package_name}...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", package_name])
    print(f"Successfully installed {package_name}")

def main():
    """Main function to check and install required packages."""
    print("Checking and installing required packages for Twitter Posting Agent v3...")
    
    # Required packages
    required_packages = [
        "requests",
        "requests-oauthlib",
        "python-dotenv",
        "supabase",
        "langchain",
        "langchain-mcp-adapters",
        "langchain-openai"
    ]
    
    # Check and install required packages
    for package in required_packages:
        package_name = package.split("==")[0]  # Remove version specifier if present
        if not check_package_installed(package_name.replace("-", "_")):
            install_package(package)
        else:
            print(f"{package_name} is already installed")
    
    # Check if .env file exists
    env_path = Path(__file__).parent / ".env"
    if not env_path.exists():
        print("\nWARNING: .env file not found. Creating a template .env file...")
        with open(env_path, "w") as f:
            f.write("""# Twitter API credentials
TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_TOKEN_SECRET=

# OpenAI API key
OPENAI_API_KEY=

# Supabase credentials
SUPABASE_URL=
SUPABASE_KEY=
""")
        print(f"Created template .env file at {env_path}")
        print("Please edit the .env file and add your API credentials")
    
    print("\nAll required packages are installed!")
    print("\nNext steps:")
    print("1. Make sure your .env file contains valid Twitter API credentials")
    print("2. Run the test script to verify your credentials:")
    print("   python test_twitter_api_v3.py")
    print("3. Run the Twitter Posting Agent:")
    print("   python 7_langchain_twitter_posting_agent_v3.py")

if __name__ == "__main__":
    main()
