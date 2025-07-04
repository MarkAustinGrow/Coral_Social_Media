#!/bin/bash

# Twitter Posting Agent v3 Runner for Linux/Mac

echo "Twitter Posting Agent v3 Runner"
echo "=============================="
echo

function show_menu {
    echo "Choose an option:"
    echo "1. Install dependencies"
    echo "2. Test Twitter API authentication"
    echo "3. Test Twitter API and post a test tweet"
    echo "4. Run Twitter Posting Agent v3"
    echo "5. Exit"
    echo
}

function install_deps {
    echo
    echo "Installing dependencies..."
    python3 install_twitter_agent_v3_deps.py
    echo
    read -p "Press Enter to continue..."
}

function test_auth {
    echo
    echo "Testing Twitter API authentication..."
    python3 test_twitter_api_v3.py
    echo
    read -p "Press Enter to continue..."
}

function test_post {
    echo
    echo "Testing Twitter API authentication and posting a test tweet..."
    python3 test_twitter_api_v3.py --post
    echo
    read -p "Press Enter to continue..."
}

function run_agent {
    echo
    echo "Running Twitter Posting Agent v3..."
    echo "(Press Ctrl+C to stop the agent)"
    echo
    python3 7_langchain_twitter_posting_agent_v3.py
    echo
    read -p "Press Enter to continue..."
}

# Make the script executable
chmod +x install_twitter_agent_v3_deps.py
chmod +x test_twitter_api_v3.py
chmod +x 7_langchain_twitter_posting_agent_v3.py

# Main loop
while true; do
    show_menu
    read -p "Enter your choice (1-5): " choice
    
    case $choice in
        1) install_deps ;;
        2) test_auth ;;
        3) test_post ;;
        4) run_agent ;;
        5) 
            echo
            echo "Goodbye!"
            echo
            exit 0
            ;;
        *)
            echo "Invalid choice. Please try again."
            echo
            ;;
    esac
done
