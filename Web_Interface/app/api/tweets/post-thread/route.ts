import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseClient, handleSupabaseError } from '@/lib/supabase'
import { spawn } from 'child_process'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { threadIds } = body
    
    if (!threadIds || !Array.isArray(threadIds) || threadIds.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Thread IDs are required and must be a non-empty array' 
        },
        { status: 400 }
      )
    }
    
    console.log(`Posting thread with IDs: ${threadIds.join(', ')}`)
    
    // Get Supabase client
    const supabase = await getSupabaseClient()
    
    if (!supabase) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Supabase client is not available. Please check your configuration.' 
        },
        { status: 500 }
      )
    }
    
    // Fetch all tweets in the thread to make sure they exist
    const { data: tweets, error: tweetsError } = await supabase
      .from('potential_tweets')
      .select('*')
      .in('id', threadIds)
      .order('position', { ascending: true })
    
    if (tweetsError) {
      console.error('Error fetching tweets:', tweetsError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch tweets',
          details: handleSupabaseError(tweetsError) 
        },
        { status: 500 }
      )
    }
    
    if (!tweets || tweets.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No tweets found for the provided IDs' 
        },
        { status: 404 }
      )
    }
    
    // Check if all tweets in the thread exist
    if (tweets.length !== threadIds.length) {
      const foundIds = tweets.map(tweet => tweet.id)
      const missingIds = threadIds.filter(id => !foundIds.includes(id))
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Some tweets in the thread were not found',
          details: {
            missingIds
          }
        },
        { status: 404 }
      )
    }
    
    // Check if any tweets in the thread are already posted
    const postedTweets = tweets.filter(tweet => tweet.status === 'posted' && tweet.posted_at)
    if (postedTweets.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Some tweets in the thread are already posted',
          details: {
            postedTweetIds: postedTweets.map(tweet => tweet.id)
          }
        },
        { status: 400 }
      )
    }
    
    // Update all tweets in the thread to 'posting' status
    const { error: updateError } = await supabase
      .from('potential_tweets')
      .update({ status: 'posting' })
      .in('id', threadIds)
    
    if (updateError) {
      console.error('Error updating tweet statuses:', updateError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to update tweet statuses',
          details: handleSupabaseError(updateError) 
        },
        { status: 500 }
      )
    }
    
    // Run the Twitter posting agent to post the thread
    try {
      // Get the root directory (where the Python scripts are located)
      const rootDir = process.cwd()
      const scriptPath = path.join(rootDir, '..', '7_langchain_twitter_posting_agent_v3.py')
      
      console.log(`Running Twitter posting agent: ${scriptPath}`)
      console.log(`With thread IDs: ${threadIds.join(', ')}`)
      
      // Spawn the Twitter posting agent process with the first tweet ID
      // The agent will handle finding and posting the rest of the thread
      const pythonProcess = spawn('python', [
        scriptPath, 
        '--tweet_id', threadIds[0].toString(),
        '--thread', 'true'
      ])
      
      // Collect stdout and stderr
      let stdout = ''
      let stderr = ''
      
      // Set up a promise to handle the process completion
      const processPromise = new Promise<{exitCode: number, stdout: string, stderr: string}>((resolve, reject) => {
        pythonProcess.stdout.on('data', (data) => {
          const dataStr = data.toString()
          stdout += dataStr
          console.log(`Twitter posting agent stdout: ${dataStr}`)
        })
        
        pythonProcess.stderr.on('data', (data) => {
          const dataStr = data.toString()
          stderr += dataStr
          console.error(`Twitter posting agent stderr: ${dataStr}`)
        })
        
        pythonProcess.on('close', (code) => {
          console.log(`Twitter posting agent process exited with code ${code}`)
          resolve({ exitCode: code || 0, stdout, stderr })
        })
        
        pythonProcess.on('error', (err) => {
          console.error(`Failed to start Twitter posting agent process: ${err}`)
          reject(err)
        })
      })
      
      // Wait for the process to complete with a timeout
      const timeoutPromise = new Promise<{exitCode: number, stdout: string, stderr: string}>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Twitter posting agent process timed out after 60 seconds'))
        }, 60000) // 60 second timeout for threads (longer than single tweets)
      })
      
      // Race the process completion against the timeout
      const result = await Promise.race([processPromise, timeoutPromise])
      
      if (result.exitCode !== 0) {
        // Update the tweets status back to 'scheduled'
        await supabase
          .from('potential_tweets')
          .update({ status: 'failed' })
          .in('id', threadIds)
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'Twitter posting agent process failed',
            details: {
              exitCode: result.exitCode,
              stderr: result.stderr
            }
          },
          { status: 500 }
        )
      }
      
      // Return success response
      return NextResponse.json({
        success: true,
        message: 'Thread posted successfully',
        threadIds
      })
    } catch (error: any) {
      console.error('Error running Twitter posting agent:', error)
      
      // Update the tweets status back to 'scheduled'
      await supabase
        .from('potential_tweets')
        .update({ status: 'scheduled' })
        .in('id', threadIds)
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to run Twitter posting agent',
          details: error.message
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error in post thread API:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to post thread',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
