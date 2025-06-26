import { NextResponse } from 'next/server'
import { clearAllCaches, resetRuntimeCaches } from '@/lib/cache-clearer'
import fs from 'fs'
import path from 'path'

export async function POST() {
  try {
    console.log('Cache clearing requested...')
    
    // Clear application caches
    const result = await clearAllCaches()
    
    // Clear runtime caches (singleton instances, cached variables)
    try {
      resetRuntimeCaches()
      result.clearedItems.push('Runtime caches (singletons, cached variables)')
    } catch (error) {
      result.errors.push(`Failed to clear runtime caches: ${error instanceof Error ? error.message : String(error)}`)
    }
    
    // Clear Next.js build cache
    try {
      const nextCachePath = path.join(process.cwd(), '.next')
      if (fs.existsSync(nextCachePath)) {
        // Remove the entire .next directory
        fs.rmSync(nextCachePath, { recursive: true, force: true })
        result.clearedItems.push('.next build cache')
      }
    } catch (error) {
      result.errors.push(`Failed to clear .next cache: ${error instanceof Error ? error.message : String(error)}`)
    }
    
    // Reset module-level caches by clearing require cache for our modules
    try {
      // Clear the module cache for our key files
      const modulesToClear = [
        path.resolve(process.cwd(), 'lib/supabase.ts'),
        path.resolve(process.cwd(), 'lib/env-loader.ts'),
        path.resolve(process.cwd(), 'app/api/save-config/route.ts')
      ]
      
      for (const modulePath of modulesToClear) {
        if (require.cache[modulePath]) {
          delete require.cache[modulePath]
          result.clearedItems.push(`Module cache: ${path.basename(modulePath)}`)
        }
      }
    } catch (error) {
      result.errors.push(`Failed to clear module cache: ${error instanceof Error ? error.message : String(error)}`)
    }
    
    console.log('Cache clearing result:', result)
    
    return NextResponse.json({
      success: result.success,
      message: result.success ? 'All caches cleared successfully' : 'Cache clearing completed with some errors',
      clearedItems: result.clearedItems,
      errors: result.errors
    })
  } catch (error) {
    console.error('Error clearing caches:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to clear caches',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Cache clearing endpoint. Use POST to clear caches.',
    availableActions: [
      'Clear setup completion status',
      'Clear local environment files',
      'Clear Next.js build cache',
      'Clear module require cache'
    ]
  })
}
