# Phase 2 Setup Guide: Authentication System Implementation
## Coral Social Media - Multi-Tenant Authentication

This guide walks you through implementing the authentication system for your multi-tenant Coral Social Media platform.

## Prerequisites

✅ **Phase 1 Complete**: Database migration successfully executed
✅ **Supabase Project**: Active Supabase project with RLS enabled
✅ **Node.js**: Version 18.0.0 or higher
✅ **Next.js Knowledge**: Basic understanding of Next.js 14 App Router

## Step 1: Install Dependencies

```bash
# Install all required packages
npm install @supabase/auth-helpers-nextjs @supabase/supabase-js
npm install next react react-dom tailwindcss autoprefixer postcss
npm install --save-dev @types/node @types/react @types/react-dom typescript eslint eslint-config-next
```

## Step 2: Environment Configuration

1. **Copy environment template:**
```bash
cp env.example .env.local
```

2. **Configure Supabase variables:**
   - Go to your Supabase project dashboard
   - Navigate to Settings > API
   - Copy the Project URL and anon key
   - Copy the service_role key (keep this secret!)

3. **Generate encryption key:**
```bash
# Generate a 32-character encryption key
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

4. **Update .env.local:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
ENCRYPTION_KEY=your-32-character-key
```

## Step 3: Configure Supabase Auth

1. **Enable Email Authentication:**
   - Go to Authentication > Settings in Supabase
   - Enable "Enable email confirmations"
   - Set Site URL to `http://localhost:3000`
   - Add redirect URLs:
     - `http://localhost:3000/auth/callback`
     - `http://localhost:3000/auth/confirm`

2. **Configure Email Templates:**
   - Go to Authentication > Email Templates
   - Customize confirmation and reset password emails
   - Update redirect URLs to match your domain

## Step 4: Project Structure Setup

Create the following directory structure:

```
coral-social-media/
├── app/
│   ├── auth/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   └── page.tsx
│   │   ├── callback/
│   │   │   └── page.tsx
│   │   └── reset-password/
│   │       └── page.tsx
│   ├── dashboard/
│   │   ├── page.tsx
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   └── api-keys/
│   │       └── page.tsx
│   ├── setup/
│   │   └── page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts
│   │   └── user/
│   │       ├── profile/
│   │       │   └── route.ts
│   │       └── api-keys/
│   │           └── route.ts
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   ├── auth/
│   └── dashboard/
├── contexts/
│   └── AuthContext.tsx
├── lib/
│   ├── supabase.ts
│   ├── crypto.ts
│   └── utils.ts
├── types/
│   └── database.ts
├── middleware.ts
└── package.json
```

## Step 5: Implement Core Files

### 1. Root Layout (app/layout.tsx)
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

### 2. Auth Callback (app/auth/callback/page.tsx)
```tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Auth callback error:', error)
        router.push('/auth/login?error=callback_error')
        return
      }

      if (data.session) {
        router.push('/dashboard')
      } else {
        router.push('/auth/login')
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>
  )
}
```

### 3. Tailwind CSS Configuration (tailwind.config.js)
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### 4. Global Styles (app/globals.css)
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    font-family: system-ui, sans-serif;
  }
}
```

## Step 6: Testing the Implementation

### 1. Start Development Server
```bash
npm run dev
```

### 2. Test Authentication Flow
1. Navigate to `http://localhost:3000/auth/signup`
2. Create a new account
3. Check email for confirmation link
4. Click confirmation link
5. Sign in at `http://localhost:3000/auth/login`
6. Verify redirect to dashboard

### 3. Test Protected Routes
1. Try accessing `/dashboard` without authentication
2. Verify redirect to login page
3. Sign in and verify access to dashboard

### 4. Test Data Isolation
1. Create multiple test accounts
2. Verify each user only sees their own data
3. Check RLS policies are working

## Step 7: Deployment Preparation

### 1. Update Environment Variables
```env
# Production environment
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXTAUTH_SECRET=your-production-secret
ENCRYPTION_KEY=your-production-encryption-key
```

### 2. Configure Supabase for Production
1. Update Site URL in Supabase Auth settings
2. Add production redirect URLs
3. Configure custom SMTP for emails (optional)

### 3. Build and Test
```bash
npm run build
npm run start
```

## Troubleshooting

### Common Issues

**1. "Cannot find module" errors:**
- Run `npm install` to ensure all dependencies are installed
- Check that file paths use correct aliases (@/lib, @/components)

**2. Supabase connection errors:**
- Verify environment variables are correct
- Check Supabase project is active
- Ensure RLS policies are enabled

**3. Authentication not working:**
- Check Supabase Auth settings
- Verify redirect URLs are configured
- Check browser console for errors

**4. Database errors:**
- Ensure Phase 1 migration completed successfully
- Check RLS policies are active
- Verify user has proper permissions

### Debug Commands

```bash
# Check TypeScript errors
npm run type-check

# Check linting issues
npm run lint

# Generate fresh database types
npm run db:generate-types
```

## Security Checklist

✅ **Environment Variables**: All secrets in .env.local, not committed to git
✅ **RLS Policies**: Row Level Security enabled on all tables
✅ **API Key Encryption**: All API keys encrypted before storage
✅ **HTTPS**: Use HTTPS in production
✅ **CORS**: Proper CORS configuration
✅ **Rate Limiting**: Implement rate limiting for API routes

## Performance Optimization

1. **Database Indexes**: Verify all user-specific indexes are created
2. **Caching**: Implement caching for dashboard data
3. **Image Optimization**: Use Next.js Image component
4. **Bundle Analysis**: Analyze bundle size and optimize

## Next Steps

Once Phase 2 is complete:

1. **Phase 3**: Agent Integration - Connect existing agents to multi-tenant system
2. **Phase 4**: UI/UX Enhancement - Improve user experience and design
3. **Phase 5**: Production Deployment - Scale and monitor the platform

## Success Criteria

Phase 2 is complete when:

✅ Users can register and login securely
✅ All routes are properly protected
✅ Dashboard shows only user-specific data
✅ API keys can be managed securely
✅ User profiles and settings work correctly
✅ Multi-tenant data isolation is verified
✅ Performance is optimized for production
✅ Security measures are properly implemented

Your Coral Social Media platform now has a complete authentication system and is ready for multi-tenant operation!
