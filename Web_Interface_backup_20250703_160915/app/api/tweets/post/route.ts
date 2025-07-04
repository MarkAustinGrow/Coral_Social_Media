import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseClient, handleSupabaseError } from '@/lib/supabase'
import { spawn } from 'child_process'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { tweetId } = body
    
    if (!tweetId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Tweet ID is required' 
        },
        { status: 400 }
      )
    }
    
    console.log(`Posting tweet with ID: ${tweetId}`)
    
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
    
    // Fetch the tweet to make sure it exists
    const { data: tweet, error: tweetError } = await supabase
      .from('potential_tweets')
      .select('*')
      .eq('id', tweetId)
      .single()
    
    if (tweetError) {
      console.error('Error fetching tweet:', tweetError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch tweet',
          details: handleSupabaseError(tweetError) 
        },
        { status: 500 }
      )
    }
    
    if (!tweet) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Tweet not found' 
        },
        { status: 404 }
      )
    }
    
    // Check if the tweet is already posted
    if (tweet.status === 'posted' && tweet.posted_at) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Tweet is already posted',
          details: {
            postedAt: tweet.posted_at
          }
        },
        { status: 400 }
      )
    }
    
    // Update the tweet status to 'posting'
    const { error: updateError } = await supabase
      .from('potential_tweets')
      .update({ status: 'posting' })
      .eq('id', tweetId)
    
    if (updateError) {
      console.error('Error updating tweet status:', updateError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to update tweet status',
          details: handleSupabaseError(updateError) 
        },
        { status: 500 }
      )
    }
    
    // Run the Twitter posting agent to post the tweet
    try {
      // Get the root directory (where the Python scripts are located)
      const rootDir = process.cwd()
      const scriptPath = path.join(rootDir, '..', '7_langchain_twitter_posting_agent_v3.py')
      
      console.log(`Running Twitter posting agent: ${scriptPath}`)
      console.log(`With tweet ID: ${tweetId}`)
      
      // Spawn the Twitter posting agent process
      const pythonProcess = spawn('python', [scriptPath, '--tweet_id', tweetId.toString()])
      
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
          reject(new Error('Twitter posting agent process timed out after 30 seconds'))
        }, 30000) // 30 second timeout
      })
      
      // Race the process completion against the timeout
      const result = await Promise.race([processPromise, timeoutPromise])
      
      if (result.exitCode !== 0) {
        // Update the tweet status back to 'scheduled'
        await supabase
          .from('potential_tweets')
          .update({ status: 'failed' })
          .eq('id', tweetId)
        
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
        message: 'Tweet posted successfully',
        tweetId
      })
    } catch (error: any) {
      console.error('Error running Twitter posting agent:', error)
      
      // Update the tweet status back to 'scheduled'
      await supabase
        .from('potential_tweets')
        .update({ status: 'scheduled' })
        .eq('id', tweetId)
      
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
    console.error('Error in post tweet API:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to post tweet',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
