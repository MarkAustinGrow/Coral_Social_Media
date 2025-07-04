"use client"

import { useState, useEffect } from 'react'
import { DataState } from '@/lib/supabase'

// Define types for tweets based on the potential_tweets table
export interface Tweet {
  id: number
  blog_post_id: number | null
  content: string
  position: number | null
  status: string
  scheduled_for: string | null
  posted_at: string | null
  created_at: string
  [key: string]: any
}

// Hook for fetching tweet data from our API
export function useTweetData(
  options?: {
    status?: string
    limit?: number
    blogPostId?: number
  },
  refreshKey?: number
): DataState<Tweet[]> {
  // Initialize with loading state
  const [state, setState] = useState<DataState<Tweet[]>>({
    data: null,
    isLoading: true,
    error: null,
  })

  // Use effect to fetch data only on client side
  useEffect(() => {
    // Skip execution during SSR
    if (typeof window === 'undefined') {
      return
    }
    
    let isMounted = true
    
    const fetchData = async () => {
      try {
        // Build URL with query parameters
        let url = '/api/tweets'
        const params = new URLSearchParams()
        
        if (options?.status) {
          params.append('status', options.status)
        }
        
        if (options?.limit) {
          params.append('limit', options.limit.toString())
        }
        
        if (options?.blogPostId) {
          params.append('blog_post_id', options.blogPostId.toString())
        }
        
        // Add query parameters to URL if any
        if (params.toString()) {
          url += `?${params.toString()}`
        }
        
        // Fetch data from API
        const response = await fetch(url)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch tweets: ${response.statusText}`)
        }
        
        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch tweets')
        }
        
        if (isMounted) {
          setState({
            data: result.data,
            isLoading: false,
            error: null,
          })
        }
      } catch (error: any) {
        if (isMounted) {
          setState({
            data: null,
            isLoading: false,
            error: {
              message: error.message || 'An error occurred while fetching tweets',
            },
          })
        }
      }
    }
    
    fetchData()
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false
    }
  }, [JSON.stringify(options), refreshKey])
  
  return state
}

// Function to post a tweet or thread
export async function postTweet(tweetId: number): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`/api/tweets/post`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tweetId }),
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to post tweet')
    }
    
    return { 
      success: true, 
      message: result.message || 'Tweet posted successfully' 
    }
  } catch (error: any) {
    return { 
      success: false, 
      message: error.message || 'An error occurred while posting the tweet' 
    }
  }
}

// Function to post a thread
export async function postThread(threadIds: number[]): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`/api/tweets/post-thread`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ threadIds }),
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to post thread')
    }
    
    return { 
      success: true, 
      message: result.message || 'Thread posted successfully' 
    }
  } catch (error: any) {
    return { 
      success: false, 
      message: error.message || 'An error occurred while posting the thread' 
    }
  }
}

// Function to delete a tweet
export async function deleteTweet(tweetId: number): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`/api/tweets/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tweetId }),
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete tweet')
    }
    
    return { 
      success: true, 
      message: result.message || 'Tweet deleted successfully' 
    }
  } catch (error: any) {
    return { 
      success: false, 
      message: error.message || 'An error occurred while deleting the tweet' 
    }
  }
}

// Function to update a tweet
export async function updateTweet(tweetId: number, content: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`/api/tweets/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tweetId, content }),
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to update tweet')
    }
    
    return { 
      success: true, 
      message: result.message || 'Tweet updated successfully' 
    }
  } catch (error: any) {
    return { 
      success: false, 
      message: error.message || 'An error occurred while updating the tweet' 
    }
  }
}
