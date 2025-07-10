"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Clock, RefreshCw } from "lucide-react"
import { DataState } from "@/components/ui/data-state"

// Interface for daily usage data
interface DailyUsage {
  date: string
  usage: number
}

// Interface for API usage data
interface ApiUsageData {
  endpoint: string
  requestsMade: number
  quota: number
  resetTime: string
  description: string
  note?: string
  error?: boolean
  dailyUsage?: DailyUsage[]
  isInformational?: boolean
  isClientApp?: boolean
}

export function ApiUsagePanel() {
  const [apiUsage, setApiUsage] = useState<ApiUsageData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isMockData, setIsMockData] = useState(false)
  const [mockMessage, setMockMessage] = useState<string | null>(null)

  // Fetch API usage data
  useEffect(() => {
    const fetchApiUsage = async () => {
      try {
        setIsLoading(true)
        setError(null)
        setIsMockData(false)
        setMockMessage(null)
        
        const response = await fetch('/api/twitter/rate-limits')
        const data = await response.json()
        
        if (!response.ok || !data.success) {
          // Handle 501 (Not Implemented) as a permanent limitation, not a temporary error
          if (response.status === 501 || data.error?.includes('unavailable') || data.error?.includes('not available')) {
            // This is a permanent limitation due to credential format
            // Don't treat as an error that should trigger retries
            setApiUsage([])
            setError(`Twitter API usage data is not available with current credential format. ${data.details || 'This feature requires Twitter API v2 Bearer token access.'}`)
            return // Exit without throwing error to prevent retry loop
          }
          
          // Create detailed error message from API response for other errors
          let errorMessage = data.error || 'Failed to fetch API usage data'
          
          if (data.details) {
            errorMessage += `: ${data.details}`
          }
          
          // Add debug information if available
          if (data.debug) {
            console.error('API Debug Info:', data.debug)
            
            // Add specific debug details to error message for better troubleshooting
            if (data.debug.userId) {
              errorMessage += ` (User ID: ${data.debug.userId})`
            }
            
            if (data.debug.credentialsFound === false) {
              errorMessage += ' - No Twitter credentials found in database'
            }
            
            if (data.debug.limitation) {
              errorMessage += ` - Technical limitation: ${data.debug.limitation}`
            }
          }
          
          throw new Error(errorMessage)
        }
        
        // This should not happen anymore since we removed mock data fallbacks
        setApiUsage(data.data || [])
        setIsMockData(data.isMock || false)
        setMockMessage(data.message || null)
        
      } catch (err: any) {
        console.error('Error fetching API usage:', err)
        
        // Enhanced error handling with more specific messages
        let errorMessage = err.message || 'An error occurred while fetching API usage data'
        
        // Handle specific HTTP status codes
        if (err.message.includes('401') || err.message.includes('not authenticated')) {
          errorMessage = 'Authentication failed. Please log out and log back in.'
        } else if (err.message.includes('404') || err.message.includes('not configured')) {
          errorMessage = 'Twitter credentials not configured. Please visit the Setup page to connect your Twitter account.'
        } else if (err.message.includes('501') || err.message.includes('unavailable')) {
          errorMessage = 'Twitter API usage data is not available with current credential format. This feature requires Twitter API v2 Bearer token access.'
        } else if (err.message.includes('500') || err.message.includes('Database connection failed')) {
          errorMessage = 'Server error. Please try again later or contact support if the problem persists.'
        }
        
        setError(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchApiUsage()
  }, [refreshKey])
  
  // Handle refresh button click
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  const getUsagePercentage = (used: number, quota: number) => {
    return Math.round((used / quota) * 100)
  }

  const getUsageBadge = (percentage: number) => {
    if (percentage >= 90) {
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          Critical
        </Badge>
      )
    } else if (percentage >= 70) {
      return (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          Warning
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          Normal
        </Badge>
      )
    }
  }

  const getTimeUntilReset = (resetTime: string) => {
    const now = new Date()
    const reset = new Date(resetTime)
    const diff = reset.getTime() - now.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  return (
    <DataState
      isLoading={isLoading}
      error={error ? { message: 'Error loading API usage data', details: error } : null}
      data={apiUsage}
      onRetry={handleRefresh}
      loadingComponent={
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-24 animate-pulse bg-muted rounded"></div>
                  <div className="h-5 w-16 animate-pulse bg-muted rounded"></div>
                </div>
                <div className="h-4 w-32 animate-pulse bg-muted rounded mt-1"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-10 animate-pulse bg-muted rounded"></div>
                      <div className="h-4 w-20 animate-pulse bg-muted rounded"></div>
                    </div>
                    <div className="h-2 animate-pulse bg-muted rounded"></div>
                    <div className="h-4 w-16 animate-pulse bg-muted rounded"></div>
                  </div>
                  <div className="h-4 w-full animate-pulse bg-muted rounded"></div>
                  <div className="h-8 w-full animate-pulse bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      }
      errorComponent={
        <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md">
          <div className="flex items-center mb-2">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <h3 className="font-medium">API Usage Data Unavailable</h3>
          </div>
          <p className="text-sm mb-3">{error}</p>
          <Button size="sm" variant="outline" onClick={handleRefresh}>
            Try Again
          </Button>
        </div>
      }
    >
      {(data) => (
        <div className="space-y-4">
          {isMockData && mockMessage && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300 p-3 rounded-md mb-4">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <p className="text-sm">{mockMessage}</p>
              </div>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map((endpoint, index) => {
            // Handle informational cards differently
            if (endpoint.isInformational) {
              return (
                <Card key={index} className="md:col-span-2 lg:col-span-3 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-300">
                      {endpoint.endpoint}
                    </CardTitle>
                    <CardDescription className="text-xs text-blue-700 dark:text-blue-400">
                      {endpoint.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-blue-800 dark:text-blue-300">
                      {endpoint.note}
                    </div>
                  </CardContent>
                </Card>
              );
            }
            
            // Regular usage cards
            const percentage = getUsagePercentage(endpoint.requestsMade, endpoint.quota)
            return (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{endpoint.endpoint.split(" ")[0]}</CardTitle>
                    {endpoint.isClientApp ? (
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        Client
                      </Badge>
                    ) : (
                      getUsageBadge(percentage)
                    )}
                  </div>
                  <CardDescription className="text-xs">{endpoint.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>Usage</span>
                        <span className="font-medium">
                          {endpoint.isClientApp 
                            ? `${endpoint.requestsMade.toLocaleString()}`
                            : `${endpoint.requestsMade.toLocaleString()} / ${endpoint.quota.toLocaleString()}`
                          }
                        </span>
                      </div>
                      {!endpoint.isClientApp && (
                        <>
                          <Progress value={percentage} className="h-2" />
                          <div className="text-xs text-muted-foreground">{percentage}% used</div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Resets in {getTimeUntilReset(endpoint.resetTime)}</span>
                      </div>
                      {!endpoint.isClientApp && percentage >= 70 && (
                        <div className="flex items-center gap-1 text-yellow-600">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Throttled</span>
                        </div>
                      )}
                    </div>

                    <div className="text-xs font-mono bg-muted p-2 rounded">{endpoint.endpoint}</div>
                    
                    {endpoint.dailyUsage && endpoint.dailyUsage.length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs font-medium mb-1">Daily Usage Trend</div>
                        <div className="h-10 flex items-end space-x-1">
                          {endpoint.dailyUsage.map((day, i) => {
                            // For client apps, calculate height based on the max usage in the dataset
                            let height = 4; // Default minimum height
                            
                            if (day.usage > 0) {
                              if (endpoint.isClientApp) {
                                // Find max usage in the dataset for relative scaling
                                const maxUsage = Math.max(...(endpoint.dailyUsage || []).map(d => d.usage));
                                height = maxUsage > 0 
                                  ? Math.max(10, Math.min(40, (day.usage / maxUsage) * 40))
                                  : 4;
                              } else {
                                // For regular endpoints, use quota as before
                                height = Math.max(10, Math.min(40, (day.usage / endpoint.quota) * 40));
                              }
                            }
                            
                            return (
                              <div key={i} className="flex flex-col items-center">
                                <div 
                                  className="bg-primary/80 rounded-sm w-3" 
                                  style={{ height: `${height}px` }}
                                  title={`${new Date(day.date).toLocaleDateString()}: ${day.usage} requests`}
                                ></div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {endpoint.note && (
                      <div className="text-xs text-muted-foreground italic mt-2">
                        Note: {endpoint.note}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}

          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>API Usage Summary</CardTitle>
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Data
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {data.filter((e) => !e.isInformational && !e.isClientApp && getUsagePercentage(e.requestsMade, e.quota) < 70).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Normal</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {
                      data.filter((e) => {
                        if (e.isInformational || e.isClientApp) return false;
                        const p = getUsagePercentage(e.requestsMade, e.quota)
                        return p >= 70 && p < 90
                      }).length
                    }
                  </div>
                  <div className="text-sm text-muted-foreground">Warning</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {data.filter((e) => !e.isInformational && !e.isClientApp && getUsagePercentage(e.requestsMade, e.quota) >= 90).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Critical</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {data.find(e => !e.isInformational && !e.isClientApp)?.requestsMade.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Requests</div>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      )}
    </DataState>
  )
}
