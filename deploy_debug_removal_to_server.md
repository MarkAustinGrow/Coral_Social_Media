# Deploy Debug Tools Removal to Linode Server

## Server Connection and Deployment Commands

### 1. SSH into the Linode Server
```bash
ssh coraluser@your-server-ip
```

### 2. Navigate to Project Directory
```bash
cd /home/coraluser/Coral_Social_Media
```

### 3. Check Current Branch and Status
```bash
git status
git branch
```

### 4. Pull Latest Changes from coral-working Branch
```bash
# If you're not on coral-working branch, switch to it
git checkout coral-working

# Pull the latest changes (including debug tools removal)
git pull origin coral-working
```

### 5. Verify the Changes Were Applied
```bash
# Verify debug directories were removed
ls -la Web_Interface/app/          # Should NOT show debug/ directory
ls -la Web_Interface/app/api/      # Should NOT show debug/ directory
ls -la Web_Interface/components/   # Should NOT show supabase-debug.tsx

# Check the navigation file was updated
grep -n "Debug Tools" Web_Interface/components/side-nav.tsx  # Should return no results
```

### 6. Restart the Web Interface (if running via PM2)
```bash
# Check if PM2 is managing the web interface
pm2 list

# If coral-web process exists, restart it
pm2 restart coral-web

# Or if running differently, restart the Next.js application
cd Web_Interface
npm run build  # Optional: rebuild the application
pm2 restart coral-web  # Or however you're running the web interface
```

### 7. Verify Deployment Success
```bash
# Check that the web interface starts without errors
pm2 logs coral-web

# Or if running directly:
cd Web_Interface
npm run dev  # Test that it starts without build errors
```

## What This Deployment Includes

**Removed Files:**
- `Web_Interface/app/debug/` (entire directory with 5 debug pages)
- `Web_Interface/app/api/debug/` (debug API endpoints)
- `Web_Interface/components/supabase-debug.tsx`

**Modified Files:**
- `Web_Interface/components/side-nav.tsx` (removed debug tools navigation)
- `Web_Interface/app/config/page.tsx` (simplified system configuration)

**System Configuration Improvements:**
- **Removed General tab**: Development-focused settings (log levels, concurrent agents, etc.)
- **Removed Database tab**: Security risk - exposed Supabase URLs and API keys
- **Kept API Keys tab**: Only user-relevant configuration remains
- **Updated page title**: Changed from "System Configuration" to "API Configuration"
- **Simplified interface**: Single focused card instead of complex tabs

**Result:**
- Professional interface without development artifacts
- Navigation reduced from 13 to 12 items
- System config page shows only what users actually need
- Enhanced security by removing database credential exposure
- All debug functionality still available through production interfaces

## Commit Information
- **Latest Commit**: `4c6a718`
- **Previous Commit**: `02217b8`
- **Branch**: `coral-working`
- **Messages**: 
  - "Remove debug tools for production deployment"
  - "Simplify System Configuration page for professional deployment"
