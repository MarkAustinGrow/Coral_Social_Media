"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { toast } from "sonner"
import { AgentStatusPanel } from "@/components/agent-status-panel"

export default function DebugAgentsPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [isUpdating, setIsUpdating] = useState(false)
  
  // Handle updating agent names
  const handleUpdateAgentNames = async () => {
    try {
      setIsUpdating(true)
      
      // Call the API to update agent names
      const response = await fetch('/api/agents/update-names', {
        method: 'POST',
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update agent names')
      }
      
      const data = await response.json()
      
      toast.success(data.message || 'Agent names updated successfully')
      
      // Refresh the agent status panel
      setRefreshKey(prev => prev + 1)
    } catch (error: any) {
      toast.error(`Failed to update agent names: ${error.message}`)
    } finally {
      setIsUpdating(false)
    }
  }
  
  // Handle setting random agent statuses (for testing)
  const handleSetRandomStatuses = async () => {
    try {
      setIsUpdating(true)
      
      // Get the list of agent names
      const agentNames = [
        "Tweet Scraping Agent",
        "Hot Topic Agent",
        "Tweet Research Agent",
        "Blog Writing Agent",
        "Blog Critique Agent",
        "Blog to Tweet Agent",
        "Twitter Posting Agent",
        "X Reply Agent"
      ]
      
      // Possible statuses
      const statuses = ['running', 'stopped', 'warning', 'error']
      
      // Update each agent with a random status
      for (const agentName of agentNames) {
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]
        const randomHealth = randomStatus === 'running' ? 100 : 
                            randomStatus === 'warning' ? Math.floor(Math.random() * 40) + 40 : 
                            randomStatus === 'error' ? Math.floor(Math.random() * 30) + 10 : 0
        
        const response = await fetch('/api/agents/force-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName,
            status: randomStatus,
            health: randomHealth,
            lastActivity: `Status set to ${randomStatus} for testing`
          })
        })
        
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || `Failed to update status for ${agentName}`)
        }
      }
      
      toast.success('Random agent statuses set successfully')
      
      // Refresh the agent status panel
      setRefreshKey(prev => prev + 1)
    } catch (error: any) {
      toast.error(`Failed to set random statuses: ${error.message}`)
    } finally {
      setIsUpdating(false)
    }
  }
  
  return (
    <DashboardShell>
      <DashboardHeader heading="Debug Agent Status" text="Initialize and test agent status functionality.">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setRefreshKey(prev => prev + 1)}>
            Refresh
          </Button>
        </div>
      </DashboardHeader>
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7">
        <Card className="col-span-7 lg:col-span-2">
          <CardHeader>
            <CardTitle>Agent Status Tools</CardTitle>
            <CardDescription>Initialize and test agent status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Use these tools to initialize and test the agent status functionality.
              The "Update Agent Names" button will ensure all required agents exist in the database.
              The "Set Random Statuses" button will set random statuses for testing.
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button 
              className="w-full" 
              onClick={handleUpdateAgentNames}
              disabled={isUpdating}
            >
              {isUpdating ? 'Updating...' : 'Update Agent Names'}
            </Button>
            <Button 
              variant="secondary" 
              className="w-full" 
              onClick={handleSetRandomStatuses}
              disabled={isUpdating}
            >
              {isUpdating ? 'Setting...' : 'Set Random Statuses'}
            </Button>
          </CardFooter>
        </Card>
        <Card className="col-span-7 lg:col-span-5">
          <CardHeader>
            <CardTitle>Agent Status Preview</CardTitle>
            <CardDescription>View the current agent statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <AgentStatusPanel key={`debug-agents-${refreshKey}`} />
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
