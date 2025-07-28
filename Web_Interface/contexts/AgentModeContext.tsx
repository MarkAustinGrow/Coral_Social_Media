"use client"

import { createContext, useContext, useState, ReactNode } from 'react'

export type AgentMode = 'coral' | 'auto'

interface AgentModeContextType {
  agentMode: AgentMode
  setAgentMode: (mode: AgentMode) => void
}

const AgentModeContext = createContext<AgentModeContextType | undefined>(undefined)

export function AgentModeProvider({ children }: { children: ReactNode }) {
  const [agentMode, setAgentMode] = useState<AgentMode>('coral') // Default to coral mode

  return (
    <AgentModeContext.Provider value={{ agentMode, setAgentMode }}>
      {children}
    </AgentModeContext.Provider>
  )
}

export function useAgentMode() {
  const context = useContext(AgentModeContext)
  if (context === undefined) {
    throw new Error('useAgentMode must be used within an AgentModeProvider')
  }
  return context
}
