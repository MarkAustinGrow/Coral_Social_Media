"use client"

import { useState, useEffect } from 'react'
import { DataState } from '@/lib/supabase'

// Define types for blog posts and critiques based on the actual database schema
export interface BlogPost {
  id: number
  title: string
  content: string
  word_count: number
  status: string
  created_at: string
  published_at?: string
  updated_at?: string
  review_status?: string
  fact_checked_at?: string
  [key: string]: any
}

export interface BlogCritique {
  id: number
  blog_id: number
  critique: string
  summary: string
  decision: string
  created_at: string
  [key: string]: any
}

export interface BlogWithCritique extends BlogPost {
  critique: BlogCritique | null
}

// Hook for fetching blog data from our API
export function useBlogData(
  options?: {
    status?: string
    limit?: number
    withCritiques?: boolean
  },
  refreshKey?: number
): DataState<BlogWithCritique[]> {
  // Initialize with loading state
  const [state, setState] = useState<DataState<BlogWithCritique[]>>({
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
        let url = '/api/blogs'
        const params = new URLSearchParams()
        
        if (options?.status) {
          params.append('status', options.status)
        }
        
        if (options?.limit) {
          params.append('limit', options.limit.toString())
        }
        
        if (options?.withCritiques) {
          params.append('with_critiques', 'true')
        }
        
        // Add query parameters to URL if any
        if (params.toString()) {
          url += `?${params.toString()}`
        }
        
        // Fetch data from API
        const response = await fetch(url)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch blogs: ${response.statusText}`)
        }
        
        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch blogs')
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
              message: error.message || 'An error occurred while fetching blogs',
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

// Mock data for fallback
const mockBlogs: BlogWithCritique[] = [
  {
    id: 1,
    title: "The Future of AI in Social Media Marketing",
    content: "Lorem ipsum dolor sit amet...",
    word_count: 1250,
    status: "published",
    created_at: "2025-06-08T14:30:00Z",
    critique: {
      id: 101,
      blog_id: 1,
      critique: "This blog post provides excellent insights into AI applications in social media marketing...",
      summary: "Well-researched and informative article on AI in social media marketing.",
      decision: "approved",
      created_at: "2025-06-08T16:30:00Z"
    }
  },
  {
    id: 2,
    title: "10 Ways to Improve Your Twitter Engagement",
    content: "Lorem ipsum dolor sit amet...",
    word_count: 980,
    status: "review",
    created_at: "2025-06-09T10:15:00Z",
    critique: {
      id: 102,
      blog_id: 2,
      critique: "The article provides good tips but needs more concrete examples...",
      summary: "Good content but needs more specific examples.",
      decision: "pending",
      created_at: "2025-06-09T14:20:00Z"
    }
  },
  {
    id: 3,
    title: "Understanding Algorithm Changes in 2025",
    content: "Lorem ipsum dolor sit amet...",
    word_count: 1540,
    status: "draft",
    created_at: "2025-06-10T08:45:00Z",
    critique: null
  },
  {
    id: 4,
    title: "How to Create Viral Content That Converts",
    content: "Lorem ipsum dolor sit amet...",
    word_count: 1120,
    status: "published",
    created_at: "2025-06-07T16:20:00Z",
    critique: {
      id: 104,
      blog_id: 4,
      critique: "Excellent analysis of viral content strategies with actionable advice...",
      summary: "Comprehensive guide to creating viral content with conversion focus.",
      decision: "approved",
      created_at: "2025-06-07T18:45:00Z"
    }
  },
  {
    id: 5,
    title: "The Psychology Behind Social Sharing",
    content: "Lorem ipsum dolor sit amet...",
    word_count: 1680,
    status: "review",
    created_at: "2025-06-06T11:30:00Z",
    critique: {
      id: 105,
      blog_id: 5,
      critique: "The psychological analysis is sound but could use more recent research...",
      summary: "Good psychological insights but needs updated research.",
      decision: "pending",
      created_at: "2025-06-06T15:10:00Z"
    }
  }
]

// Fallback hook for when API is not available
export function useFallbackBlogData(
  options?: {
    status?: string
  },
  simulateLoading = false,
  simulateError = false
): DataState<BlogWithCritique[]> {
  const [state, setState] = useState<DataState<BlogWithCritique[]>>({
    data: null,
    isLoading: simulateLoading,
    error: null,
  })

  useEffect(() => {
    // Skip execution during SSR
    if (typeof window === 'undefined') {
      return
    }
    
    let isMounted = true
    
    const timer = setTimeout(() => {
      if (isMounted) {
        if (simulateError) {
          setState({
            data: null,
            isLoading: false,
            error: {
              message: 'This is a simulated error. In a real application, this would be an actual error from the API.',
            },
          })
        } else {
          // Filter blogs by status if provided
          const filteredBlogs = options?.status
            ? mockBlogs.filter(blog => blog.status === options.status)
            : mockBlogs
            
          setState({
            data: filteredBlogs,
            isLoading: false,
            error: null,
          })
        }
      }
    }, simulateLoading ? 1500 : 0)
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [JSON.stringify(options), simulateLoading, simulateError])
  
  return state
}
