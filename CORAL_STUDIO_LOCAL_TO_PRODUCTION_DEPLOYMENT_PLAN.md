# Coral Studio Local to Production Deployment Plan

## 🎯 Overview

**Mission**: Complete local development, testing, and production deployment of Coral Studio integration

**Infrastructure**:
- **Application Server**: 8interns.com (Main Next.js application)
- **Coral Server**: coral.8interns.com (MCP Coral Server)

**Workflow**: Local Development → GitHub → Linode Production Server

---

## 📋 Phase 1: Local Development Setup

### Step 1: Local Environment Preparation

#### 1.1 Install Dependencies Locally
```bash
# Navigate to Web_Interface directory
cd Web_Interface

# Install missing dependencies
npm install oauth-1.0a --legacy-peer-deps
npm install socket.io socket.io-client --legacy-peer-deps
npm install @types/socket.io --save-dev

# Verify all dependencies are installed
npm list
```

#### 1.2 Fix Module Type Warnings
```bash
# Add module type to main package.json
cd ..
echo '{"type": "module"}' > temp_package.json
# Merge with existing package.json if it exists
```

#### 1.3 Local Build Process
```bash
# Build the Next.js application locally
cd Web_Interface
npm run build

# Verify build success
ls -la .next/

# Test local development server
npm run dev
# Should start on http://localhost:3000
```

### Step 2: Local Testing

#### 2.1 Test Coral Studio Integration
```bash
# Start local development server
npm run dev

# In browser, navigate to:
# http://localhost:3000/coral-studio

# Verify:
# - Page loads without errors
# - Socket.IO connection attempts
# - No 404 errors in console
# - Connection status displays properly
```

#### 2.2 Test Ecosystem Configuration
```bash
# Test PM2 configuration locally (if PM2 installed)
cd ..
pm2 start ecosystem.config.js
pm2 list
pm2 logs

# Clean up
pm2 delete all
```

---

## 📋 Phase 2: GitHub Integration

### Step 1: Commit Changes to GitHub

#### 2.1 Stage All Changes
```bash
# From project root
git add .

# Review changes
git status
git diff --cached

# Commit with descriptive message
git commit -m "feat: Complete Coral Studio integration with Socket.IO bridge

- Updated ecosystem.config.js to manage both web and coral-studio-bridge
- Fixed oauth-1.0a dependency issue
- Added Socket.IO bridge server (coral-studio-server.js)
- Created logs directory for PM2 logging
- Resolved port conflicts between services
- Ready for production deployment

Infrastructure:
- Web interface: port 3000 (8interns.com)
- Coral Studio bridge: port 3001
- Coral server: port 5555 (coral.8interns.com)

Testing:
- Local build successful
- Dependencies resolved
- PM2 configuration validated"
```

#### 2.2 Push to GitHub
```bash
# Push to main branch
git push origin main

# Verify push successful
git log --oneline -5
```

### Step 2: Verify GitHub Repository
```bash
# Check GitHub repository status
# Visit: https://github.com/MarkAustinGrow/Coral_Social_Media
# Verify all files are present:
# - ecosystem.config.js (updated)
# - coral-studio-server.js
# - Web_Interface/package.json (with new dependencies)
# - logs/ directory
```

---

## 📋 Phase 3: Production Server Deployment

### Step 1: Server Preparation Commands

#### 3.1 Connect to Linode Server
```bash
# SSH into production server
ssh root@8interns.com
# or
ssh root@[server-ip]
```

#### 3.2 Navigate to Project Directory
```bash
# Navigate to project root
cd /home/coraluser/Coral_Social_Media

# Verify current location
pwd
ls -la
```

### Step 2: Pull Latest Changes from GitHub

#### 3.3 Update Codebase
```bash
# Pull latest changes from GitHub
git pull origin main

# Verify changes pulled successfully
git log --oneline -5

# Check that new files are present
ls -la ecosystem.config.js
ls -la coral-studio-server.js
ls -la logs/
```

### Step 3: Production Dependencies Installation

#### 3.4 Install Node.js Dependencies
```bash
# Navigate to Web_Interface
cd Web_Interface

# Install new dependencies
npm install oauth-1.0a --legacy-peer-deps
npm install socket.io socket.io-client --legacy-peer-deps
npm install @types/socket.io --save-dev

# Verify installation
npm list | grep -E "(oauth-1.0a|socket.io)"
```

### Step 4: Production Build Process

#### 3.5 Build Application
```bash
# Build Next.js application for production
npm run build

# Verify build success
ls -la .next/
echo "Build completed at: $(date)"

# Check for build errors
tail -20 .next/build.log 2>/dev/null || echo "No build log found"
```

### Step 5: Production Service Management

#### 3.6 Stop Existing Services
```bash
# Navigate back to project root
cd /home/coraluser/Coral_Social_Media

# Stop any existing PM2 processes
pm2 stop all
pm2 delete all

# Kill any processes using target ports
pkill -f "coral-studio-server"
pkill -f "3001"

# Verify ports are free
lsof -i :3000 || echo "Port 3000 is free"
lsof -i :3001 || echo "Port 3001 is free"
```

#### 3.7 Start Production Services
```bash
# Start services using updated ecosystem.config.js
pm2 start ecosystem.config.js

# Verify services started
pm2 list

# Check service status
pm2 status

# Monitor logs for startup issues
pm2 logs --lines 20
```

### Step 6: Production Verification

#### 3.8 Service Health Checks
```bash
# Check that both services are running
pm2 list | grep -E "(coral-web|coral-studio-bridge)"

# Verify ports are in use
lsof -i :3000 | head -5  # Should show Next.js
lsof -i :3001 | head -5  # Should show coral-studio-server

# Check service logs
pm2 logs coral-web --lines 10
pm2 logs coral-studio-bridge --lines 10
```

#### 3.9 Application Testing
```bash
# Test web interface accessibility
curl -I http://localhost:3000/ | head -1
# Should return: HTTP/1.1 200 OK

# Test coral studio bridge
curl -I http://localhost:3001/health | head -1
# Should return: HTTP/1.1 200 OK

# Test socket secret endpoint
curl http://localhost:3001/socket-secret
# Should return JSON with socketSecret
```

### Step 7: External Accessibility Verification

#### 3.10 Public Access Testing
```bash
# Test external access (from another terminal/machine)
curl -I https://8interns.com/ | head -1
# Should return: HTTP/2 200

# Test Coral Studio page
curl -I https://8interns.com/coral-studio | head -1
# Should return: HTTP/2 200

# Check Nginx configuration if needed
nginx -t
systemctl status nginx
```

---

## 📋 Phase 4: Production Monitoring & Maintenance

### Step 1: Service Monitoring

#### 4.1 PM2 Monitoring Setup
```bash
# Save PM2 configuration for auto-restart
pm2 save

# Setup PM2 startup script
pm2 startup
# Follow the instructions provided by the command

# Verify auto-restart configuration
pm2 list
```

#### 4.2 Log Monitoring
```bash
# Monitor application logs
tail -f logs/coral-web-combined.log &
tail -f logs/coral-studio-combined.log &

# Monitor for errors
tail -f logs/coral-web-error.log &
tail -f logs/coral-studio-error.log &

# Stop monitoring (when done)
pkill -f "tail -f logs/"
```

### Step 2: Health Check Scripts

#### 4.3 Create Health Check Script
```bash
# Create monitoring script
cat > /home/coraluser/health_check.sh << 'EOF'
#!/bin/bash
echo "=== Coral Studio Health Check - $(date) ==="

echo "PM2 Status:"
pm2 list

echo -e "\nPort Status:"
echo "Port 3000 (Web): $(lsof -i :3000 | wc -l) connections"
echo "Port 3001 (Bridge): $(lsof -i :3001 | wc -l) connections"
echo "Port 5555 (Coral): $(lsof -i :5555 | wc -l) connections"

echo -e "\nService Health:"
curl -s -o /dev/null -w "Web Interface: %{http_code}\n" http://localhost:3000/
curl -s -o /dev/null -w "Coral Bridge: %{http_code}\n" http://localhost:3001/health
curl -s -o /dev/null -w "External Web: %{http_code}\n" https://8interns.com/

echo -e "\nRecent Errors:"
tail -5 logs/coral-web-error.log 2>/dev/null || echo "No web errors"
tail -5 logs/coral-studio-error.log 2>/dev/null || echo "No bridge errors"

echo "=== Health Check Complete ==="
EOF

# Make executable
chmod +x /home/coraluser/health_check.sh

# Test health check
./health_check.sh
```

---

## 📋 Phase 5: Troubleshooting Guide

### Common Issues & Solutions

#### 5.1 Build Failures
```bash
# If build fails, check:
cd Web_Interface

# Clear cache and rebuild
rm -rf .next/
rm -rf node_modules/
npm install --legacy-peer-deps
npm run build
```

#### 5.2 PM2 Service Issues
```bash
# If PM2 services won't start:
pm2 delete all
pm2 kill
pm2 start ecosystem.config.js

# Check logs for specific errors
pm2 logs --err
```

#### 5.3 Port Conflicts
```bash
# If ports are in use:
lsof -i :3000
lsof -i :3001

# Kill conflicting processes
pkill -f "3000"
pkill -f "3001"

# Restart services
pm2 restart all
```

#### 5.4 Coral Studio Connection Issues
```bash
# Test Coral server connectivity
curl -H "X-User-ID: test" \
  "https://coral.8interns.com/devmode/exampleApplication/privkey/session1/sse?agentId=test"

# Should establish SSE connection
```

---

## 📋 Phase 6: Success Verification Checklist

### ✅ Local Development Success
- [ ] Dependencies installed without errors
- [ ] Local build completes successfully
- [ ] Development server starts on http://localhost:3000
- [ ] Coral Studio page loads without 404 errors
- [ ] No console errors in browser developer tools

### ✅ GitHub Integration Success
- [ ] All changes committed to repository
- [ ] Push to GitHub successful
- [ ] Repository shows latest commit with all files
- [ ] ecosystem.config.js updated correctly
- [ ] coral-studio-server.js present in repository

### ✅ Production Deployment Success
- [ ] Git pull successful on server
- [ ] Dependencies installed on production server
- [ ] Production build completes without errors
- [ ] PM2 services start successfully (coral-web + coral-studio-bridge)
- [ ] Both services show "online" status in `pm2 list`
- [ ] Port 3000 and 3001 are in use by correct services
- [ ] Web interface accessible at https://8interns.com/
- [ ] Coral Studio page accessible at https://8interns.com/coral-studio
- [ ] No 404 or connection errors in browser
- [ ] Socket.IO connection establishes successfully

### ✅ Integration Success
- [ ] Coral Studio shows "Connected" status
- [ ] Can list available agents through interface
- [ ] No CORS errors in browser console
- [ ] Real-time communication with agents works
- [ ] Error handling displays appropriate messages

---

## 🚨 Infrastructure Notes

### Server Information
- **Application Server**: 8interns.com (Linode)
- **Coral Server**: coral.8interns.com (Linode)
- **Project Path**: `/home/coraluser/Coral_Social_Media`
- **User**: `coraluser` (with root access)

### Port Configuration
- **Port 3000**: Next.js Web Interface (8interns.com)
- **Port 3001**: Coral Studio Socket.IO Bridge
- **Port 5555**: Coral MCP Server (coral.8interns.com)

### Service Architecture
```
[Browser] → [Nginx:443] → [Next.js:3000] → [Socket.IO Bridge:3001] → [MCP Client] → [coral.8interns.com:5555] → [Agents]
```

### Monitoring Commands
```bash
# Quick status check
pm2 list && lsof -i :3000,3001,5555

# Full health check
/home/coraluser/health_check.sh

# Log monitoring
pm2 logs --lines 20
```

---

## 🎉 Deployment Complete

Once all checklist items are verified, the Coral Studio integration will be fully deployed and functional in production, providing real-time communication with agents through the Socket.IO bridge architecture.

**Next Steps**: Test the integration with real agent interactions and monitor performance in production environment.

---

*This deployment plan ensures a complete local-to-production workflow with proper testing, monitoring, and troubleshooting procedures.*
