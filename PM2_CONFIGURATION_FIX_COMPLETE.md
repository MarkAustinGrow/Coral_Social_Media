# PM2 Configuration Fix - COMPLETE

## Problem Solved
- **502 Bad Gateway Error**: Fixed the issue causing 502 Bad Gateway errors when accessing the web interface
- **Empty PM2 Configuration**: Resolved the empty ecosystem.config.js file that was missing application configurations
- **Port Mismatch**: Fixed the mismatch between Nginx configuration (expecting port 3000) and application configuration

## Technical Solution

### 1. Created Proper PM2 Configuration
Updated `ecosystem.config.js` with proper configurations for both the web application and interface agent:

```javascript
module.exports = {
  apps: [
    {
      name: "coral-social-media",
      cwd: "./Web_Interface",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      watch: false,
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "500M",
      restart_delay: 3000,
      autorestart: true
    },
    {
      name: "interface-agent",
      script: "./0_langchain_interface.py",
      interpreter: "python",
      env: {
        PYTHONUNBUFFERED: "1"
      },
      watch: false,
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "1G",
      restart_delay: 5000,
      autorestart: true
    }
  ]
}
```

### 2. Updated Next.js Start Script
Modified `Web_Interface/package.json` to explicitly set the port to 3000 in the start script:

```json
"scripts": {
  "dev": "next dev -H 0.0.0.0",
  "build": "next build",
  "start": "next start -p 3000",
  "lint": "next lint",
  "reset-to-vanilla": "node scripts/reset-to-vanilla.js"
}
```

### 3. Created PM2 Restart Script
Created `restart_pm2.sh` to easily restart PM2 processes with the new configuration:

```bash
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
```

## Deployment Steps

1. **Push Changes to GitHub**: All changes have been committed and pushed to the `Responsive` branch
2. **Server Deployment**: To deploy these changes to the server:
   - Pull the latest changes from GitHub
   - Run the restart_pm2.sh script to apply the new PM2 configuration
   - Verify that the 502 Bad Gateway error is resolved

## Technical Details

### Port Configuration
- **Nginx**: Configured to proxy requests to port 3000
- **Next.js Application**: Explicitly configured to run on port 3000
- **PM2 Configuration**: Sets the PORT environment variable to 3000 for the web application

### Process Management
- **coral-social-media**: Manages the Next.js web application
- **interface-agent**: Manages the Python-based interface agent
- Both processes are configured with appropriate memory limits and restart policies

## Verification
After deploying these changes, verify that:
1. The web interface is accessible without 502 Bad Gateway errors
2. The interface agent is running properly
3. PM2 shows both processes as online and healthy

## Future Considerations
- Consider implementing health checks for the web application and interface agent
- Monitor memory usage to ensure the configured limits are appropriate
- Consider implementing a more robust deployment process with rollback capabilities
