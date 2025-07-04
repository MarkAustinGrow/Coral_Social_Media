import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

// GET /api/persona - Get the current persona
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client is not available' },
        { status: 500 }
      );
    }
    
    // Fetch the most recent persona
    const { data, error } = await supabase
      .from('personas')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('Error fetching persona:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    // Return the persona or a default if none exists
    if (data && data.length > 0) {
      return NextResponse.json(data[0]);
    } else {
      return NextResponse.json({
        name: "Tech Thought Leader",
        description: "A knowledgeable and insightful tech industry expert who shares valuable perspectives on emerging technologies and industry trends.",
        tone: 70,
        humor: 40,
        enthusiasm: 65,
        assertiveness: 75
      });
    }
  } catch (error: any) {
    console.error('Unexpected error in GET /api/persona:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST /api/persona - Create or update the persona
export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client is not available' },
        { status: 500 }
      );
    }
    
    // Parse the request body
    const persona = await request.json();
    
    // Validate required fields
    const requiredFields = ['name', 'description', 'tone', 'humor', 'enthusiasm', 'assertiveness'];
    for (const field of requiredFields) {
      if (persona[field] === undefined) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    // Check if we have any personas in the table
    const { data: existingPersonas, error: fetchError } = await supabase
      .from('personas')
      .select('id')
      .limit(1);
    
    if (fetchError) {
      console.error('Error checking existing personas:', fetchError);
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      );
    }
    
    let result;
    
    if (persona.id) {
      // Update existing persona
      result = await supabase
        .from('personas')
        .update({
          name: persona.name,
          description: persona.description,
          tone: persona.tone,
          humor: persona.humor,
          enthusiasm: persona.enthusiasm,
          assertiveness: persona.assertiveness,
          updated_at: new Date().toISOString()
        })
        .eq('id', persona.id);
    } else if (existingPersonas && existingPersonas.length > 0) {
      // Update the first persona if no ID is provided but personas exist
      result = await supabase
        .from('personas')
        .update({
          name: persona.name,
          description: persona.description,
          tone: persona.tone,
          humor: persona.humor,
          enthusiasm: persona.enthusiasm,
          assertiveness: persona.assertiveness,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPersonas[0].id);
    } else {
      // Insert new persona if none exist
      result = await supabase
        .from('personas')
        .insert({
          name: persona.name,
          description: persona.description,
          tone: persona.tone,
          humor: persona.humor,
          enthusiasm: persona.enthusiasm,
          assertiveness: persona.assertiveness
        });
    }
    
    if (result.error) {
      console.error('Error saving persona:', result.error);
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Unexpected error in POST /api/persona:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
