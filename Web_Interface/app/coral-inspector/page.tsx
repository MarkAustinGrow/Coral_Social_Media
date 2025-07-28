"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useAgentMode, AgentModeProvider } from "@/contexts/AgentModeContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users, 
  MessageSquare, 
  Zap,
  RefreshCw,
  Server,
  Eye,
  Monitor,
  MessageCircle,
  Settings,
  FileText,
  Send,
  Download,
  Filter,
  Play,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { useState, useEffect, useRef } from "react"

// Discovered agent interface
interface DiscoveredAgent {
  id: string
  name: string
  description: string
  status: 'online' | 'offline' | 'unknown'
  lastSeen?: string
  messageCount: number
  color?: string
}

interface AgentStatus {
  agentId: string
  status: 'online' | 'offline' | 'error' | 'connecting'
  lastSeen?: string
  messageCount?: number
  sessionId?: string
}

interface CoralServerStatus {
  connected: boolean
  url: string
  activeSessions: number
  totalMessages: number
}

interface ThreadMessage {
  id: string
  threadId: string
  fromAgentId: string
  toAgentId: string
  content: string
  timestamp: string
  type: 'message' | 'mention' | 'tool_call' | 'tool_response'
}

function CoralInspectorPageContent() {
  const { user } = useAuth()
  const { agentMode } = useAgentMode()
  const [discoveredAgents, setDiscoveredAgents] = useState<DiscoveredAgent[]>([])
  const [serverStatus, setServerStatus] = useState<CoralServerStatus>({
    connected: false,
    url: "coral.8interns.com",
    activeSessions: 0,
    totalMessages: 0
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("tools")
  
  // Thread viewer state
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [selectedThread, setSelectedThread] = useState<string | null>(null)
  const [threadFilter, setThreadFilter] = useState<string>("")
  const [agentFilter, setAgentFilter] = useState<string>("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Tools tab state
  const [fromAgent, setFromAgent] = useState<string>("")
  const [toAgent, setToAgent] = useState<string>("")
  const [messageContent, setMessageContent] = useState<string>("")
  const [threadId, setThreadId] = useState<string>("")
  const [toolResponse, setToolResponse] = useState<string>("")
  
  // Help sections state
  const [showModeHelp, setShowModeHelp] = useState(false)
  const [showProtocolHelp, setShowProtocolHelp] = useState(false)

  // Fetch agents discovered from Coral server
  const fetchAgentStatuses = async () => {
    if (!user) return

    try {
      setLoading(true)
      
      // Query the new discovery-based API
      const response = await fetch(`/api/coral/agents?userId=${user.id}`)
      const data = await response.json()
      
      if (data.success && data.agents) {
        // Assign colors to discovered agents
        const colors = [
          "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500",
          "bg-red-500", "bg-indigo-500", "bg-pink-500", "bg-cyan-500",
          "bg-yellow-500", "bg-teal-500"
        ]
        
        const agentsWithColors = data.agents.map((agent: any, index: number) => ({
          ...agent,
          color: colors[index % colors.length]
        }))
        
        setDiscoveredAgents(agentsWithColors)

        // Update server status
        const connectedAgents = agentsWithColors.filter((a: DiscoveredAgent) => a.status === 'online').length
        setServerStatus(prev => ({
          ...prev,
          connected: connectedAgents > 0,
          activeSessions: connectedAgents,
          totalMessages: agentsWithColors.reduce((sum: number, a: DiscoveredAgent) => sum + a.messageCount, 0)
        }))
      } else {
        // No agents discovered
        setDiscoveredAgents([])
        setServerStatus(prev => ({
          ...prev,
          connected: false,
          activeSessions: 0,
          totalMessages: 0
        }))
      }

    } catch (error) {
      console.error('Failed to fetch agent statuses:', error)
      setDiscoveredAgents([])
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please log in to view Coral Inspector</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Coral Inspector</h1>
          <p className="text-muted-foreground">
            Monitor and inspect your agent communications on the Coral Protocol
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Current Mode Status Indicator */}
          <Card className="p-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${agentMode === 'coral' ? 'bg-green-500' : 'bg-blue-500'}`} />
                <span className="text-sm font-medium">
                  Current Mode: {agentMode === 'coral' ? 'Coral' : 'Auto'}
                </span>
              </div>
            </div>
          </Card>
          <Button onClick={fetchAgentStatuses} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Coral Inspector</CardTitle>
          <CardDescription>
            The Coral Inspector page now reads the agent mode from the main dashboard. 
            When the dashboard is set to "Coral" mode, this page will show the current mode status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${agentMode === 'coral' ? 'bg-green-100' : 'bg-blue-100'}`}>
              <div className={`w-8 h-8 rounded-full ${agentMode === 'coral' ? 'bg-green-500' : 'bg-blue-500'}`} />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Agent Mode: {agentMode === 'coral' ? 'Coral Protocol' : 'Auto Mode'}
            </h3>
            <p className="text-muted-foreground">
              {agentMode === 'coral' 
                ? 'Multi-agent communication enabled via Coral Protocol'
                : 'Independent agent operation mode'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function CoralInspectorPage() {
  return (
    <AgentModeProvider>
      <CoralInspectorPageContent />
    </AgentModeProvider>
  )
}
