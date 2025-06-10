"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, AlertCircle, XCircle } from "lucide-react"

// Mock data - would be fetched from API in real implementation
const mockAgentStatus = [
  { name: "Content Collector", status: "running", health: 100 },
  { name: "Blog Generator", status: "running", health: 95 },
  { name: "Tweet Scheduler", status: "warning", health: 75 },
  { name: "Engagement Analyzer", status: "error", health: 30 },
  { name: "Account Manager", status: "running", health: 90 },
]

export function SystemStatusPanel() {
  const [agentStatus] = useState(mockAgentStatus)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />
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
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {agentStatus.map((agent, index) => (
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
  )
}
