# Cache Clearing for Vanilla State

This document explains how to clear all cached credentials and reset the application to a vanilla state for new users.

## Problem

When developing the application, Supabase credentials and other configuration data gets cached in multiple locations:

1. **JavaScript Module Cache** - Singleton instances and cached variables
2. **Next.js Build Cache** - Webpack compilation cache and RSC cache  
3. **Setup Status Cache** - Cached setup completion status
4. **Environment Variable Cache** - Cached environment variables from API calls

This means that even without a `.env` file, the app may still connect to your development Supabase instance due to cached credentials.

## Solution

We've implemented a comprehensive cache clearing system that resets the app to vanilla state.

### Automatic Cache Clearing

**Option 1: Using npm script (Recommended)**
```bash
# Make sure the dev server is running first
npm run dev

# In another terminal, run:
npm run reset-to-vanilla
```

**Option 2: Using the API directly**
```bash
# Make sure the dev server is running first
npm run dev

# In another terminal, run:
curl -X POST http://localhost:3000/api/clear-cache
```

### What Gets Cleared

The cache clearing process removes:

- ✅ `setup-complete.json` - Forces setup wizard to appear
- ✅ Runtime caches (Supabase client instances, environment variables)
- ✅ Next.js build cache (`.next` directory)
- ✅ Local environment files (`.env.local`, etc.)
- ✅ Module require cache for key files

### Verification

After clearing caches, you can verify the reset worked:

```bash
curl http://localhost:3000/api/save-config
```

You should see:
```json
{
  "success": true,
  "setupComplete": false,
  "message": "Setup is not complete"
}
```

## Files Added/Modified

### New Files
- `lib/cache-clearer.ts` - Cache clearing utilities
- `app/api/clear-cache/route.ts` - API endpoint for cache clearing
- `scripts/reset-to-vanilla.js` - Standalone script for resetting
- `README-CACHE-CLEARING.md` - This documentation

### Modified Files
- `lib/supabase.ts` - Added cache clearing functions
- `lib/env-loader.ts` - Added cache clearing functions  
- `app/api/save-config/route.ts` - Added setup status cache clearing
- `package.json` - Added `reset-to-vanilla` script

## Usage Workflow

### Before Committing to GitHub

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Clear all caches:**
   ```bash
   npm run reset-to-vanilla
   ```

3. **Verify the reset worked:**
   ```bash
   curl http://localhost:3000/api/save-config
   ```
   Should return `"setupComplete": false`

4. **Commit to GitHub:**
   ```bash
   git add .
   git commit -m "Reset to vanilla state for new users"
   git push
   ```

### For New Users

When new users clone the repository:

1. They install dependencies: `npm install`
2. They start the server: `npm run dev`
3. They visit `http://localhost:3000`
4. They see the setup wizard (no cached credentials)
5. They configure their own Supabase instance through the wizard

## Technical Details

### Cache Types Cleared

1. **Singleton Instances**
   - `supabaseInstance` in `lib/supabase.ts`
   - Prevents reuse of cached Supabase client

2. **Variable Caches**
   - `envCache` in `lib/supabase.ts` and `lib/env-loader.ts`
   - `cachedSetupStatus` in `app/api/save-config/route.ts`

3. **File System Caches**
   - `.next/` directory (Next.js build cache)
   - `public/setup-complete.json` (setup status marker)
   - `.env.local` files (local environment overrides)

4. **Node.js Module Cache**
   - `require.cache` entries for key modules
   - Forces fresh module loading

### Error Handling

The cache clearing process is designed to be robust:
- Individual cache clearing failures don't stop the entire process
- Detailed error reporting shows what succeeded/failed
- Webpack errors after cache clearing are expected and harmless

## Troubleshooting

**Q: I see webpack errors after clearing cache**
A: This is normal. Next.js tries to access cache files we just deleted, but it recreates them automatically.

**Q: The setup wizard still doesn't appear**
A: Check that `public/setup-complete.json` was actually deleted and verify the API returns `"setupComplete": false`.

**Q: Script fails with connection error**
A: Make sure the development server is running (`npm run dev`) before running the reset script.
