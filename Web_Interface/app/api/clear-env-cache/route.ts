import { NextResponse } from 'next/server';
import { clearEnvCache, loadEnvFromRoot } from '@/lib/env-loader';
import { clearSupabaseCaches } from '@/lib/supabase';

export async function POST() {
  try {
    // Clear all caches
    clearEnvCache();
    clearSupabaseCaches();
    
    // Load fresh environment variables
    const envVars = loadEnvFromRoot();
    
    // Return the keys found (for debugging)
    return NextResponse.json({
      success: true,
      message: 'All caches cleared successfully',
      keysFound: Object.keys(envVars),
      totalKeys: Object.keys(envVars).length
    });
  } catch (error) {
    console.error('Error clearing caches:', error);
    return NextResponse.json(
      { error: 'Failed to clear caches' },
      { status: 500 }
    );
  }
}
