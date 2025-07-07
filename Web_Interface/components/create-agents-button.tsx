"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Plus } from "lucide-react"
import { toast } from "sonner"

interface CreateAgentsButtonProps {
  onSuccess?: () => void
}

export function CreateAgentsButton({ onSuccess }: CreateAgentsButtonProps) {
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateAgents = async () => {
    try {
      setIsCreating(true)
      console.log('🔧 CreateAgentsButton: Starting agent creation...')

      // Call the API to create agents
      const response = await fetch('/api/agents/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create agents')
      }

      console.log('✅ CreateAgentsButton: Agents created successfully:', data)
      toast.success(`Successfully created ${data.agents?.length || 8} agents for your account!`)
      
      // Call the success callback to refresh the parent component
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error('❌ CreateAgentsButton: Error creating agents:', error)
      toast.error(`Failed to create agents: ${error.message}`)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Button 
      size="sm" 
      onClick={handleCreateAgents}
      disabled={isCreating}
      className="bg-blue-600 hover:bg-blue-700 text-white"
    >
      {isCreating ? (
        <>
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          Creating Agents...
        </>
      ) : (
        <>
          <Plus className="h-4 w-4 mr-2" />
          Create Agents
        </>
      )}
    </Button>
  )
}
