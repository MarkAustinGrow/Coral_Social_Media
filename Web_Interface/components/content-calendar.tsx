"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, FileText, MessageSquare, RefreshCw, Trash2 } from "lucide-react"
import { useCalendarData, CalendarEvent } from "@/hooks/use-calendar-data"
import { DataState } from "@/components/ui/data-state"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function ContentCalendar() {
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("week")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [refreshKey, setRefreshKey] = useState(0)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null)
  
  // Calculate start and end dates based on current date and view mode
  const getDateRange = () => {
    const startDate = new Date(currentDate)
    const endDate = new Date(currentDate)
    
    if (viewMode === "month") {
      startDate.setDate(1)
      endDate.setMonth(endDate.getMonth() + 1)
      endDate.setDate(0)
    } else if (viewMode === "week") {
      const day = startDate.getDay()
      startDate.setDate(startDate.getDate() - day)
      endDate.setDate(endDate.getDate() + (6 - day))
    } else if (viewMode === "day") {
      // For day view, set start to beginning of day and end to end of day
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(23, 59, 59, 999)
    }
    
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    }
  }
  
  const { startDate, endDate } = getDateRange()
  
  // Fetch calendar data
  const { 
    data: events, 
    isLoading, 
    error, 
    refreshEvents,
    deleteEvent 
  } = useCalendarData(
    { startDate, endDate },
    refreshKey
  )
  
  // Generate days for the calendar based on view mode and current date
  const getDays = () => {
    const days = []
    let startDate = new Date(currentDate)
    
    if (viewMode === "month") {
      // Set to first day of month
      startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
      // Adjust to start from the nearest Sunday (or Monday depending on preference)
      const dayOfWeek = startDate.getDay()
      startDate.setDate(startDate.getDate() - dayOfWeek)
      
      // Generate 35 days (5 weeks) to ensure we cover the full month
      for (let i = 0; i < 35; i++) {
        const date = new Date(startDate)
        date.setDate(date.getDate() + i)
        days.push(date)
      }
    } else if (viewMode === "week") {
      // Adjust to start from Sunday (or Monday)
      const dayOfWeek = startDate.getDay()
      startDate.setDate(startDate.getDate() - dayOfWeek)
      
      // Generate 7 days for the week
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate)
        date.setDate(date.getDate() + i)
        days.push(date)
      }
    } else {
      // Just the current day
      days.push(startDate)
    }
    
    return days
  }
  
  const days = getDays()
  
  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: viewMode === "month" ? "short" : "long",
      month: "short",
      day: "numeric",
    })
  }
  
  // Format month and year for header
  const formatMonthYear = () => {
    return currentDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })
  }
  
  // Check if a date is today
  const isToday = (date: Date) => {
    const today = new Date()
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
  }
  
  // Check if a date is in the current month
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth()
  }
  
  // Get events for a specific day
  const getEventsForDay = (date: Date) => {
    if (!events) return []
    
    return events.filter(event => {
      const eventDate = new Date(event.date)
      return eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
    })
  }

  // Calculate responsive height based on content
  const getResponsiveHeight = (eventCount: number) => {
    if (viewMode === 'day') {
      // Day view: expand to show all content without scrolling
      if (eventCount === 0) return { minHeight: '200px', maxHeight: 'none' }
      const calculatedHeight = Math.max(200, 80 + (eventCount * 85))
      return { minHeight: `${calculatedHeight}px`, maxHeight: 'none' }
    } else if (viewMode === 'week') {
      // Week view: responsive but with reasonable limits
      if (eventCount === 0) return { minHeight: '100px', maxHeight: '120px' }
      if (eventCount <= 2) return { minHeight: '120px', maxHeight: '140px' }
      if (eventCount <= 4) return { minHeight: '160px', maxHeight: '180px' }
      return { minHeight: '180px', maxHeight: '220px' }
    } else {
      // Month view: compact but responsive
      if (eventCount === 0) return { minHeight: '80px', maxHeight: '90px' }
      if (eventCount <= 2) return { minHeight: '100px', maxHeight: '120px' }
      if (eventCount <= 3) return { minHeight: '120px', maxHeight: '140px' }
      return { minHeight: '140px', maxHeight: '160px' }
    }
  }

  // Get content area height for scrolling
  const getContentHeight = (eventCount: number) => {
    if (viewMode === 'day') {
      return 'auto' // No scrolling in day view
    } else if (viewMode === 'week') {
      if (eventCount <= 2) return '100px'
      if (eventCount <= 4) return '140px'
      return '180px'
    } else {
      // Month view
      if (eventCount <= 2) return '80px'
      if (eventCount <= 3) return '100px'
      return '120px'
    }
  }
  
  // Navigate to previous period
  const goToPrevious = () => {
    const newDate = new Date(currentDate)
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() - 1)
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setDate(newDate.getDate() - 1)
    }
    setCurrentDate(newDate)
  }
  
  // Navigate to next period
  const goToNext = () => {
    const newDate = new Date(currentDate)
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() + 1)
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() + 7)
    } else {
      newDate.setDate(newDate.getDate() + 1)
    }
    setCurrentDate(newDate)
  }
  
  // Go to today
  const goToToday = () => {
    setCurrentDate(new Date())
  }
  
  // Handle refresh button click
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }
  
  // Handle delete button click
  const handleDeleteClick = (event: CalendarEvent) => {
    setEventToDelete(event)
    setDeleteDialogOpen(true)
  }
  
  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!eventToDelete) return
    
    try {
      await deleteEvent(eventToDelete)
      setDeleteDialogOpen(false)
      setEventToDelete(null)
    } catch (error) {
      console.error('Error deleting event:', error)
    }
  }
  
  // Render event card
  const renderEvent = (event: CalendarEvent) => {
    // Better title generation for threads
    const getEventTitle = () => {
      if (event.type === 'thread') {
        const tweetCount = event.tweets?.length || 0
        if (event.blog_post_id) {
          return `Thread (${tweetCount} tweets) - Blog #${event.blog_post_id}`
        }
        return `Thread (${tweetCount} tweets)`
      }
      return event.title || (event.content ? event.content.substring(0, 40) + '...' : 'Tweet')
    }

    // Get preview content for threads
    const getPreviewContent = () => {
      if (event.type === 'thread' && event.tweets && event.tweets.length > 0) {
        const firstTweet = event.tweets[0]
        return firstTweet.content ? firstTweet.content.substring(0, 60) + '...' : ''
      }
      return event.content ? event.content.substring(0, 60) + '...' : ''
    }

    return (
      <Card key={event.id} className={`p-2 mb-1 text-xs border-l-4 hover:shadow-md transition-shadow cursor-pointer ${
        event.type === 'thread' 
          ? 'border-l-blue-500 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900' 
          : 'border-l-green-500 bg-green-50 dark:bg-green-950 hover:bg-green-100 dark:hover:bg-green-900'
      }`}>
        <div className="flex items-start justify-between gap-1">
          <div className="flex items-start gap-1 flex-1 min-w-0">
            {event.type === 'thread' ? (
              <MessageSquare className="h-3 w-3 flex-shrink-0 mt-0.5" />
            ) : (
              <FileText className="h-3 w-3 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-xs leading-tight mb-1">
                {getEventTitle()}
              </div>
              {getPreviewContent() && (
                <div className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
                  {getPreviewContent()}
                </div>
              )}
            </div>
          </div>
          {event.status === 'scheduled' && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-4 w-4 ml-1 flex-shrink-0" 
              onClick={(e) => {
                e.stopPropagation()
                handleDeleteClick(event)
              }}
            >
              <Trash2 className="h-2.5 w-2.5" />
            </Button>
          )}
        </div>
        <div className="flex justify-between items-center mt-2">
          <Badge variant={
            event.status === 'posted' ? 'default' :
            event.status === 'scheduled' ? 'outline' :
            event.status === 'failed' ? 'destructive' : 'secondary'
          } className="text-[9px] px-1 py-0 h-3.5">
            {event.status}
          </Badge>
          <span className="text-[9px] text-muted-foreground">
            {new Date(event.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </Card>
    )
  }
  
  // Loading component for DataState
  const loadingComponent = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" disabled>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="h-6 w-32 animate-pulse bg-muted rounded"></div>
          <Button variant="outline" size="sm" disabled>
            Today
          </Button>
        </div>
        <div className="h-10 w-[120px] animate-pulse bg-muted rounded"></div>
      </div>
      
      <div className="grid grid-cols-7 gap-2">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="text-center font-medium text-sm py-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]}
          </div>
        ))}
        
        {[...Array(7)].map((_, i) => (
          <div key={i} className="border rounded-md p-2 min-h-[120px]">
            <div className="text-right text-sm font-medium mb-1">
              <div className="h-4 w-16 float-right animate-pulse bg-muted rounded"></div>
            </div>
            <div className="space-y-1">
              <div className="h-12 animate-pulse bg-muted rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
  
  // Calendar content component
  const calendarContent = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-medium">{formatMonthYear()}</h3>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Select
            value={viewMode}
            onValueChange={(value: "month" | "week" | "day") => setViewMode(value)}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="day">Day</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className={`grid ${viewMode === 'month' ? 'grid-cols-7' : viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-1'} gap-2`}>
        {/* Day headers */}
        {viewMode !== 'day' && (
          <>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
              <div key={i} className="text-center font-medium text-sm py-2">
                {day}
              </div>
            ))}
          </>
        )}
        
        {/* Calendar days */}
        {days.map((day, i) => {
          const dayEvents = getEventsForDay(day)
          const isCurrentMonthDay = isCurrentMonth(day)
          const responsiveHeight = getResponsiveHeight(dayEvents.length)
          const contentHeight = getContentHeight(dayEvents.length)
          
          return (
            <div
              key={i}
              className={`border rounded-md p-2 transition-all duration-200 ease-in-out ${
                isToday(day) ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' : 
                !isCurrentMonthDay && viewMode === 'month' ? 'bg-muted/50 text-muted-foreground' : ''
              }`}
              style={{
                minHeight: responsiveHeight.minHeight,
                maxHeight: responsiveHeight.maxHeight
              }}
            >
              <div className="text-right text-sm font-medium mb-2">
                {formatDate(day)}
              </div>
              <div 
                className={`space-y-1 ${viewMode === 'day' ? '' : 'overflow-y-auto'}`}
                style={{ 
                  maxHeight: contentHeight,
                  overflowY: viewMode === 'day' ? 'visible' : 'auto'
                }}
              >
                {dayEvents.map(event => renderEvent(event))}
                {dayEvents.length === 0 && (
                  <div className={`text-xs text-center text-muted-foreground ${
                    viewMode === 'day' ? 'py-8' : 
                    viewMode === 'week' ? 'py-4' : 'py-2'
                  }`}>
                    No events
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
  
  return (
    <>
      <DataState
        isLoading={isLoading}
        error={error}
        data={events}
        onRetry={handleRefresh}
        loadingComponent={loadingComponent}
      >
        {(_data) => {
          return calendarContent;
        }}
      </DataState>
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this event?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The event will be permanently deleted from the calendar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
