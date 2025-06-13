import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getRootEnv } from '@/lib/env-loader';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { name, description, tone, humor, enthusiasm, assertiveness } = data;
    
    // Validate inputs
    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }
    
    // Get Supabase credentials from environment variables
    const supabaseUrl = getRootEnv('SUPABASE_URL');
    const supabaseKey = getRootEnv('SUPABASE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not found in environment variables' },
        { status: 500 }
      );
    }
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Check if any persona exists
    const { data: existingPersonas, error: countError } = await supabase
      .from('personas')
      .select('id')
      .limit(1);
    
    if (countError) {
      console.error('Error checking existing personas:', countError);
      return NextResponse.json(
        { error: `Failed to check existing personas: ${countError.message}` },
        { status: 500 }
      );
    }
    
    let result;
    
    // If personas exist, update the first one, otherwise insert a new one
    if (existingPersonas && existingPersonas.length > 0) {
      const { data: updateData, error: updateError } = await supabase
        .from('personas')
        .update({
          name,
          description,
          tone: tone || 50,
          humor: humor || 50,
          enthusiasm: enthusiasm || 50,
          assertiveness: assertiveness || 50,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPersonas[0].id);
      
      if (updateError) {
        console.error('Error updating persona:', updateError);
        return NextResponse.json(
          { error: `Failed to update persona: ${updateError.message}` },
          { status: 500 }
        );
      }
      
      result = { action: 'updated', id: existingPersonas[0].id };
    } else {
      const { data: insertData, error: insertError } = await supabase
        .from('personas')
        .insert({
          name,
          description,
          tone: tone || 50,
          humor: humor || 50,
          enthusiasm: enthusiasm || 50,
          assertiveness: assertiveness || 50,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id');
      
      if (insertError) {
        console.error('Error inserting persona:', insertError);
        return NextResponse.json(
          { error: `Failed to insert persona: ${insertError.message}` },
          { status: 500 }
        );
      }
      
      result = { action: 'inserted', id: insertData && insertData.length > 0 ? insertData[0].id : null };
    }
    
    return NextResponse.json({ 
      success: true,
      result
    });
  } catch (error) {
    console.error('Error saving persona to Supabase:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
