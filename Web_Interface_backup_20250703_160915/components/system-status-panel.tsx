"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, AlertCircle, XCircle, RefreshCw, ServerCrash, Play, Square, Info, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { DataState } from "@/components/ui/data-state"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getSupabaseClient } from "@/lib/supabase"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"

// Types for agent status
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

export function SystemStatusPanel() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [isStarting, setIsStarting] = useState<Record<string, boolean>>({})
  const [isStopping, setIsStopping] = useState<Record<string, boolean>>({})
  const [isForceUpdating, setIsForceUpdating] = useState<Record<string, boolean>>({})
  
  // Fetch agent status from the agent_status table
  const agentStatusResult = useSupabaseData<AgentStatus>(
    'agent_status',
    { 
      columns: '*',
      // We'll sort the data after fetching to match the workflow order
    },
    refreshKey
  )
  
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
  
  // Handle force updating an agent's status
  const handleForceStatus = async (agentName: string, status: string) => {
    try {
      setIsForceUpdating(prev => ({ ...prev, [agentName]: true }))
      
      // Call the API to force update the agent's status
      const response = await fetch('/api/agents/force-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName,
          status,
          health: status === 'stopped' ? 0 : 100,
          lastActivity: `Status force-updated to ${status}`
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to force update agent status')
      }
      
      toast.success(`${agentName} status force-updated to ${status}`)
      handleRefresh()
    } catch (error: any) {
      toast.error(`Failed to force update ${agentName} status: ${error.message}`)
    } finally {
      setIsForceUpdating(prev => ({ ...prev, [agentName]: false }))
    }
  }
  
  // Handle starting all agents
  const handleStartAllAgents = async () => {
    try {
      // Call the API to start all agents
      const response = await fetch('/api/agents/start-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start all agents')
      }
      
      toast.success('All agents started successfully')
      handleRefresh()
    } catch (error: any) {
      toast.error(`Failed to start all agents: ${error.message}`)
    }
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

  // Format time ago
  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'Never'
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch (error) {
      return 'Invalid date'
    }
  }

  return (
    <DataState
      isLoading={agentStatusResult.isLoading}
      error={agentStatusResult.error}
      data={sortedAgentStatusResult.data}
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
          <div className="flex justify-end">
            <Button 
              onClick={handleStartAllAgents} 
              className="bg-green-600 hover:bg-green-700"
            >
              Start All Agents
            </Button>
          </div>
          
          {agents.map((agent) => (
            <div key={agent.id} className="flex items-center gap-4 rounded-lg border p-4">
              <div className="flex-none">{getStatusIcon(agent.status)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{agent.agent_name}</h4>
                  {getStatusBadge(agent.status)}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Progress value={agent.health} className="h-2" />
                  <span className="text-xs text-muted-foreground">{agent.health}%</span>
                </div>
                
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                  {agent.last_activity && (
                    <div className="flex items-center">
                      <span className="mr-1">Last activity:</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="underline decoration-dotted">
                              {formatTimeAgo(agent.updated_at)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{agent.last_activity}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                  
                  {agent.last_error && (
                    <div className="flex items-center text-red-500">
                      <span className="mr-1">Error:</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="underline decoration-dotted">
                              {agent.last_error.substring(0, 20)}...
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{agent.last_error}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex-none flex items-center">
                {agent.status === 'stopped' ? (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800"
                    onClick={() => handleStartAgent(agent.agent_name)}
                    disabled={isStarting[agent.agent_name]}
                  >
                    {isStarting[agent.agent_name] ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-1" />
                        Start
                      </>
                    )}
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800"
                    onClick={() => handleStopAgent(agent.agent_name)}
                    disabled={isStopping[agent.agent_name]}
                  >
                    {isStopping[agent.agent_name] ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                        Stopping...
                      </>
                    ) : (
                      <>
                        <Square className="h-4 w-4 mr-1" />
                        Stop
                      </>
                    )}
                  </Button>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="ml-1"
                    >
                      <AlertTriangle className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleForceStatus(agent.agent_name, 'stopped')}
                      disabled={isForceUpdating[agent.agent_name]}
                      className="text-red-600 focus:text-red-600"
                    >
                      {isForceUpdating[agent.agent_name] ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-2" />
                          Force Stop
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleForceStatus(agent.agent_name, 'running')}
                      disabled={isForceUpdating[agent.agent_name]}
                      className="text-green-600 focus:text-green-600"
                    >
                      {isForceUpdating[agent.agent_name] ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Force Running
                        </>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="ml-1"
                  onClick={handleRefresh}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DataState>
  )
}
