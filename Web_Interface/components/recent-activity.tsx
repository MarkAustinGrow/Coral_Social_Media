"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { FileText, MessageSquare, Twitter, AlertCircle, RefreshCw } from "lucide-react"

// Mock data - would be fetched from API in real implementation
const mockActivity = [
  {
    id: 1,
    type: "blog",
    message: "New blog post generated: 'The Future of AI in Social Media'",
    timestamp: "2025-06-10T20:45:12Z",
  },
  {
    id: 2,
    type: "tweet",
    message: "Tweet thread scheduled for tomorrow at 9:00 AM",
    timestamp: "2025-06-10T20:30:45Z",
  },
  {
    id: 3,
    type: "account",
    message: "Rate limit reached for @techaccount - pausing for 15 minutes",
    timestamp: "2025-06-10T20:15:22Z",
  },
  {
    id: 4,
    type: "error",
    message: "Failed to post tweet: API authentication error",
    timestamp: "2025-06-10T19:58:10Z",
  },
  {
    id: 5,
    type: "system",
    message: "All agents restarted successfully",
    timestamp: "2025-06-10T19:45:00Z",
  },
  {
    id: 6,
    type: "blog",
    message: "Blog post 'Top 10 Tech Trends' published to WordPress",
    timestamp: "2025-06-10T19:30:15Z",
  },
  {
    id: 7,
    type: "tweet",
    message: "Tweet received 500+ likes in first hour",
    timestamp: "2025-06-10T19:15:30Z",
  },
  {
    id: 8,
    type: "system",
    message: "Daily backup completed successfully",
    timestamp: "2025-06-10T19:00:00Z",
  },
  {
    id: 9,
    type: "account",
    message: "New X account @innovatetech added to system",
    timestamp: "2025-06-10T18:45:22Z",
  },
  {
    id: 10,
    type: "error",
    message: "Blog generation failed: OpenAI API timeout",
    timestamp: "2025-06-10T18:30:10Z",
  },
]

export function RecentActivity() {
  const [activity] = useState(mockActivity)

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "blog":
        return <FileText className="h-4 w-4" />
      case "tweet":
        return <MessageSquare className="h-4 w-4" />
      case "account":
        return <Twitter className="h-4 w-4" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "system":
        return <RefreshCw className="h-4 w-4" />
      default:
        return null
    }
  }

  const getActivityBadge = (type: string) => {
    switch (type) {
      case "blog":
        return (
          <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
            Blog
          </Badge>
        )
      case "tweet":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Tweet
          </Badge>
        )
      case "account":
        return (
          <Badge variant="outline" className="bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200">
            Account
          </Badge>
        )
      case "error":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            Error
          </Badge>
        )
      case "system":
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
            System
          </Badge>
        )
      default:
        return null
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="space-y-4">
      {activity.map((item) => (
        <div key={item.id} className="flex items-center gap-4 rounded-lg border p-3">
          <div className="flex-none">{getActivityIcon(item.type)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {getActivityBadge(item.type)}
              <span className="text-xs text-muted-foreground">{formatTimestamp(item.timestamp)}</span>
            </div>
            <p className="text-sm mt-1">{item.message}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
