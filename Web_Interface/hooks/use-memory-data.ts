"use client"

import { useState, useEffect, useCallback } from "react"
import { DateRange } from "react-day-picker"

// Define types for memory data
export interface QdrantMemory {
  point_id: string
  tweet_text: string
  analysis: string
  topics: string[]
  sentiment: "positive" | "negative" | "neutral"
  persona_name: string
  date: string
  confidence_score: number
  related_entities: string[]
  metadata: {
    author: string
    engagement_score: number
    retweet_count: number
    like_count: number
    source_url: string
  }
}

export interface MemoryFilters {
  topic: string
  sentiment: string
  persona: string
  dateRange: DateRange | undefined
}

export interface UseMemoryDataReturn {
  memories: QdrantMemory[]
  isLoading: boolean
  error: Error | null
  totalCount: number
  queryTime: number
  nextPageOffset: string | null
  message: string | null
  searchMemories: (query: string, filters: MemoryFilters, limit?: number, offset?: number) => Promise<void>
  loadMoreMemories: () => Promise<void>
  deleteMemory: (pointId: string) => Promise<boolean>
  resetFilters: () => void
}

export function useMemoryData(): UseMemoryDataReturn {
  const [memories, setMemories] = useState<QdrantMemory[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const [totalCount, setTotalCount] = useState<number>(0)
  const [queryTime, setQueryTime] = useState<number>(0)
  const [nextPageOffset, setNextPageOffset] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [currentQuery, setCurrentQuery] = useState<string>("")
  const [currentFilters, setCurrentFilters] = useState<MemoryFilters>({
    topic: "all",
    sentiment: "all",
    persona: "all",
    dateRange: undefined,
  })
  const [currentLimit, setCurrentLimit] = useState<number>(20)

  const resetFilters = useCallback(() => {
    // This function is just a placeholder for resetting filters
    // The actual filter state is managed in the component using this hook
  }, [])

  const searchMemories = useCallback(
    async (
      query: string,
      filters: MemoryFilters,
      limit: number = 20,
      offset: number = 0
    ): Promise<void> => {
      setIsLoading(true)
      setError(null)
      setMessage(null)
      
      // Store current search parameters for pagination
      setCurrentQuery(query)
      setCurrentFilters(filters)
      setCurrentLimit(limit)

      try {
        // Build query parameters
        const params = new URLSearchParams()
        if (query) params.append("query", query)
        if (limit) params.append("limit", limit.toString())
        if (offset) params.append("offset", offset.toString())

        // Add filters as JSON
        const filtersToSend: Record<string, any> = {}
        
        if (filters.topic && filters.topic !== "all") {
          filtersToSend.topics = [filters.topic]
        }
        
        if (filters.sentiment && filters.sentiment !== "all") {
          filtersToSend.sentiment = filters.sentiment
        }
        
        if (filters.persona && filters.persona !== "all") {
          filtersToSend.persona = filters.persona
        }
        
        if (filters.dateRange?.from && filters.dateRange?.to) {
          filtersToSend.dateRange = filters.dateRange
        }
        
        params.append("filters", JSON.stringify(filtersToSend))

        // Make API request
        const response = await fetch(`/api/qdrant-memory?${params.toString()}`)
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (!data.success) {
          throw new Error(data.error || "Unknown error")
        }
        
        setMemories(data.result)
        setTotalCount(data.total || data.result.length)
        setQueryTime(data.query_time_ms || 0)
        setNextPageOffset(data.next_page_offset || null)
        setMessage(data.message || null)
      } catch (err) {
        console.error("Error searching memories:", err)
        setError(err instanceof Error ? err : new Error(String(err)))
        setMemories([])
        setTotalCount(0)
        setQueryTime(0)
        setNextPageOffset(null)
      } finally {
        setIsLoading(false)
      }
    },
    []
  )
  
  const loadMoreMemories = useCallback(async (): Promise<void> => {
    if (!nextPageOffset || isLoading) return
    
    setIsLoading(true)
    
    try {
      // Build query parameters
      const params = new URLSearchParams()
      if (currentQuery) params.append("query", currentQuery)
      params.append("limit", currentLimit.toString())
      params.append("offset", nextPageOffset)
      
      // Add filters as JSON
      const filtersToSend: Record<string, any> = {}
      
      if (currentFilters.topic && currentFilters.topic !== "all") {
        filtersToSend.topics = [currentFilters.topic]
      }
      
      if (currentFilters.sentiment && currentFilters.sentiment !== "all") {
        filtersToSend.sentiment = currentFilters.sentiment
      }
      
      if (currentFilters.persona && currentFilters.persona !== "all") {
        filtersToSend.persona = currentFilters.persona
      }
      
      if (currentFilters.dateRange?.from && currentFilters.dateRange?.to) {
        filtersToSend.dateRange = currentFilters.dateRange
      }
      
      params.append("filters", JSON.stringify(filtersToSend))
      
      // Make API request
      const response = await fetch(`/api/qdrant-memory?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || "Unknown error")
      }
      
      setMemories(prev => [...prev, ...data.result])
      setTotalCount(prev => prev + data.result.length)
      setNextPageOffset(data.next_page_offset || null)
    } catch (err) {
      console.error("Error loading more memories:", err)
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
    }
  }, [nextPageOffset, isLoading, currentQuery, currentFilters, currentLimit])

  const deleteMemory = useCallback(async (pointId: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/qdrant-memory", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ point_id: pointId }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Unknown error")
      }

      // Remove the deleted memory from the state
      setMemories((prev) => prev.filter((memory) => memory.point_id !== pointId))
      setTotalCount((prev) => Math.max(0, prev - 1))

      return true
    } catch (err) {
      console.error("Error deleting memory:", err)
      setError(err instanceof Error ? err : new Error(String(err)))
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    memories,
    isLoading,
    error,
    totalCount,
    queryTime,
    nextPageOffset,
    message,
    searchMemories,
    loadMoreMemories,
    deleteMemory,
    resetFilters,
  }
}
