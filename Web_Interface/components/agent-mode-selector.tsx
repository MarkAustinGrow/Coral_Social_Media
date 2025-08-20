"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAgentMode, AgentMode } from "@/contexts/AgentModeContext"

interface AgentModeSelectorProps {
  onStartAllAgents?: (mode: AgentMode) => void
}

export function AgentModeSelector({ onStartAllAgents }: AgentModeSelectorProps) {
  const { agentMode, setAgentMode } = useAgentMode()
  const [isStarting, setIsStarting] = useState(false)
  const { toast } = useToast()

  const handleStartAllAgents = async () => {
    setIsStarting(true)
    
    try {
      const response = await fetch('/api/agents/start-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: agentMode
        })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Agents Started",
          description: `Successfully started all agents in ${agentMode} mode`,
        })
        
        // Call the callback if provided
        if (onStartAllAgents) {
          onStartAllAgents(agentMode)
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to start agents",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error starting agents:', error)
      toast({
        title: "Error",
        description: "Failed to start agents. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <Card className="p-3 sm:p-4 w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Label htmlFor="agent-mode" className="text-sm font-medium whitespace-nowrap">
            Agent Mode:
          </Label>
          <Select value={agentMode} onValueChange={(value: AgentMode) => setAgentMode(value)}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="coral">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Coral
                </div>
              </SelectItem>
              <SelectItem value="auto">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  Auto
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button 
          onClick={handleStartAllAgents}
          disabled={isStarting}
          className="flex items-center gap-2 w-full sm:w-auto"
        >
          {isStarting ? 'Starting...' : 'Start All Agents'}
        </Button>
      </div>
      
      <div className="mt-2 sm:mt-3 text-xs text-muted-foreground">
        {agentMode === 'coral' ? (
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span>Multi-agent coordination via Coral Protocol</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>Independent agent operation</span>
          </div>
        )}
      </div>
    </Card>
  )
}
