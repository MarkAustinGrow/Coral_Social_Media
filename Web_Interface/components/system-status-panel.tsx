"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, AlertCircle, XCircle, RefreshCw, ServerCrash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { DataState } from "@/components/ui/data-state"

// Types for agent status
interface AgentStatus {
  name: string
  status: "running" | "warning" | "error" | "stopped"
  health: number
}

// Map of agent names to their database tables
const agentTableMap = {
  "Content Collector": "tweets_cache",
  "Blog Generator": "blog_posts",
  "Tweet Scheduler": "potential_tweets",
  "Engagement Analyzer": "tweet_insights",
  "Account Manager": "x_accounts"
}

export function SystemStatusPanel() {
  const [refreshKey, setRefreshKey] = useState(0)
  
  // In a real implementation, we would fetch agent status from a dedicated table
  // For now, we'll check if the tables exist and are accessible
  const tableChecks = Object.entries(agentTableMap).map(([agentName, tableName]) => {
    return {
      agentName,
      ...useSupabaseData<{ exists: boolean }>(
        tableName,
        { 
          columns: 'count(*)',
          limit: 1
        }
      )
    }
  })
  
  // Determine overall state
  const isLoading = tableChecks.some(check => check.isLoading)
  const hasError = tableChecks.some(check => check.error)
  
  // Combine errors if any
  const error = hasError ? {
    message: 'Error checking system status',
    details: tableChecks
      .filter(check => check.error)
      .map(check => `${check.agentName}: ${check.error?.message}`)
      .join(', ')
  } : null
  
  // Create agent status data
  const agentStatus: AgentStatus[] = !isLoading && !hasError 
    ? tableChecks.map(check => {
        // Simulate different statuses based on table access
        // In a real implementation, this would come from a status table
        const hasAccess = check.data !== null
        const randomHealth = hasAccess 
          ? Math.floor(Math.random() * 30) + 70 // 70-100 if accessible
          : Math.floor(Math.random() * 40) // 0-40 if not accessible
        
        let status: AgentStatus["status"] = "stopped"
        if (hasAccess) {
          if (randomHealth > 90) status = "running"
          else if (randomHealth > 75) status = "warning"
          else status = "error"
        }
        
        return {
          name: check.agentName,
          status,
          health: randomHealth
        }
      })
    : []
  
  // Handle refresh
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }
  
  // Status helpers
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "stopped":
        return <XCircle className="h-5 w-5 text-gray-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "running":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Running
          </Badge>
        )
      case "warning":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            Warning
          </Badge>
        )
      case "error":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            Error
          </Badge>
        )
      case "stopped":
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
            Stopped
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <DataState
      isLoading={isLoading}
      error={error}
      data={agentStatus}
      onRetry={handleRefresh}
      loadingComponent={
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
              <div className="flex-none">
                <div className="animate-pulse bg-muted rounded-full h-5 w-5"></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="animate-pulse bg-muted rounded h-4 w-32"></div>
                  <div className="animate-pulse bg-muted rounded h-4 w-16"></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="animate-pulse bg-muted rounded h-2 w-full"></div>
                  <div className="animate-pulse bg-muted rounded h-4 w-8"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      }
      errorComponent={
        <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md">
          <div className="flex items-center mb-2">
            <ServerCrash className="h-4 w-4 mr-2" />
            <h3 className="font-medium">System Status Unavailable</h3>
          </div>
          <p className="text-sm mb-3">Unable to check system status. This could be due to:</p>
          <ul className="text-sm list-disc pl-5 mb-3">
            <li>Database connection issues</li>
            <li>Missing tables or permissions</li>
            <li>System configuration problems</li>
          </ul>
          <Button size="sm" variant="outline" onClick={handleRefresh}>
            Retry Connection
          </Button>
        </div>
      }
      emptyComponent={
        <div className="bg-muted p-4 rounded-md text-center">
          <ServerCrash className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
          <h3 className="font-medium mb-1">No Agents Configured</h3>
          <p className="text-sm text-muted-foreground mb-3">
            No agent status information is available. You may need to configure your agents first.
          </p>
          <Button size="sm" variant="outline" onClick={handleRefresh}>
            Check Again
          </Button>
        </div>
      }
    >
      {(agents) => (
        <div className="space-y-4">
          {agents.map((agent, index) => (
            <div key={index} className="flex items-center gap-4 rounded-lg border p-4">
              <div className="flex-none">{getStatusIcon(agent.status)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{agent.name}</h4>
                  {getStatusBadge(agent.status)}
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={agent.health} className="h-2" />
                  <span className="text-xs text-muted-foreground">{agent.health}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DataState>
  )
}
