"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { FileText, MessageSquare, BarChart, Twitter, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSupabaseData, useFallbackData } from "@/hooks/use-supabase-data"
import { DataState } from "@/components/ui/data-state"

// Types for our stats
interface Stats {
  tweetsCollected: number
  blogsCreated: number
  tweetsPosted: number
  activeAccounts: number
}

export function StatsCards() {
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Try to fetch data from Supabase
  const tweetsCountState = useSupabaseData<{ count: number }>(
    'tweets_cache',
    { columns: 'count' }
  )
  
  const blogsCountState = useSupabaseData<{ count: number }>(
    'blog_posts',
    { columns: 'count' }
  )
  
  const tweetsPostedState = useSupabaseData<{ count: number }>(
    'potential_tweets',
    { 
      columns: 'count',
      filter: [{ column: 'status', value: 'posted' }]
    }
  )
  
  const accountsState = useSupabaseData<{ username: string }>(
    'x_accounts',
    { columns: 'username' }
  )
  
  // Combine all states to determine overall state
  const isLoading = tweetsCountState.isLoading || blogsCountState.isLoading || 
                   tweetsPostedState.isLoading || accountsState.isLoading
  
  const hasError = tweetsCountState.error || blogsCountState.error || 
                  tweetsPostedState.error || accountsState.error
  
  // Combine errors if any
  const error = hasError ? {
    message: 'Error loading dashboard statistics',
    details: [
      tweetsCountState.error?.message,
      blogsCountState.error?.message,
      tweetsPostedState.error?.message,
      accountsState.error?.message
    ].filter(Boolean).join(', ')
  } : null
  
  // Combine data if all are available
  const data: Stats | null = (!isLoading && !hasError) ? {
    tweetsCollected: tweetsCountState.data?.[0]?.count || 0,
    blogsCreated: blogsCountState.data?.[0]?.count || 0,
    tweetsPosted: tweetsPostedState.data?.[0]?.count || 0,
    activeAccounts: accountsState.data?.length || 0
  } : null
  
  // Handle refresh
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }
  
  return (
    <div className="relative">
      <DataState
        isLoading={isLoading}
        error={error}
        data={data}
        onRetry={handleRefresh}
        loadingComponent={
          <div className="grid gap-4 grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 flex flex-col items-center justify-center h-[120px]">
                  <div className="animate-pulse bg-muted rounded-full h-12 w-12 mb-2"></div>
                  <div className="animate-pulse bg-muted rounded h-6 w-16 mb-1"></div>
                  <div className="animate-pulse bg-muted rounded h-4 w-24"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        }
        errorComponent={
          <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md">
            <div className="flex items-center mb-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              <h3 className="font-medium">Unable to load statistics</h3>
            </div>
            <p className="text-sm mb-3">There was an error connecting to the database. This could be due to:</p>
            <ul className="text-sm list-disc pl-5 mb-3">
              <li>Missing or incorrect Supabase credentials</li>
              <li>Database tables not being set up correctly</li>
              <li>Network connectivity issues</li>
            </ul>
            <Button size="sm" variant="outline" onClick={handleRefresh}>
              Try Again
            </Button>
          </div>
        }
      >
        {(stats) => (
          <div className="grid gap-4 grid-cols-2">
            <Card>
              <CardContent className="p-4 flex flex-col items-center justify-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-2">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div className="text-2xl font-bold">{stats.tweetsCollected.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground text-center">Tweets Collected</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex flex-col items-center justify-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-2">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="text-2xl font-bold">{stats.blogsCreated.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground text-center">Blogs Created</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex flex-col items-center justify-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-2">
                  <Twitter className="h-6 w-6 text-primary" />
                </div>
                <div className="text-2xl font-bold">{stats.tweetsPosted.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground text-center">Tweets Posted</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex flex-col items-center justify-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-2">
                  <BarChart className="h-6 w-6 text-primary" />
                </div>
                <div className="text-2xl font-bold">{stats.activeAccounts}</div>
                <p className="text-xs text-muted-foreground text-center">Active X Accounts</p>
              </CardContent>
            </Card>
          </div>
        )}
      </DataState>
    </div>
  )
}
