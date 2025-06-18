"use client"

import { useState, useEffect, useCallback } from 'react'
import { toast } from '@/hooks/use-toast'

export interface CalendarEvent {
  id: number | string;
  title: string;
  type: 'tweet' | 'thread';
  status: string;
  date: string;
  content?: string;
  blog_post_id?: number;
  tweets?: any[];
  [key: string]: any;
}

export interface CalendarDataState {
  data: CalendarEvent[] | null;
  isLoading: boolean;
  error: { message: string } | null;
}

export function useCalendarData(
  options?: {
    startDate?: string;
    endDate?: string;
    status?: string;
  },
  refreshKey?: number
): CalendarDataState & {
  refreshEvents: () => Promise<void>;
  scheduleEvent: (event: any) => Promise<any>;
  rescheduleEvent: (event: any, newDate: string) => Promise<any>;
  deleteEvent: (event: any) => Promise<any>;
} {
  // Initialize with loading state
  const [state, setState] = useState<CalendarDataState>({
    data: null,
    isLoading: true,
    error: null,
  })

  // Function to fetch calendar events
  const fetchEvents = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      
      // Build URL with query parameters
      let url = '/api/calendar/events'
      const params = new URLSearchParams()
      
      // Default to current month if no dates provided
      const now = new Date()
      const startDate = options?.startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const endDate = options?.endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()
      
      params.append('startDate', startDate)
      params.append('endDate', endDate)
      
      if (options?.status) {
        params.append('status', options.status)
      }
      
      // Add query parameters to URL
      url += `?${params.toString()}`
      
      // Fetch data from API
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch calendar events: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch calendar events')
      }
      
      setState({
        data: result.data,
        isLoading: false,
        error: null,
      })
    } catch (error: any) {
      setState({
        data: null,
        isLoading: false,
        error: {
          message: error.message || 'An error occurred while fetching calendar events',
        },
      })
    }
  }, [options?.startDate, options?.endDate, options?.status])

  // Function to refresh events
  const refreshEvents = useCallback(async () => {
    await fetchEvents()
  }, [fetchEvents])

  // Function to schedule a new event
  const scheduleEvent = useCallback(async (event: any) => {
    try {
      const response = await fetch('/api/calendar/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to schedule event')
      }
      
      const result = await response.json()
      
      // Show success toast
      toast({
        title: "Event scheduled",
        description: result.message || "Event has been scheduled successfully.",
      })
      
      // Refresh events
      await fetchEvents()
      
      return result
    } catch (error: any) {
      // Show error toast
      toast({
        title: "Scheduling failed",
        description: error.message || "Failed to schedule event",
        variant: "destructive",
      })
      
      throw error
    }
  }, [fetchEvents])

  // Function to reschedule an event
  const rescheduleEvent = useCallback(async (event: any, newDate: string) => {
    try {
      const payload = {
        id: event.id,
        newScheduledFor: newDate,
        isThread: event.type === 'thread',
        blogPostId: event.blog_post_id,
      }
      
      const response = await fetch('/api/calendar/reschedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to reschedule event')
      }
      
      const result = await response.json()
      
      // Show success toast
      toast({
        title: "Event rescheduled",
        description: result.message || "Event has been rescheduled successfully.",
      })
      
      // Refresh events
      await fetchEvents()
      
      return result
    } catch (error: any) {
      // Show error toast
      toast({
        title: "Rescheduling failed",
        description: error.message || "Failed to reschedule event",
        variant: "destructive",
      })
      
      throw error
    }
  }, [fetchEvents])

  // Function to delete an event
  const deleteEvent = useCallback(async (event: any) => {
    try {
      const payload = {
        id: event.id,
        isThread: event.type === 'thread',
        blogPostId: event.blog_post_id,
      }
      
      const response = await fetch('/api/calendar/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete event')
      }
      
      const result = await response.json()
      
      // Show success toast
      toast({
        title: "Event deleted",
        description: result.message || "Event has been deleted successfully.",
      })
      
      // Refresh events
      await fetchEvents()
      
      return result
    } catch (error: any) {
      // Show error toast
      toast({
        title: "Deletion failed",
        description: error.message || "Failed to delete event",
        variant: "destructive",
      })
      
      throw error
    }
  }, [fetchEvents])

  // Use effect to fetch data only on client side
  useEffect(() => {
    // Skip execution during SSR
    if (typeof window === 'undefined') {
      return
    }
    
    fetchEvents()
  }, [fetchEvents, refreshKey])
  
  return {
    ...state,
    refreshEvents,
    scheduleEvent,
    rescheduleEvent,
    deleteEvent,
  }
}
