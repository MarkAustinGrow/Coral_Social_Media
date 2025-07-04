# Signup Feature Troubleshooting Guide

## Overview
This guide addresses the signup feature issues that were occurring due to environment variable loading problems in the middleware and Supabase client configuration.

## Issues Identified

### 1. Environment Variable Loading Problem
**Problem**: PM2 was not loading environment variables properly at runtime, causing the middleware to fail with:
```
Error: either NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY env variables or supabaseUrl and supabaseKey are required!
```

**Root Cause**: 
- Environment variables were available during build time but not at runtime
- PM2 was looking for environment files in the wrong location
- Missing ecosystem.config.js for proper PM2 configuration

### 2. Middleware Failure
**Problem**: The middleware was crashing when environment variables weren't available, preventing access to any pages including signup.

**Root Cause**: 
- Middleware was trying to create Supabase client before checking if environment variables existed
- Error handling was insufficient for environment variable failures

## Solutions Implemented

### 1. Created ecosystem.config.js
**File**: `ecosystem.config.js`
**Purpose**: Proper PM2 configuration with environment variable loading

```javascript
module.exports = {
  apps: [{
    name: 'coral-web',
    script: 'npm',
    args: 'run dev',
    cwd: './Web_Interface',
    env_file: './.env',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    // ... other configuration
  }]
}
```

### 2. Updated next.config.mjs
**File**: `Web_Interface/next.config.mjs`
**Purpose**: Ensure environment variables are properly loaded by Next.js

```javascript
const nextConfig = {
  // ... existing config
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js']
  }
}
```

### 3. Improved Middleware
**File**: `Web_Interface/middleware.ts`
**Changes**:
- Moved public route check to the beginning
- Better error handling for environment variable failures
- More robust session checking

### 4. Deployment Script
**File**: `fix_signup_deployment.sh`
**Purpose**: Automated deployment with proper environment setup

## How to Deploy the Fix

### Step 1: Run the Deployment Script
```bash
cd /home/coraluser/Coral_Social_Media
bash fix_signup_deployment.sh
```

### Step 2: Verify Environment Variables
Check that the environment variables are loaded:
```bash
pm2 logs coral-web | grep -i supabase
```

### Step 3: Test the Signup Feature
1. Navigate to: `http://localhost:3000/auth/signup`
2. Try creating a new account
3. Check for any errors in the logs: `pm2 logs coral-web`

## Manual Troubleshooting Steps

### If the deployment script doesn't work:

#### 1. Stop PM2 and Clean Cache
```bash
pm2 delete coral-web
cd Web_Interface
rm -rf .next
rm -rf node_modules/.cache
cd ..
```

#### 2. Copy Environment File
```bash
cp .env Web_Interface/.env
```

#### 3. Start with Ecosystem Config
```bash
pm2 start ecosystem.config.js
```

#### 4. Monitor Logs
```bash
pm2 logs coral-web --lines 50
```

### If Environment Variables Still Not Loading:

#### 1. Check .env File Location
```bash
ls -la .env
ls -la Web_Interface/.env
```

#### 2. Verify .env File Content
```bash
grep -E "NEXT_PUBLIC_SUPABASE|SUPABASE" .env
```

#### 3. Test Environment Loading
```bash
cd Web_Interface
node -e "console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)"
```

### If Middleware Still Failing:

#### 1. Check Middleware Logs
```bash
pm2 logs coral-web | grep -i middleware
```

#### 2. Test Public Routes
Try accessing: `http://localhost:3000/auth/login`

#### 3. Verify Supabase Client
Check if the Supabase client is working in the browser console.

## Common Error Messages and Solutions

### Error: "Supabase environment variables not found in middleware"
**Solution**: Ensure .env file is copied to Web_Interface directory and PM2 is started with ecosystem.config.js

### Error: "Mock client" in signup
**Solution**: Environment variables are not loaded properly. Restart PM2 with ecosystem config.

### Error: "Invalid login credentials" during signup
**Solution**: This might be a Supabase configuration issue. Check Supabase dashboard settings.

### Error: "Email not confirmed" 
**Solution**: Check email for confirmation link or verify Supabase email settings.

## Verification Checklist

- [ ] PM2 is running with ecosystem.config.js
- [ ] .env file exists in both root and Web_Interface directories
- [ ] Environment variables are visible in PM2 logs
- [ ] Middleware is not throwing environment variable errors
- [ ] Signup page loads without errors
- [ ] Supabase client is properly initialized
- [ ] Email confirmation flow works (if enabled)

## Additional Notes

### Environment Variable Priority
1. PM2 ecosystem.config.js env_file
2. Next.js next.config.mjs env section
3. System environment variables

### Supabase Configuration
Ensure your Supabase project has:
- Email authentication enabled
- Proper redirect URLs configured
- RLS policies set up for user tables

### Development vs Production
This configuration is set up for development. For production:
- Use PM2 production mode
- Set NODE_ENV=production
- Use proper SSL certificates
- Configure proper domain redirects
