#!/bin/bash

# Script to push Interface Agent Network Error Fix to GitHub
# This script commits and pushes the changes to the GitHub repository

echo "===== Pushing Interface Agent Network Error Fix to GitHub ====="
echo "Starting at $(date)"

# Check if we're in the right directory
if [ ! -d "Web_Interface" ]; then
  echo "Error: Please run this script from the project root directory (where Web_Interface is located)"
  exit 1
fi

# Check if git is installed
if ! command -v git &> /dev/null; then
  echo "Error: git is not installed or not in PATH"
  exit 1
fi

# Check if the directory is a git repository
if [ ! -d ".git" ]; then
  echo "Error: This directory is not a git repository"
  exit 1
fi

# Create a new branch for the changes
BRANCH_NAME="fix/interface-agent-network-error-$(date +%Y%m%d)"
echo "Creating new branch: $BRANCH_NAME"
git checkout -b "$BRANCH_NAME"

# Add the modified files
echo "Adding modified files to git staging area..."
git add Web_Interface/app/coral-inspector/page.tsx
git add Web_Interface/app/api/coral/stream/route.ts
git add Web_Interface/app/api/coral/interface-agent/route.ts
git add deploy_interface_agent_network_error_fix.sh
git add INTERFACE_AGENT_NETWORK_ERROR_FIX_COMPLETE.md
git add push_interface_agent_fix_to_github.sh

# Commit the changes
echo "Committing changes..."
git commit -m "Fix: Interface Agent Network Error

This commit addresses network connection issues in the Interface Agent and Coral Inspector components:

1. Improved error handling and reconnection logic in Coral Inspector
2. Updated stream route to use production URL instead of localhost
3. Enhanced error categorization and recovery in Interface Agent
4. Added exponential backoff for reconnection attempts
5. Added documentation and deployment script

Resolves network timeout issues and improves stability."

# Push the branch to GitHub
echo "Pushing branch to GitHub..."
git push -u origin "$BRANCH_NAME"

echo "===== GitHub Push Complete ====="
echo "Branch '$BRANCH_NAME' has been pushed to GitHub"
echo "Next steps:"
echo "1. Create a Pull Request on GitHub from branch '$BRANCH_NAME' to 'main'"
echo "2. Request code review from team members"
echo "3. After approval, merge the Pull Request"
echo "4. Deploy the changes using deploy_interface_agent_network_error_fix.sh"
