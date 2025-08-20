#!/bin/bash

# This script helps build the Next.js application with additional memory resources
# by creating a swap file and setting appropriate environment variables.

echo "Setting up swap file for additional memory..."
# Check if we're running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root or with sudo to create swap file"
  exit 1
fi

# Create a 4GB swap file if it doesn't exist
if [ ! -f /swapfile ]; then
  echo "Creating 4GB swap file..."
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo "Swap file created and activated."
else
  echo "Swap file already exists, ensuring it's activated..."
  swapon /swapfile
fi

# Display swap status
echo "Current swap status:"
swapon --show

echo "Setting up build environment..."
# Set production mode to reduce debugging overhead
export NODE_ENV=production

# Increase Node.js memory limit
export NODE_OPTIONS="--max_old_space_size=6144"

echo "Starting optimized build process..."
# Run the build
npm run build

echo "Build process completed."
echo "If the build was successful, you can now run: npm run start"
echo "If the build failed, check the error messages above."

# Note: To make the swap permanent, add to /etc/fstab:
# /swapfile swap swap defaults 0 0
echo "Note: The swap file will be deactivated on reboot unless added to /etc/fstab"
