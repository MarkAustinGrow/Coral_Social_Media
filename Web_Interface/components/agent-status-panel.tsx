"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PlayCircle, StopCircle, RefreshCw, AlertTriangle } from "lucide-react"

// Mock data - would be fetched from API in real implementation
const mockAgents = [
  {
    id: 1,
    name: "Tweet Scraping Agent",
    status: "running",
    startTime: "2025-06-10T08:30:00Z",
    lastActivity: "2025-06-10T09:25:43Z",
    description: "Collects tweets from specified accounts",
  },
  {
    id: 2,
    name: "Tweet Research Agent",
    status: "running",
    startTime: "2025-06-10T08:31:15Z",
    lastActivity: "2025-06-10T09:24:12Z",
    description: "Analyzes tweets and extracts insights",
  },
  {
    id: 3,
    name: "Blog Writing Agent",
    status: "error",
    startTime: "2025-06-10T08:32:30Z",
    lastActivity: "2025-06-10T09:15:22Z",
    description: "Creates blog content based on tweet insights",
    error: "API rate limit exceeded",
  },
  {
    id: 4,
    name: "Blog to Tweet Agent",
    status: "stopped",
    startTime: null,
    lastActivity: "2025-06-09T18:45:10Z",
    description: "Converts blog posts into tweet threads",
  },
  {
    id: 5,
    name: "X Reply Agent",
    status: "running",
    startTime: "2025-06-10T08:34:45Z",
    lastActivity: "2025-06-10T09:26:18Z",
    description: "Generates and posts replies to tweets",
  },
  {
    id: 6,
    name: "Twitter Posting Agent",
    status: "running",
    startTime: "2025-06-10T08:35:30Z",
    lastActivity: "2025-06-10T09:20:05Z",
    description: "Posts scheduled tweets to Twitter",
  },
]

export function AgentStatusPanel() {
  const [agents, setAgents] = useState(mockAgents)

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

  const getActionButton = (agent: any) => {
    switch (agent.status) {
      case "running":
        return (
          <Button variant="outline" size="sm">
            <StopCircle className="mr-2 h-4 w-4" />
            Stop
          </Button>
        )
      case "stopped":
        return (
          <Button variant="outline" size="sm">
            <PlayCircle className="mr-2 h-4 w-4" />
            Start
          </Button>
        )
      case "error":
        return (
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Restart
          </Button>
        )
      default:
        return null
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {agents.map((agent) => (
        <Card key={agent.id} className="p-4">
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{agent.name}</h3>
              {getStatusBadge(agent.status)}
            </div>
            <p className="text-sm text-muted-foreground">{agent.description}</p>
            {agent.status === "error" && (
              <div className="flex items-center text-sm text-red-600 dark:text-red-400">
                <AlertTriangle className="mr-1 h-4 w-4" />
                {agent.error}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              <div>Start Time: {formatDateTime(agent.startTime)}</div>
              <div>Last Activity: {formatDateTime(agent.lastActivity)}</div>
            </div>
            <div className="flex justify-end">{getActionButton(agent)}</div>
          </div>
        </Card>
      ))}
    </div>
  )
}
