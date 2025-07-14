import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

// GET /api/persona - Get the current user's persona
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client is not available' },
        { status: 500 }
      );
    }

    // Get the current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    
    // Fetch the user's persona with all fields
    const { data, error } = await supabase
      .from('personas')
      .select('*')
      .eq('user_id', userId)
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
      const persona = data[0];
      return NextResponse.json({
        name: persona.name || "Tech Thought Leader",
        description: persona.description || "A knowledgeable and insightful tech industry expert who shares valuable perspectives on emerging technologies and industry trends.",
        tone: persona.tone || 70,
        humor: persona.humor || 40,
        enthusiasm: persona.enthusiasm || 65,
        assertiveness: persona.assertiveness || 75,
        expertise: persona.expertise || [
          "Artificial Intelligence",
          "Machine Learning", 
          "Software Development",
          "Tech Industry Trends",
          "Digital Transformation"
        ],
        tabooTopics: persona.taboo_topics || [
          "Partisan Politics",
          "Religious Debates", 
          "Controversial Social Issues"
        ],
        writingStyle: persona.writing_style || "The persona writes in a clear, concise manner with occasional technical terminology. Paragraphs are kept relatively short for readability. The persona uses data and examples to support points and occasionally asks rhetorical questions to engage readers.",
        audienceLevel: persona.audience_level || "intermediate",
        background: persona.background || "20+ years in the tech industry with experience at major tech companies and startups.",
        interests: persona.interests || "Emerging technologies, open source software, developer tools, and tech ethics.",
        values: persona.values || "Innovation, education, ethical technology development, and community building."
      });
    } else {
      return NextResponse.json({
        name: "Tech Thought Leader",
        description: "A knowledgeable and insightful tech industry expert who shares valuable perspectives on emerging technologies and industry trends.",
        tone: 70,
        humor: 40,
        enthusiasm: 65,
        assertiveness: 75,
        expertise: [
          "Artificial Intelligence",
          "Machine Learning",
          "Software Development", 
          "Tech Industry Trends",
          "Digital Transformation"
        ],
        tabooTopics: [
          "Partisan Politics",
          "Religious Debates",
          "Controversial Social Issues"
        ],
        writingStyle: "The persona writes in a clear, concise manner with occasional technical terminology. Paragraphs are kept relatively short for readability. The persona uses data and examples to support points and occasionally asks rhetorical questions to engage readers.",
        audienceLevel: "intermediate",
        background: "20+ years in the tech industry with experience at major tech companies and startups.",
        interests: "Emerging technologies, open source software, developer tools, and tech ethics.",
        values: "Innovation, education, ethical technology development, and community building."
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

// POST /api/persona - Create or update the user's persona
export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client is not available' },
        { status: 500 }
      );
    }

    // Get the current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    
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
    
    // Prepare persona data for database
    const personaData = {
      name: persona.name,
      description: persona.description,
      tone: persona.tone,
      humor: persona.humor,
      enthusiasm: persona.enthusiasm,
      assertiveness: persona.assertiveness,
      expertise: persona.expertise || [],
      taboo_topics: persona.tabooTopics || [],
      writing_style: persona.writingStyle || null,
      audience_level: persona.audienceLevel || 'intermediate',
      background: persona.background || null,
      interests: persona.interests || null,
      values: persona.values || null,
      updated_at: new Date().toISOString()
    };
    
    // Check if the user already has a persona
    const { data: existingPersonas, error: fetchError } = await supabase
      .from('personas')
      .select('id')
      .eq('user_id', userId)
      .limit(1);
    
    if (fetchError) {
      console.error('Error checking existing personas:', fetchError);
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      );
    }
    
    let result;
    
    if (existingPersonas && existingPersonas.length > 0) {
      // Update existing user persona
      result = await supabase
        .from('personas')
        .update(personaData)
        .eq('id', existingPersonas[0].id)
        .eq('user_id', userId);
    } else {
      // Insert new persona for the user
      result = await supabase
        .from('personas')
        .insert({
          ...personaData,
          user_id: userId
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
