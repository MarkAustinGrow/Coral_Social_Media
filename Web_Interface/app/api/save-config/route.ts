import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Format the data as environment variables
    let envContent = '# Social Media Agent Configuration\n';
    envContent += '# Generated on ' + new Date().toISOString() + '\n\n';
    
    // API Keys
    envContent += '# API Keys\n';
    if (data.apiKeys.openai) envContent += `OPENAI_API_KEY="${data.apiKeys.openai}"\n`;
    if (data.apiKeys.perplexity) envContent += `PERPLEXITY_API_KEY="${data.apiKeys.perplexity}"\n`;
    if (data.apiKeys.anthropic) envContent += `ANTHROPIC_API_KEY="${data.apiKeys.anthropic}"\n`;
    if (data.apiKeys.twitterBearer) envContent += `TWITTER_BEARER_TOKEN="${data.apiKeys.twitterBearer}"\n`;
    if (data.apiKeys.twitterApiKey) envContent += `TWITTER_API_KEY="${data.apiKeys.twitterApiKey}"\n`;
    if (data.apiKeys.twitterApiSecret) envContent += `TWITTER_API_SECRET="${data.apiKeys.twitterApiSecret}"\n`;
    if (data.apiKeys.twitterAccessToken) envContent += `TWITTER_ACCESS_TOKEN="${data.apiKeys.twitterAccessToken}"\n`;
    if (data.apiKeys.twitterAccessSecret) envContent += `TWITTER_ACCESS_SECRET="${data.apiKeys.twitterAccessSecret}"\n`;
    
    // Database
    envContent += '\n# Database Configuration\n';
    if (data.database.supabaseUrl) envContent += `SUPABASE_URL="${data.database.supabaseUrl}"\n`;
    if (data.database.supabaseKey) envContent += `SUPABASE_KEY="${data.database.supabaseKey}"\n`;
    if (data.database.qdrantUrl) envContent += `QDRANT_URL="${data.database.qdrantUrl}"\n`;
    if (data.database.qdrantCollection) envContent += `QDRANT_COLLECTION="${data.database.qdrantCollection}"\n`;
    
    // Agent Configuration
    envContent += '\n# Agent Configuration\n';
    envContent += `ENABLE_TWEET_SCRAPING="${data.agents.tweetScraping}"\n`;
    envContent += `ENABLE_TWEET_RESEARCH="${data.agents.tweetResearch}"\n`;
    envContent += `ENABLE_BLOG_WRITING="${data.agents.blogWriting}"\n`;
    envContent += `ENABLE_BLOG_TO_TWEET="${data.agents.blogToTweet}"\n`;
    envContent += `ENABLE_X_REPLY="${data.agents.xReply}"\n`;
    envContent += `ENABLE_TWITTER_POSTING="${data.agents.twitterPosting}"\n`;
    envContent += `MAX_CONCURRENT_AGENTS="${data.agents.maxConcurrentAgents}"\n`;
    envContent += `ENABLE_AUTO_RESTART="${data.agents.enableAutoRestart}"\n`;
    
    // Persona Configuration
    envContent += '\n# Persona Configuration\n';
    envContent += `PERSONA_NAME="${data.persona.name}"\n`;
    envContent += `PERSONA_DESCRIPTION="${data.persona.description}"\n`;
    envContent += `PERSONA_TONE="${data.persona.tone}"\n`;
    envContent += `PERSONA_HUMOR="${data.persona.humor}"\n`;
    envContent += `PERSONA_ENTHUSIASM="${data.persona.enthusiasm}"\n`;
    envContent += `PERSONA_ASSERTIVENESS="${data.persona.assertiveness}"\n`;
    
    // Add a flag to indicate setup is complete
    envContent += '\n# Setup Status\n';
    envContent += 'SETUP_COMPLETE="true"\n';
    
    // Write to .env file in the root directory only
    const rootDir = path.resolve(process.cwd(), '../');
    const envPath = path.join(rootDir, '.env');
    
    fs.writeFileSync(envPath, envContent);
    
    console.log('Configuration saved to root .env file:', envPath);
    
    // Save persona data to Supabase
    try {
      // Get Supabase credentials from environment variables
      const supabaseUrl = data.database.supabaseUrl;
      const supabaseKey = data.database.supabaseKey;
      
      if (supabaseUrl && supabaseKey) {
        // Create Supabase client
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Check if any persona exists
        const { data: existingPersonas, error: countError } = await supabase
          .from('personas')
          .select('id')
          .limit(1);
        
        if (countError) {
          console.warn('Warning: Error checking existing personas:', countError);
        } else {
          // Prepare persona data
          const personaData = {
            name: data.persona.name,
            description: data.persona.description,
            tone: data.persona.tone || 50,
            humor: data.persona.humor || 50,
            enthusiasm: data.persona.enthusiasm || 50,
            assertiveness: data.persona.assertiveness || 50,
            updated_at: new Date().toISOString()
          };
          
          // If personas exist, update the first one, otherwise insert a new one
          if (existingPersonas && existingPersonas.length > 0) {
            const { error: updateError } = await supabase
              .from('personas')
              .update(personaData)
              .eq('id', existingPersonas[0].id);
            
            if (updateError) {
              console.warn('Warning: Error updating persona:', updateError);
            } else {
              console.log('Persona updated in Supabase');
            }
          } else {
            // Create a new object with created_at for insertion
            const insertData = {
              ...personaData,
              created_at: new Date().toISOString()
            };
            
            const { error: insertError } = await supabase
              .from('personas')
              .insert(insertData);
            
            if (insertError) {
              console.warn('Warning: Error inserting persona:', insertError);
            } else {
              console.log('Persona inserted into Supabase');
            }
          }
        }
      } else {
        console.warn('Warning: Supabase credentials not available, skipping persona save');
      }
    } catch (personaError) {
      console.warn('Warning: Error saving persona to Supabase:', personaError);
      // Continue with setup even if persona save fails
    }
    
    // Create a simple setup-complete.json file in the public directory
    const setupCompletePath = path.join(process.cwd(), 'public', 'setup-complete.json');
    const setupCompleteContent = JSON.stringify({
      setupComplete: true,
      timestamp: new Date().toISOString()
    }, null, 2);
    
    // Ensure the public directory exists
    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    fs.writeFileSync(setupCompletePath, setupCompleteContent);
    
    // Clear any cached setup status
    cachedSetupStatus = null;
    
    return NextResponse.json({ 
      success: true, 
      message: 'Configuration saved successfully',
      envPath,
      setupCompletePath
    });
  } catch (error) {
    console.error('Error saving configuration:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to save configuration',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// Cache the setup status to prevent multiple file system checks
let cachedSetupStatus: { setupComplete: boolean, timestamp: number } | null = null;
const CACHE_TTL = 5000; // 5 seconds

export async function GET(request: NextRequest) {
  try {
    // Check URL for noCache parameter
    const url = new URL(request.url);
    const noCache = url.searchParams.get('noCache') === 'true';
    
    // Use cached result if available and not expired
    const now = Date.now();
    if (cachedSetupStatus && !noCache && (now - cachedSetupStatus.timestamp < CACHE_TTL)) {
      console.log("Using cached setup status:", cachedSetupStatus);
      return NextResponse.json({ 
        success: true, 
        setupComplete: cachedSetupStatus.setupComplete,
        message: cachedSetupStatus.setupComplete ? 'Setup is complete' : 'Setup is not complete',
        fromCache: true
      });
    }
    
    // Check if setup-complete.json file exists in the public directory
    const setupCompletePath = path.join(process.cwd(), 'public', 'setup-complete.json');
    const exists = fs.existsSync(setupCompletePath);
    
    // Cache the result
    cachedSetupStatus = {
      setupComplete: exists,
      timestamp: now
    };
    
    console.log("Fresh setup status check (using setup-complete.json):", exists);
    
    return NextResponse.json({ 
      success: true, 
      setupComplete: exists,
      message: exists ? 'Setup is complete' : 'Setup is not complete',
      fromCache: false,
      method: 'setup-complete.json'
    });
  } catch (error) {
    console.error('Error checking setup status:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to check setup status',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
