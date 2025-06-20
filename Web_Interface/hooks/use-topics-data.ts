import { useState, useEffect, useCallback } from 'react'
import { DataState } from '@/lib/supabase'

export type Topic = {
  id: number;
  topic: string;
  engagement_score: number;
  is_active: boolean;
  last_updated: string;
  last_used_at: string | null;
  topic_description: string | null;
  subtopics: string[] | null;
  category: string | null;
}

export function useTopicsData(): DataState<Topic[]> & {
  refreshTopics: () => Promise<void>;
  addTopic: (newTopic: Partial<Topic>) => Promise<Topic | null>;
  updateTopicStatus: (id: number, isActive: boolean) => Promise<Topic | null>;
  deleteTopic: (id: number) => Promise<boolean>;
} {
  const [state, setState] = useState<DataState<Topic[]>>({
    data: null,
    isLoading: true,
    error: null
  })

  const fetchTopics = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await fetch('/api/topics')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch topics')
      }
      
      const data = await response.json()
      setState({ data, isLoading: false, error: null })
    } catch (error) {
      console.error('Error fetching topics:', error)
      setState({
        data: null,
        isLoading: false,
        error: {
          message: error instanceof Error ? error.message : 'An unknown error occurred',
        }
      })
    }
  }, [])

  const refreshTopics = useCallback(async () => {
    await fetchTopics()
  }, [fetchTopics])

  const addTopic = useCallback(async (newTopic: Partial<Topic>): Promise<Topic | null> => {
    try {
      const response = await fetch('/api/topics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTopic),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add topic')
      }
      
      const addedTopic = await response.json()
      
      // Update local state
      setState(prev => ({
        ...prev,
        data: prev.data ? [...prev.data, addedTopic] : [addedTopic]
      }))
      
      return addedTopic
    } catch (error) {
      console.error('Error adding topic:', error)
      return null
    }
  }, [])

  const updateTopicStatus = useCallback(async (id: number, isActive: boolean): Promise<Topic | null> => {
    try {
      const response = await fetch('/api/topics/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topicId: id, isActive }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update topic status')
      }
      
      const updatedTopic = await response.json()
      
      // Update local state
      setState(prev => ({
        ...prev,
        data: prev.data 
          ? prev.data.map(topic => 
              topic.id === id ? updatedTopic : topic
            )
          : null
      }))
      
      return updatedTopic
    } catch (error) {
      console.error('Error updating topic status:', error)
      return null
    }
  }, [])

  const deleteTopic = useCallback(async (id: number): Promise<boolean> => {
    try {
      const response = await fetch(`/api/topics/${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete topic')
      }
      
      // Update local state
      setState(prev => ({
        ...prev,
        data: prev.data 
          ? prev.data.filter(topic => topic.id !== id)
          : null
      }))
      
      return true
    } catch (error) {
      console.error('Error deleting topic:', error)
      return false
    }
  }, [])

  // Fetch topics on component mount
  useEffect(() => {
    fetchTopics()
  }, [fetchTopics])

  return {
    ...state,
    refreshTopics,
    addTopic,
    updateTopicStatus,
    deleteTopic
  }
}
