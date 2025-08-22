#!/bin/bash

# Script to restart PM2 processes with the new configuration

echo "Stopping all PM2 processes..."
pm2 stop all || true

echo "Deleting all PM2 processes..."
pm2 delete all || true

echo "Starting processes with new PM2 configuration..."
pm2 start ecosystem.config.js

echo "Saving PM2 configuration..."
pm2 save

echo "Current running processes:"
pm2 list

echo "PM2 processes have been restarted with the new configuration."
echo "If you're still seeing a 502 Bad Gateway error, please check the Nginx configuration."
