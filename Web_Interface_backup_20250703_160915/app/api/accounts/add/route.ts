import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "@/lib/env-loader";

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { username, display_name } = body;
    
    // Validate input
    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }
    
    // Load environment variables
    const env = loadEnvFromRoot();
    
    // Initialize Supabase client
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Supabase credentials not configured" },
        { status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Prepare account data
    const accountData = {
      username,
      display_name: display_name || username,
      priority: 5, // Default priority
      last_fetched_at: null,
      created_at: new Date().toISOString(),
    };
    
    // Insert account into Supabase
    const { data, error } = await supabase
      .from("x_accounts")
      .upsert([accountData], { onConflict: "username" })
      .select();
    
    if (error) {
      console.error("Error inserting account:", error);
      return NextResponse.json(
        { error: `Failed to insert account: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: "Account added successfully",
      account: data?.[0] || null,
    });
    
  } catch (error: any) {
    console.error("Error adding account:", error);
    return NextResponse.json(
      { error: `An unexpected error occurred: ${error.message}` },
      { status: 500 }
    );
  }
}
