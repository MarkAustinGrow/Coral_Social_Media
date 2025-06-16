"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { FileText, MessageSquare, Twitter, AlertCircle, RefreshCw, Clock, ActivityIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { DataState } from "@/components/ui/data-state"

// Types for activity items
interface ActivityItem {
  id: number
  type: "blog" | "tweet" | "account" | "error" | "system"
  message: string
  timestamp: string
}

// Function to generate activity items from database data
function generateActivityItems(
  blogPosts: any[] = [],
  tweets: any[] = [],
  accounts: any[] = []
): ActivityItem[] {
  const items: ActivityItem[] = []
  
  // Add blog posts
  blogPosts.forEach((post, index) => {
    items.push({
      id: 1000 + index,
      type: "blog",
      message: `Blog post "${post.title || 'Untitled'}" ${post.status === 'published' ? 'published' : 'created'}`,
      timestamp: post.created_at || new Date().toISOString()
    })
  })
  
  // Add tweets
  tweets.forEach((tweet, index) => {
    // Extract position information if available (format: "1/10", "2/10", etc.)
    const positionMatch = tweet.content?.match(/^(\d+\/\d+)/);
    const position = positionMatch ? positionMatch[1] + " " : "";
    
    // Get the content without the position prefix
    const contentWithoutPosition = positionMatch 
      ? tweet.content?.substring(positionMatch[0].length).trim() 
      : tweet.content;
    
    // Format the message
    const formattedContent = contentWithoutPosition?.substring(0, 60) + (contentWithoutPosition?.length > 60 ? "..." : "");
    
    items.push({
      id: 2000 + index,
      type: "tweet",
      message: tweet.status === 'posted' 
        ? `Tweet posted: ${position}"${formattedContent}"`
        : `Tweet scheduled: ${position}"${formattedContent}" (${new Date(tweet.scheduled_for || '').toLocaleString()})`,
      timestamp: tweet.created_at || new Date().toISOString()
    })
  })
  
  // Add accounts
  accounts.forEach((account, index) => {
    items.push({
      id: 3000 + index,
      type: "account",
      message: `X account @${account.username} ${account.last_fetched_at ? 'updated' : 'added to system'}`,
      timestamp: account.created_at || new Date().toISOString()
    })
  })
  
  // Sort by timestamp (newest first)
  return items.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  ).slice(0, 10) // Limit to 10 items
}

export function RecentActivity() {
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Fetch data from Supabase
  const blogsState = useSupabaseData<any>(
    'blog_posts',
    { 
      columns: 'id,title,status,created_at',
      orderBy: { column: 'created_at', ascending: false },
      limit: 5
    }
  )
  
  const tweetsState = useSupabaseData<any>(
    'potential_tweets',
    { 
      columns: 'id,content,status,scheduled_for,created_at',
      orderBy: { column: 'created_at', ascending: false },
      limit: 5
    }
  )
  
  const accountsState = useSupabaseData<any>(
    'x_accounts',
    { 
      columns: 'id,username,last_fetched_at,created_at',
      orderBy: { column: 'created_at', ascending: false },
      limit: 5
    }
  )
  
  // Determine overall state
  const isLoading = blogsState.isLoading || tweetsState.isLoading || accountsState.isLoading
  const hasError = blogsState.error || tweetsState.error || accountsState.error
  
  // Combine errors if any
  const error = hasError ? {
    message: 'Error loading activity data',
    details: [
      blogsState.error?.message,
      tweetsState.error?.message,
      accountsState.error?.message
    ].filter(Boolean).join(', ')
  } : null
  
  // Generate activity items
  const activityItems = !isLoading && !hasError
    ? generateActivityItems(
        blogsState.data || [],
        tweetsState.data || [],
        accountsState.data || []
      )
    : []
  
  // Handle refresh
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }
  
  // Helper functions
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
    try {
      const date = new Date(timestamp)
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } catch (e) {
      return "Unknown time"
    }
  }

  return (
    <DataState
      isLoading={isLoading}
      error={error}
      data={activityItems}
      onRetry={handleRefresh}
      loadingComponent={
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-lg border p-3">
              <div className="flex-none">
                <div className="animate-pulse bg-muted rounded-full h-4 w-4"></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="animate-pulse bg-muted rounded h-4 w-16"></div>
                  <div className="animate-pulse bg-muted rounded h-3 w-12"></div>
                </div>
                <div className="animate-pulse bg-muted rounded h-4 w-full mt-1"></div>
              </div>
            </div>
          ))}
        </div>
      }
      errorComponent={
        <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md">
          <div className="flex items-center mb-2">
            <AlertCircle className="h-4 w-4 mr-2" />
            <h3 className="font-medium">Activity Feed Unavailable</h3>
          </div>
          <p className="text-sm mb-3">Unable to load recent activity. This could be due to:</p>
          <ul className="text-sm list-disc pl-5 mb-3">
            <li>Database connection issues</li>
            <li>Missing tables or permissions</li>
            <li>System configuration problems</li>
          </ul>
          <Button size="sm" variant="outline" onClick={handleRefresh}>
            Try Again
          </Button>
        </div>
      }
      emptyComponent={
        <div className="bg-muted p-4 rounded-md text-center">
          <Clock className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
          <h3 className="font-medium mb-1">No Recent Activity</h3>
          <p className="text-sm text-muted-foreground mb-3">
            There is no recent activity to display. Activity will appear here as your agents start working.
          </p>
          <Button size="sm" variant="outline" onClick={handleRefresh}>
            Check Again
          </Button>
        </div>
      }
    >
      {(activity) => (
        <div className="space-y-4">
          {activity.length > 0 ? (
            activity.map((item) => (
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
            ))
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <ActivityIcon className="h-8 w-8 text-muted-foreground mb-2" />
              <h3 className="font-medium">No Activity Yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your activity feed will populate as you use the system.
              </p>
            </div>
          )}
        </div>
      )}
    </DataState>
  )
}
