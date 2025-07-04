# Phase 2 Deployment Guide: Server Integration
## Coral Social Media - Authentication System Deployment

This guide helps you deploy the Phase 2 authentication system to your existing Linode server with PM2.

## Current Server Status ✅

Based on your output, you have:
- ✅ PM2 running with `coral-web` process
- ✅ Next.js app responding on localhost:3000
- ✅ Nginx configured and running
- ✅ Firewall allowing Nginx Full traffic

## Deployment Steps

### Step 1: Backup Current Application

```bash
# Navigate to your project directory
cd /home/coraluser/Coral_Social_Media/Web_Interface

# Create backup of current application
sudo cp -r . ../Web_Interface_backup_$(date +%Y%m%d_%H%M%S)

# Stop current PM2 process
pm2 stop coral-web
```

### Step 2: Install New Dependencies

```bash
# Install Phase 2 authentication dependencies
npm install @supabase/auth-helpers-nextjs @supabase/supabase-js

# Install additional TypeScript and React dependencies if needed
npm install --save-dev @types/node @types/react @types/react-dom

# Verify installation
npm list @supabase/supabase-js
```

### Step 3: Add Phase 2 Files

You need to add these files to your existing project:

```bash
# Create necessary directories
mkdir -p lib contexts types app/auth/login app/auth/signup app/auth/callback app/dashboard app/api/user/profile

# Copy the Phase 2 files we created:
# - lib/supabase.ts
# - lib/crypto.ts  
# - contexts/AuthContext.tsx
# - types/database.ts
# - middleware.ts
# - app/auth/login/page.tsx
# - app/dashboard/page.tsx
# - app/api/user/profile/route.ts
# - package.json (merge dependencies)
```

### Step 4: Environment Configuration

```bash
# Create environment file
cp .env.example .env.local

# Edit environment variables
nano .env.local
```

Add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXTAUTH_SECRET=your-nextauth-secret
ENCRYPTION_KEY=your-32-character-encryption-key
```

### Step 5: Update Your Root Layout

Update `app/layout.tsx` to include the AuthProvider:

```tsx
import { AuthProvider } from '@/contexts/AuthContext'
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
```

### Step 6: Build and Test

```bash
# Build the application
npm run build

# Test the build
npm run start

# If successful, stop the test
# Ctrl+C
```

### Step 7: Restart PM2 with New Code

```bash
# Restart PM2 process with new code
pm2 restart coral-web

# Or if you need to reload the process completely
pm2 delete coral-web
pm2 start npm --name coral-web -- run dev

# Save PM2 configuration
pm2 save

# Check status
pm2 status
pm2 logs coral-web
```

### Step 8: Update Nginx Configuration (if needed)

Your current Nginx setup should work, but you may want to add authentication-specific routes:

```bash
# Edit Nginx configuration
sudo nano /etc/nginx/sites-available/coral-social-media
```

Add these location blocks if not already present:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Authentication routes
    location /auth/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API routes
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Test and reload Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step 9: Configure Supabase for Production

1. **Update Supabase Auth Settings:**
   - Go to your Supabase project dashboard
   - Navigate to Authentication > Settings
   - Set Site URL to your domain: `https://your-domain.com`
   - Add redirect URLs:
     - `https://your-domain.com/auth/callback`
     - `https://your-domain.com/auth/confirm`

2. **Enable Email Authentication:**
   - Ensure email confirmations are enabled
   - Configure email templates if needed

### Step 10: Test the Deployment

```bash
# Check PM2 status
pm2 status

# Check application logs
pm2 logs coral-web

# Test the application
curl -I http://localhost:3000
curl -I http://localhost:3000/auth/login

# Test from external access
curl -I https://your-domain.com
```

### Step 11: Monitor and Verify

```bash
# Monitor PM2 processes
pm2 monit

# Check system resources
htop

# Check Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

## Troubleshooting

### Common Issues:

**1. PM2 Process Won't Start:**
```bash
# Check for port conflicts
sudo netstat -tulpn | grep :3000

# Check PM2 logs
pm2 logs coral-web

# Restart PM2 daemon
pm2 kill
pm2 resurrect
```

**2. Build Errors:**
```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript errors
npm run type-check
```

**3. Environment Variable Issues:**
```bash
# Verify environment file exists
ls -la .env.local

# Check if PM2 is loading environment variables
pm2 show coral-web
```

**4. Database Connection Issues:**
```bash
# Test Supabase connection
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
console.log('Supabase client created successfully');
"
```

## Security Checklist

✅ **Environment Variables**: Secure .env.local file with proper permissions
✅ **Firewall**: Nginx Full allowed, unnecessary ports blocked
✅ **SSL**: Configure SSL certificate for HTTPS (recommended)
✅ **Database**: RLS policies active from Phase 1
✅ **API Keys**: Encrypted storage implemented

## Performance Monitoring

```bash
# Monitor PM2 processes
pm2 monit

# Check memory usage
free -h

# Check disk usage
df -h

# Monitor Nginx performance
sudo tail -f /var/log/nginx/access.log | grep -E "(POST|PUT|DELETE)"
```

## Next Steps

After successful deployment:

1. **Test Authentication Flow:**
   - Visit your domain
   - Try registering a new account
   - Test login/logout functionality
   - Verify dashboard access

2. **Monitor Performance:**
   - Watch PM2 logs for errors
   - Monitor server resources
   - Check database performance

3. **Phase 3 Preparation:**
   - Your server is now ready for Phase 3 (Agent Integration)
   - The authentication system will support multiple users
   - Each user will have isolated agent instances

Your multi-tenant authentication system is now deployed and ready for production use! 🚀
