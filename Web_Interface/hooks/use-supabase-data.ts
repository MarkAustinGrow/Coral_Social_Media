"use client"

import { useState, useEffect } from 'react'
import { DataState, getSupabaseClient, handleSupabaseError } from '@/lib/supabase'

// Generic hook for fetching data from Supabase
export function useSupabaseData<T>(
  tableName: string,
  options?: {
    columns?: string
    filter?: { column: string; value: any }[]
    limit?: number
    orderBy?: { column: string; ascending?: boolean }
  }
): DataState<T[]> {
  // Initialize with loading state
  const [state, setState] = useState<DataState<T[]>>({
    data: null,
    isLoading: true,
    error: null,
  })

  // Use effect to fetch data only on client side
  useEffect(() => {
    // Skip execution during SSR
    if (typeof window === 'undefined') {
      return;
    }
    
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        // Get Supabase client (now async)
        const supabase = await getSupabaseClient()
        
        // If Supabase client is not available, return error
        if (!supabase) {
          if (isMounted) {
            setState({
              data: null,
              isLoading: false,
              error: {
                message: 'Supabase client is not available. Please check your configuration.',
              },
            })
          }
          return
        }

        // Start query
        let query = supabase.from(tableName).select(options?.columns || '*')

        // Apply filters if provided
        if (options?.filter && options.filter.length > 0) {
          options.filter.forEach((filter) => {
            query = query.eq(filter.column, filter.value)
          })
        }

        // Apply order if provided
        if (options?.orderBy) {
          query = query.order(options.orderBy.column, {
            ascending: options.orderBy.ascending ?? false,
          })
        }

        // Apply limit if provided
        if (options?.limit) {
          query = query.limit(options.limit)
        }

        // Execute query
        const { data, error } = await query

        if (error) {
          if (isMounted) {
            setState({
              data: null,
              isLoading: false,
              error: handleSupabaseError(error),
            })
          }
          return
        }

        if (isMounted) {
          setState({
            data: data as T[],
            isLoading: false,
            error: null,
          })
        }
      } catch (error: any) {
        if (isMounted) {
          setState({
            data: null,
            isLoading: false,
            error: handleSupabaseError(error),
          })
        }
      }
    }

    fetchData()
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    }
  }, [tableName, JSON.stringify(options)])

  return state
}

// Fallback hook for when Supabase is not available
export function useFallbackData<T>(
  fallbackData: T[] | null = null,
  simulateLoading = false,
  simulateError = false
): DataState<T[]> {
  const [state, setState] = useState<DataState<T[]>>({
    data: fallbackData,
    isLoading: simulateLoading,
    error: simulateError
      ? {
          message: 'This is a simulated error. In a real application, this would be an actual error from the database.',
        }
      : null,
  })

  useEffect(() => {
    // Skip execution during SSR
    if (typeof window === 'undefined') {
      return;
    }
    
    let isMounted = true;
    
    if (simulateLoading) {
      const timer = setTimeout(() => {
        if (isMounted) {
          setState({
            data: simulateError ? null : fallbackData,
            isLoading: false,
            error: simulateError
              ? {
                  message: 'This is a simulated error. In a real application, this would be an actual error from the database.',
                }
              : null,
          })
        }
      }, 1500)

      return () => {
        isMounted = false;
        clearTimeout(timer);
      }
    }
    
    return () => {
      isMounted = false;
    }
  }, [fallbackData, simulateLoading, simulateError])

  return state
}
