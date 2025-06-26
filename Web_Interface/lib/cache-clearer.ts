/**
 * Cache clearing utilities for resetting the app to vanilla state
 */

import fs from 'fs'
import path from 'path'

export interface ClearCacheResult {
  success: boolean
  clearedItems: string[]
  errors: string[]
}

/**
 * Clear all application caches to reset to vanilla state
 */
export async function clearAllCaches(): Promise<ClearCacheResult> {
  const result: ClearCacheResult = {
    success: true,
    clearedItems: [],
    errors: []
  }

  try {
    // 1. Clear setup completion marker
    await clearSetupStatus(result)
    
    // 2. Clear local environment files
    await clearLocalEnvFiles(result)
    
    // 3. Clear Next.js build cache (will be done via API call)
    result.clearedItems.push('Next.js build cache marked for clearing')
    
    console.log('Cache clearing completed:', result)
    return result
  } catch (error) {
    result.success = false
    result.errors.push(`Cache clearing failed: ${error instanceof Error ? error.message : String(error)}`)
    return result
  }
}

/**
 * Clear setup completion status
 */
async function clearSetupStatus(result: ClearCacheResult): Promise<void> {
  try {
    const setupCompletePath = path.join(process.cwd(), 'public', 'setup-complete.json')
    
    if (fs.existsSync(setupCompletePath)) {
      fs.unlinkSync(setupCompletePath)
      result.clearedItems.push('setup-complete.json')
    }
  } catch (error) {
    result.errors.push(`Failed to clear setup status: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Clear local environment files
 */
async function clearLocalEnvFiles(result: ClearCacheResult): Promise<void> {
  const envFiles = ['.env.local', '.env.development.local', '.env.production.local']
  
  for (const envFile of envFiles) {
    try {
      const envPath = path.join(process.cwd(), envFile)
      
      if (fs.existsSync(envPath)) {
        fs.unlinkSync(envPath)
        result.clearedItems.push(envFile)
      }
    } catch (error) {
      result.errors.push(`Failed to clear ${envFile}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

/**
 * Reset runtime caches (to be called from API routes)
 */
export function resetRuntimeCaches(): void {
  console.log('Runtime caches reset requested')
  
  try {
    // Import and call cache clearing functions
    // Note: These imports are done dynamically to avoid circular dependencies
    const { clearSupabaseCaches } = require('./supabase')
    const { clearEnvCache } = require('./env-loader')
    const { clearSetupStatusCache } = require('../app/api/save-config/route')
    
    // Clear all runtime caches
    clearSupabaseCaches()
    clearEnvCache()
    clearSetupStatusCache()
    
    console.log('All runtime caches cleared successfully')
  } catch (error) {
    console.error('Error clearing runtime caches:', error)
  }
}
