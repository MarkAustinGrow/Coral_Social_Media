import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { TwitterApi } from "twitter-api-v2";
import { loadEnvFromRoot } from "@/lib/env-loader";

export async function POST() {
  try {
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
    
    // Initialize Twitter API credentials
    const twitterBearerToken = env.TWITTER_BEARER_TOKEN;
    const twitterApiKey = env.TWITTER_API_KEY;
    const twitterApiSecret = env.TWITTER_API_SECRET;
    const twitterAccessToken = env.TWITTER_ACCESS_TOKEN;
    const twitterAccessSecret = env.TWITTER_ACCESS_SECRET;
    
    if (!twitterBearerToken) {
      return NextResponse.json(
        { error: "Twitter API bearer token not configured" },
        { status: 500 }
      );
    }
    
    // Initialize Twitter API client
    const twitterClient = new TwitterApi({
      appKey: twitterApiKey,
      appSecret: twitterApiSecret,
      accessToken: twitterAccessToken,
      accessSecret: twitterAccessSecret,
    });
    
    // Get authenticated user's ID
    const currentUser = await twitterClient.v2.me();
    if (!currentUser.data || !currentUser.data.id) {
      return NextResponse.json(
        { error: "Failed to get authenticated user" },
        { status: 500 }
      );
    }
    
    const userId = currentUser.data.id;
    
    // Fetch followed accounts
    const followedAccounts = await twitterClient.v2.following(userId, {
      max_results: 100, // Maximum allowed by the API
      "user.fields": "name,username,profile_image_url",
    });
    
    if (!followedAccounts.data || !followedAccounts.data.length) {
      return NextResponse.json(
        { message: "No followed accounts found" },
        { status: 200 }
      );
    }
    
    // Format accounts for Supabase
    const accountsToInsert = followedAccounts.data.map((account: { username: string; name: string }, index: number) => ({
      username: account.username,
      display_name: account.name,
      priority: 5, // Default priority
      last_fetched_at: null,
      created_at: new Date().toISOString(),
    }));
    
    // Insert accounts into Supabase
    const { data, error } = await supabase
      .from("x_accounts")
      .upsert(accountsToInsert, { onConflict: "username" })
      .select();
    
    if (error) {
      console.error("Error inserting accounts:", error);
      return NextResponse.json(
        { error: `Failed to insert accounts: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: `Successfully imported ${accountsToInsert.length} accounts from Twitter.`,
      count: accountsToInsert.length,
      accounts: data,
    });
    
  } catch (error: any) {
    console.error("Error importing followed accounts:", error);
    return NextResponse.json(
      { error: `An unexpected error occurred: ${error.message}` },
      { status: 500 }
    );
  }
}
