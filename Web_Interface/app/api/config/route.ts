import { getSupabaseClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await getSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to connect to database' },
        { status: 500 }
      );
    }
    
    // Fetch the general settings from the system_config table
    const { data, error } = await supabase
      .from('system_config')
      .select('*')
      .eq('key', 'general_settings')
      .single();
    
    if (error) {
      console.error('Error fetching system config:', error);
      return NextResponse.json(
        { error: 'Failed to fetch system configuration' },
        { status: 500 }
      );
    }
    
    // Return the configuration data
    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error in config GET route:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
