"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, FileText, MessageSquare } from "lucide-react"

// Mock data - would be fetched from API in real implementation
const mockEvents = [
  {
    id: 1,
    title: "The Future of AI in Social Media Marketing",
    type: "blog",
    status: "published",
    date: "2025-06-15T14:00:00Z",
  },
  {
    id: 2,
    title: "10 Ways to Improve Your Twitter Engagement",
    type: "blog",
    status: "draft",
    date: "2025-06-18T10:00:00Z",
  },
  {
    id: 3,
    title: "Understanding Algorithm Changes in 2025",
    type: "blog",
    status: "review",
    date: "2025-06-22T09:00:00Z",
  },
  {
    id: 4,
    title: "Thread: AI Trends Shaping Our Future",
    type: "tweet",
    status: "scheduled",
    date: "2025-06-16T15:30:00Z",
  },
  {
    id: 5,
    title: "Thread: Cybersecurity Best Practices",
    type: "tweet",
    status: "scheduled",
    date: "2025-06-19T11:00:00Z",
  },
  {
    id: 6,
    title: "Tweet: New Blog Post Announcement",
    type: "tweet",
    status: "scheduled",
    date: "2025-06-15T16:00:00Z",
  },
  {
    id: 7,
    title: "How to Create Viral Content That Converts",
    type: "blog",
    status: "draft",
    date: "2025-06-25T13:00:00Z",
  },
  {
    id: 8,
    title: "Thread: Cloud Computing Trends",
    type: "tweet",
    status: "scheduled",
    date: "2025-06-23T14:00:00Z",
  },
  {
    id: 9,
    title: "The Psychology Behind Social Sharing",
    type: "blog",
    status: "review",
    date: "2025-06-28T10:00:00Z",
  },
  {
    id: 10,
    title: "Tweet: Tech Industry News Roundup",
    type: "tweet",
    status: "scheduled",
    date: "2025-06-20T09:00:00Z",
  },
]

export function ContentCalendar() {
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("week")
  const [currentDate, setCurrentDate] = useState(new Date("2025-06-15"))
  
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
    return mockEvents.filter(event => {
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
  
  // Render event card
  const renderEvent = (event: any) => {
    return (
      <Card key={event.id} className={`p-2 mb-1 text-xs border-l-4 ${
        event.type === 'blog' 
          ? 'border-l-blue-500 bg-blue-50 dark:bg-blue-950' 
          : 'border-l-green-500 bg-green-50 dark:bg-green-950'
      }`}>
        <div className="flex items-center gap-1">
          {event.type === 'blog' ? (
            <FileText className="h-3 w-3" />
          ) : (
            <MessageSquare className="h-3 w-3" />
          )}
          <span className="font-medium truncate">{event.title}</span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <Badge variant={
            event.status === 'published' ? 'default' :
            event.status === 'scheduled' ? 'default' :
            event.status === 'review' ? 'outline' : 'secondary'
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
  
  return (
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
                {dayEvents.map(renderEvent)}
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
}
