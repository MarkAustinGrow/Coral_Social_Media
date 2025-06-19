"use client"

import { useState, useEffect, useCallback } from "react"
import { DateRange } from "react-day-picker"

// Define types for memory data
export interface QdrantMemory {
  point_id: string
  tweet_text: string
  topics: string[]
  sentiment: "positive" | "negative" | "neutral"
  persona_name: string
  date: string
  confidence_score: number
}

export interface QdrantMemoryDetail extends QdrantMemory {
  analysis: string
  related_entities: string[]
  metadata: {
    author: string
    engagement_score: number
    retweet_count: number
    like_count: number
    source_url: string
    type?: string
    alignment_explanation?: string
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
  selectedMemory: QdrantMemoryDetail | null
  isLoading: boolean
  isLoadingDetail: boolean
  error: Error | null
  totalCount: number
  queryTime: number
  message: string | null
  searchMemories: (query: string, filters: MemoryFilters) => Promise<void>
  getMemoryDetail: (pointId: string) => Promise<void>
  deleteMemory: (pointId: string) => Promise<boolean>
  resetFilters: () => void
}

export function useMemoryData(): UseMemoryDataReturn {
  const [memories, setMemories] = useState<QdrantMemory[]>([])
  const [selectedMemory, setSelectedMemory] = useState<QdrantMemoryDetail | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const [totalCount, setTotalCount] = useState<number>(0)
  const [queryTime, setQueryTime] = useState<number>(0)
  const [message, setMessage] = useState<string | null>(null)
  const [currentQuery, setCurrentQuery] = useState<string>("")
  const [currentFilters, setCurrentFilters] = useState<MemoryFilters>({
    topic: "all",
    sentiment: "all",
    persona: "all",
    dateRange: undefined,
  })

  const resetFilters = useCallback(() => {
    // This function is just a placeholder for resetting filters
    // The actual filter state is managed in the component using this hook
  }, [])

  const searchMemories = useCallback(
    async (
      query: string,
      filters: MemoryFilters
    ): Promise<void> => {
      setIsLoading(true)
      setError(null)
      setMessage(null)
      setSelectedMemory(null)
      
      // Store current search parameters
      setCurrentQuery(query)
      setCurrentFilters(filters)

      try {
        // Build query parameters
        const params = new URLSearchParams()
        if (query) params.append("query", query)

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
        setMessage(data.message || null)
      } catch (err) {
        console.error("Error searching memories:", err)
        setError(err instanceof Error ? err : new Error(String(err)))
        setMemories([])
        setTotalCount(0)
        setQueryTime(0)
      } finally {
        setIsLoading(false)
      }
    },
    []
  )
  
  const getMemoryDetail = useCallback(async (pointId: string): Promise<void> => {
    if (!pointId) return
    
    setIsLoadingDetail(true)
    setError(null)
    
    try {
      // Make API request to get memory details
      const response = await fetch(`/api/qdrant-memory/${pointId}`)
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || "Unknown error")
      }
      
      setSelectedMemory(data.memory)
    } catch (err) {
      console.error("Error fetching memory details:", err)
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoadingDetail(false)
    }
  }, [])

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
    selectedMemory,
    isLoading,
    isLoadingDetail,
    error,
    totalCount,
    queryTime,
    message,
    searchMemories,
    getMemoryDetail,
    deleteMemory,
    resetFilters,
  }
}
