#!/bin/bash

# Deployment script for Interface Agent Network Error Fix
# This script deploys the updated files to fix network errors in the Interface Agent

echo "===== Interface Agent Network Error Fix Deployment ====="
echo "Starting deployment at $(date)"

# Check if we're in the right directory
if [ ! -d "Web_Interface" ]; then
  echo "Error: Please run this script from the project root directory (where Web_Interface is located)"
  exit 1
fi

# Create backup directory
BACKUP_DIR="backups/interface_agent_fix_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR/Web_Interface/app/api/coral"
mkdir -p "$BACKUP_DIR/Web_Interface/app/coral-inspector"

echo "Created backup directory: $BACKUP_DIR"

# Backup current files
echo "Backing up current files..."
cp Web_Interface/app/api/coral/interface-agent/route.ts "$BACKUP_DIR/Web_Interface/app/api/coral/"
cp Web_Interface/app/api/coral/stream/route.ts "$BACKUP_DIR/Web_Interface/app/api/coral/"
cp Web_Interface/app/coral-inspector/page.tsx "$BACKUP_DIR/Web_Interface/app/coral-inspector/"

echo "Files backed up successfully"

# Deploy to production server
echo "Deploying updated files to production server..."

# Replace with your actual server details
SERVER_USER="admin"
SERVER_HOST="coral.8interns.com"
SERVER_PATH="/var/www/coral-social-media"

# Copy the updated files to the server
echo "Copying files to server..."
scp Web_Interface/app/api/coral/interface-agent/route.ts "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/Web_Interface/app/api/coral/interface-agent/"
scp Web_Interface/app/api/coral/stream/route.ts "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/Web_Interface/app/api/coral/"
scp Web_Interface/app/coral-inspector/page.tsx "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/Web_Interface/app/coral-inspector/"

# Rebuild the Next.js application
echo "Rebuilding Next.js application on server..."
ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH/Web_Interface && npm run build"

# Restart the Next.js application
echo "Restarting Next.js application..."
ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && pm2 restart ecosystem.config.js"

# Restart the Interface Agent if it's running separately
echo "Restarting Interface Agent..."
ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && python stop_all_agents.py && sleep 5 && pm2 restart ecosystem.config.js"

echo "Deployment completed at $(date)"
echo "===== Verification Steps ====="
echo "1. Log in to the application"
echo "2. Navigate to the Coral Inspector page"
echo "3. Send a message and verify it's processed correctly"
echo "4. Check for any network errors in the browser console"
echo "5. Verify the connection remains stable for at least 5 minutes"

echo "===== Rollback Instructions ====="
echo "If issues are encountered, restore from backup:"
echo "1. Copy files from $BACKUP_DIR back to their original locations"
echo "2. Rebuild and restart the application"

echo "Deployment script completed successfully"
