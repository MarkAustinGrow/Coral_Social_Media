"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Clock, RefreshCw } from "lucide-react"

// Mock data - would be fetched from API in real implementation
const mockApiUsage = [
  {
    endpoint: "GET /2/tweets/search/recent",
    requestsMade: 850,
    quota: 1000,
    resetTime: "2025-06-11T00:00:00Z",
    description: "Search for recent tweets",
  },
  {
    endpoint: "POST /2/tweets",
    requestsMade: 45,
    quota: 50,
    resetTime: "2025-06-11T00:00:00Z",
    description: "Create tweets",
  },
  {
    endpoint: "GET /2/users/by/username",
    requestsMade: 120,
    quota: 300,
    resetTime: "2025-06-11T00:00:00Z",
    description: "Get user information",
  },
  {
    endpoint: "GET /2/tweets/:id",
    requestsMade: 2400,
    quota: 3000,
    resetTime: "2025-06-11T00:00:00Z",
    description: "Get tweet details",
  },
  {
    endpoint: "GET /2/users/:id/tweets",
    requestsMade: 180,
    quota: 200,
    resetTime: "2025-06-11T00:00:00Z",
    description: "Get user tweets",
  },
  {
    endpoint: "POST /2/tweets/:id/retweets",
    requestsMade: 15,
    quota: 25,
    resetTime: "2025-06-11T00:00:00Z",
    description: "Retweet functionality",
  },
]

export function ApiUsagePanel() {
  const [apiUsage] = useState(mockApiUsage)

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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {apiUsage.map((endpoint, index) => {
        const percentage = getUsagePercentage(endpoint.requestsMade, endpoint.quota)
        return (
          <Card key={index}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{endpoint.endpoint.split(" ")[0]}</CardTitle>
                {getUsageBadge(percentage)}
              </div>
              <CardDescription className="text-xs">{endpoint.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>Usage</span>
                    <span className="font-medium">
                      {endpoint.requestsMade.toLocaleString()} / {endpoint.quota.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                  <div className="text-xs text-muted-foreground">{percentage}% used</div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Resets in {getTimeUntilReset(endpoint.resetTime)}</span>
                  </div>
                  {percentage >= 70 && (
                    <div className="flex items-center gap-1 text-yellow-600">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Throttled</span>
                    </div>
                  )}
                </div>

                <div className="text-xs font-mono bg-muted p-2 rounded">{endpoint.endpoint}</div>
              </div>
            </CardContent>
          </Card>
        )
      })}

      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>API Usage Summary</CardTitle>
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Data
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {apiUsage.filter((e) => getUsagePercentage(e.requestsMade, e.quota) < 70).length}
              </div>
              <div className="text-sm text-muted-foreground">Normal</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {
                  apiUsage.filter((e) => {
                    const p = getUsagePercentage(e.requestsMade, e.quota)
                    return p >= 70 && p < 90
                  }).length
                }
              </div>
              <div className="text-sm text-muted-foreground">Warning</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {apiUsage.filter((e) => getUsagePercentage(e.requestsMade, e.quota) >= 90).length}
              </div>
              <div className="text-sm text-muted-foreground">Critical</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {apiUsage.reduce((sum, e) => sum + e.requestsMade, 0).toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Total Requests</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
