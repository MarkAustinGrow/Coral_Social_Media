import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "@/lib/env-loader";

export async function GET() {
  try {
    // Load environment variables
    const env = loadEnvFromRoot();
    
    // Log environment variables for debugging
    console.log("SUPABASE_URL:", env.SUPABASE_URL ? "Defined" : "Undefined");
    console.log("SUPABASE_KEY:", env.SUPABASE_KEY ? "Defined" : "Undefined");
    
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
    
    // Test connection by fetching x_accounts table
    const { data, error, count } = await supabase
      .from("x_accounts")
      .select("*", { count: "exact" });
    
    if (error) {
      console.error("Error fetching accounts:", error);
      return NextResponse.json(
        { error: `Failed to fetch accounts: ${error.message}` },
        { status: 500 }
      );
    }
    
    // Return the result
    return NextResponse.json({
      message: "Supabase connection successful",
      accountCount: count,
      accounts: data,
    });
    
  } catch (error: any) {
    console.error("Error testing Supabase connection:", error);
    return NextResponse.json(
      { error: `An unexpected error occurred: ${error.message}` },
      { status: 500 }
    );
  }
}
