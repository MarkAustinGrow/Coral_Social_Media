import { useState, useEffect, useCallback } from 'react'
import { DataState } from '@/lib/supabase'

export type EnvData = {
  // Supabase
  SUPABASE_URL?: string;
  SUPABASE_KEY?: string;
  
  // API Keys
  OPENAI_API_KEY?: string;
  TWITTER_CLIENT_ID?: string;
  TWITTER_CLIENT_SECRET?: string;
  TWITTER_OAUTH2_TOKEN?: string;
  TWITTER_API_KEY?: string;
  TWITTER_API_SECRET?: string;
  TWITTER_ACCESS_TOKEN?: string;
  TWITTER_ACCESS_TOKEN_SECRET?: string;
  TWITTER_BEARER_TOKEN?: string;
  PERPLEXITY_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  WORLD_NEWS_API_KEY?: string;
  
  // Agent Configuration
  ENABLE_TWEET_SCRAPING?: string;
  ENABLE_TWEET_RESEARCH?: string;
  ENABLE_BLOG_WRITING?: string;
  ENABLE_BLOG_TO_TWEET?: string;
  ENABLE_X_REPLY?: string;
  ENABLE_TWITTER_POSTING?: string;
  MAX_CONCURRENT_AGENTS?: string;
  ENABLE_AUTO_RESTART?: string;
  
  // Other
  SETUP_COMPLETE?: string;
}

export function useEnvData(): DataState<EnvData> & {
  refreshEnvData: () => Promise<void>;
} {
  const [state, setState] = useState<DataState<EnvData>>({
    data: null,
    isLoading: true,
    error: null
  })

  const fetchEnvData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await fetch('/api/env')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch environment variables')
      }
      
      const data = await response.json()
      setState({ data, isLoading: false, error: null })
    } catch (error) {
      console.error('Error fetching environment variables:', error)
      setState({
        data: null,
        isLoading: false,
        error: {
          message: error instanceof Error ? error.message : 'An unknown error occurred',
        }
      })
    }
  }, [])

  const refreshEnvData = useCallback(async () => {
    await fetchEnvData()
  }, [fetchEnvData])

  // Fetch env data on component mount
  useEffect(() => {
    fetchEnvData()
  }, [fetchEnvData])

  return {
    ...state,
    refreshEnvData
  }
}
