import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { loadEnvFromRoot } from "@/lib/env-loader";
import type { Database } from "@/types/database";

export async function GET() {
  try {
    // Get authenticated user from session
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error("Session error:", sessionError);
      return NextResponse.json(
        { error: "Authentication error", details: sessionError.message },
        { status: 401 }
      );
    }
    
    if (!session?.user) {
      console.error("No authenticated user found");
      return NextResponse.json(
        { error: "Not authenticated", details: "Please log in to access this resource" },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const userEmail = session.user.email;
    
    // Load environment variables
    const env = loadEnvFromRoot();
    
    // Log environment variables for debugging
    console.log("SUPABASE_URL:", env.SUPABASE_URL ? "Defined" : "Undefined");
    console.log("SUPABASE_KEY:", env.SUPABASE_KEY ? "Defined" : "Undefined");
    
    // Test connection by fetching user-specific x_accounts
    const { data, error, count } = await supabase
      .from("x_accounts")
      .select("*", { count: "exact" })
      .eq("user_id", userId);
    
    if (error) {
      console.error("Error fetching accounts:", error);
      return NextResponse.json(
        { error: `Failed to fetch accounts: ${error.message}` },
        { status: 500 }
      );
    }
    
    // Return the result with user information
    return NextResponse.json({
      message: "Supabase connection successful",
      accountCount: count,
      accounts: data,
      user: {
        id: userId,
        email: userEmail
      }
    });
    
  } catch (error: any) {
    console.error("Error testing Supabase connection:", error);
    return NextResponse.json(
      { error: `An unexpected error occurred: ${error.message}` },
      { status: 500 }
    );
  }
}

// Make this route dynamic to ensure we always get fresh data
export const dynamic = 'force-dynamic';
