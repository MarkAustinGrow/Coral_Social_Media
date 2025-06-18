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
    return (
      <Card key={event.id} className={`p-2 mb-1 text-xs border-l-4 ${
        event.type === 'thread' 
          ? 'border-l-blue-500 bg-blue-50 dark:bg-blue-950' 
          : 'border-l-green-500 bg-green-50 dark:bg-green-950'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 truncate">
            {event.type === 'thread' ? (
              <MessageSquare className="h-3 w-3 flex-shrink-0" />
            ) : (
              <FileText className="h-3 w-3 flex-shrink-0" />
            )}
            <span className="font-medium truncate">
              {event.title || (event.content ? event.content.substring(0, 30) + '...' : 'Untitled')}
            </span>
          </div>
          {event.status === 'scheduled' && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-5 w-5 ml-1" 
              onClick={(e) => {
                e.stopPropagation()
                handleDeleteClick(event)
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
        <div className="flex justify-between items-center mt-1">
          <Badge variant={
            event.status === 'posted' ? 'default' :
            event.status === 'scheduled' ? 'outline' :
            event.status === 'failed' ? 'destructive' : 'secondary'
          } className="text-[10px] px-1 py-0 h-4">
            {event.status}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
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
          
          return (
            <div
              key={i}
              className={`border rounded-md p-2 min-h-[120px] ${
                isToday(day) ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' : 
                !isCurrentMonthDay && viewMode === 'month' ? 'bg-muted/50 text-muted-foreground' : ''
              }`}
            >
              <div className="text-right text-sm font-medium mb-1">
                {formatDate(day)}
              </div>
              <div className="space-y-1 overflow-y-auto max-h-[200px]">
                {dayEvents.map(event => renderEvent(event))}
                {dayEvents.length === 0 && (
                  <div className="text-xs text-center text-muted-foreground py-4">
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
