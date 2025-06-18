import { useState, useEffect, useCallback } from 'react'
import { DataState } from '@/lib/supabase'
import { toast } from '@/hooks/use-toast'

export type SystemConfig = {
  id: number;
  key: string;
  value: {
    systemName: string;
    environment: string;
    logLevel: string;
    maxConcurrentAgents: number;
    enableAutoRestart: boolean;
    enableErrorNotifications: boolean;
    maxLogRetentionDays: number;
    defaultLanguage: string;
    timeZone: string;
  };
  description: string;
  created_at: string;
  updated_at: string;
}

export function useSystemConfig(): DataState<SystemConfig> & {
  refreshConfig: () => Promise<void>;
  updateConfig: (newConfig: SystemConfig['value']) => Promise<SystemConfig | null>;
} {
  const [state, setState] = useState<DataState<SystemConfig>>({
    data: null,
    isLoading: true,
    error: null
  })

  const fetchConfig = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await fetch('/api/config')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch system configuration')
      }
      
      const data = await response.json()
      setState({ data, isLoading: false, error: null })
    } catch (error) {
      console.error('Error fetching system config:', error)
      setState({
        data: null,
        isLoading: false,
        error: {
          message: error instanceof Error ? error.message : 'An unknown error occurred',
        }
      })
    }
  }, [])

  const refreshConfig = useCallback(async () => {
    await fetchConfig()
  }, [fetchConfig])

  const updateConfig = useCallback(async (newConfig: SystemConfig['value']): Promise<SystemConfig | null> => {
    try {
      const response = await fetch('/api/config/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: newConfig }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update system configuration')
      }
      
      const updatedConfig = await response.json()
      
      // Update local state
      setState(prev => ({
        ...prev,
        data: updatedConfig
      }))
      
      // Show success toast
      toast({
        title: "Configuration updated",
        description: "System configuration has been updated successfully.",
      })
      
      return updatedConfig
    } catch (error) {
      console.error('Error updating system config:', error)
      
      // Show error toast
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update system configuration",
        variant: "destructive",
      })
      
      return null
    }
  }, [])

  // Fetch config on component mount
  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  return {
    ...state,
    refreshConfig,
    updateConfig
  }
}
