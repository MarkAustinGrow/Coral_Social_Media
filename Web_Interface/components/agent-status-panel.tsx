"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PlayCircle, StopCircle, RefreshCw, AlertTriangle } from "lucide-react"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { DataState } from "@/components/ui/data-state"
import { toast } from "sonner"

// Agent descriptions
const agentDescriptions: Record<string, string> = {
  "Tweet Scraping Agent": "Collects tweets from specified accounts",
  "Hot Topic Agent": "Identifies trending topics from tweets",
  "Tweet Research Agent": "Analyzes tweets and extracts insights",
  "Blog Writing Agent": "Creates blog content based on tweet insights",
  "Blog Critique Agent": "Reviews and fact-checks blog content",
  "Blog to Tweet Agent": "Converts blog posts into tweet threads",
  "Twitter Posting Agent": "Posts scheduled tweets to Twitter",
  "X Reply Agent": "Generates and posts replies to tweets"
}

// Define the desired order of agents to match the workflow
const agentOrder = [
  "Tweet Scraping Agent",
  "Hot Topic Agent",
  "Tweet Research Agent",
  "Blog Writing Agent",
  "Blog Critique Agent",
  "Blog to Tweet Agent",
  "Twitter Posting Agent",
  "X Reply Agent"
]

// Interface for agent status
interface AgentStatus {
  id: number
  agent_name: string
  status: "running" | "warning" | "error" | "stopped"
  health: number
  last_heartbeat: string | null
  last_error: string | null
  last_activity: string | null
  updated_at: string
}

export function AgentStatusPanel() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [isStarting, setIsStarting] = useState<Record<string, boolean>>({})
  const [isStopping, setIsStopping] = useState<Record<string, boolean>>({})
  const [isRestarting, setIsRestarting] = useState<Record<string, boolean>>({})
  
  // Fetch agent status from the agent_status table
  const agentStatusResult = useSupabaseData<AgentStatus>(
    'agent_status',
    { 
      columns: '*',
      // We'll sort the data after fetching to match the workflow order
    },
    refreshKey
  )
  
  // Sort the agents according to the workflow order
  const sortedAgentStatusResult = {
    ...agentStatusResult,
    data: agentStatusResult.data ? [...agentStatusResult.data].sort((a, b) => {
      const aIndex = agentOrder.indexOf(a.agent_name)
      const bIndex = agentOrder.indexOf(b.agent_name)
      
      // If an agent name isn't in our order list, put it at the end
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      
      // Otherwise sort by the index in our order array
      return aIndex - bIndex
    }) : null
  }
  
  // Handle refresh
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }
  
  // Handle starting an agent
  const handleStartAgent = async (agentName: string) => {
    try {
      setIsStarting(prev => ({ ...prev, [agentName]: true }))
      
      // Call the API to start the agent
      const response = await fetch('/api/agents/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentName })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start agent')
      }
      
      toast.success(`${agentName} started successfully`)
      handleRefresh()
    } catch (error: any) {
      toast.error(`Failed to start ${agentName}: ${error.message}`)
    } finally {
      setIsStarting(prev => ({ ...prev, [agentName]: false }))
    }
  }
  
  // Handle stopping an agent
  const handleStopAgent = async (agentName: string) => {
    try {
      setIsStopping(prev => ({ ...prev, [agentName]: true }))
      
      // Call the API to stop the agent
      const response = await fetch('/api/agents/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentName })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to stop agent')
      }
      
      toast.success(`${agentName} stopped successfully`)
      handleRefresh()
    } catch (error: any) {
      toast.error(`Failed to stop ${agentName}: ${error.message}`)
    } finally {
      setIsStopping(prev => ({ ...prev, [agentName]: false }))
    }
  }
  
  // Handle restarting an agent
  const handleRestartAgent = async (agentName: string) => {
    try {
      setIsRestarting(prev => ({ ...prev, [agentName]: true }))
      
      // First stop the agent
      const stopResponse = await fetch('/api/agents/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentName })
      })
      
      if (!stopResponse.ok) {
        const stopData = await stopResponse.json()
        throw new Error(stopData.error || 'Failed to stop agent for restart')
      }
      
      // Then start the agent
      const startResponse = await fetch('/api/agents/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentName })
      })
      
      if (!startResponse.ok) {
        const startData = await startResponse.json()
        throw new Error(startData.error || 'Failed to start agent after stopping')
      }
      
      toast.success(`${agentName} restarted successfully`)
      handleRefresh()
    } catch (error: any) {
      toast.error(`Failed to restart ${agentName}: ${error.message}`)
    } finally {
      setIsRestarting(prev => ({ ...prev, [agentName]: false }))
    }
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
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
      case "stopped":
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
            Stopped
          </Badge>
        )
      case "error":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            Error
          </Badge>
        )
      default:
        return null
    }
  }

  const getActionButton = (agent: AgentStatus) => {
    switch (agent.status) {
      case "running":
        return (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleStopAgent(agent.agent_name)}
            disabled={isStopping[agent.agent_name]}
          >
            {isStopping[agent.agent_name] ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Stopping...
              </>
            ) : (
              <>
                <StopCircle className="mr-2 h-4 w-4" />
                Stop
              </>
            )}
          </Button>
        )
      case "stopped":
        return (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleStartAgent(agent.agent_name)}
            disabled={isStarting[agent.agent_name]}
          >
            {isStarting[agent.agent_name] ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-4 w-4" />
                Start
              </>
            )}
          </Button>
        )
      case "error":
      case "warning":
        return (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleRestartAgent(agent.agent_name)}
            disabled={isRestarting[agent.agent_name]}
          >
            {isRestarting[agent.agent_name] ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Restarting...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Restart
              </>
            )}
          </Button>
        )
      default:
        return null
    }
  }

  return (
    <DataState
      isLoading={agentStatusResult.isLoading}
      error={agentStatusResult.error}
      data={sortedAgentStatusResult.data}
      onRetry={handleRefresh}
      loadingComponent={
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <div className="animate-pulse bg-muted rounded h-4 w-32"></div>
                  <div className="animate-pulse bg-muted rounded h-4 w-16"></div>
                </div>
                <div className="animate-pulse bg-muted rounded h-3 w-full"></div>
                <div className="animate-pulse bg-muted rounded h-2 w-3/4"></div>
                <div className="animate-pulse bg-muted rounded h-2 w-3/4"></div>
                <div className="flex justify-end">
                  <div className="animate-pulse bg-muted rounded h-8 w-20"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      }
      emptyComponent={
        <div className="text-center p-8 border rounded-lg">
          <AlertTriangle className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
          <h3 className="font-medium mb-1">No Agents Found</h3>
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card key={agent.id} className="p-4">
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{agent.agent_name}</h3>
                  {getStatusBadge(agent.status)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {agentDescriptions[agent.agent_name] || "Agent for the social media system"}
                </p>
                {agent.last_error && (
                  <div className="flex items-center text-sm text-red-600 dark:text-red-400">
                    <AlertTriangle className="mr-1 h-4 w-4" />
                    {agent.last_error}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  <div>Last Heartbeat: {formatDateTime(agent.last_heartbeat)}</div>
                  <div>Last Activity: {formatDateTime(agent.updated_at)}</div>
                </div>
                <div className="flex justify-end">{getActionButton(agent)}</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DataState>
  )
}
