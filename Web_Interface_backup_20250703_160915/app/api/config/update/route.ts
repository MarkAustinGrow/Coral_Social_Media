import { getSupabaseClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { value } = body;
    
    if (!value) {
      return NextResponse.json(
        { error: 'Configuration value is required' },
        { status: 400 }
      );
    }
    
    const supabase = await getSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to connect to database' },
        { status: 500 }
      );
    }
    
    // Update the general settings in the system_config table
    const { data, error } = await supabase
      .from('system_config')
      .update({
        value,
        updated_at: new Date().toISOString()
      })
      .eq('key', 'general_settings')
      .select()
      .single();
    
    if (error) {
      console.error('Error updating system config:', error);
      return NextResponse.json(
        { error: 'Failed to update system configuration' },
        { status: 500 }
      );
    }
    
    // Return the updated configuration data
    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error in config update route:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
