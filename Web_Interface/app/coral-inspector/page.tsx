"use client"

import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

// Agent modes
type AgentMode = 'auto' | 'coral'

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

export default function CoralInspectorPage() {
  const { user } = useAuth()
  const [discoveredAgents, setDiscoveredAgents] = useState<DiscoveredAgent[]>([])
  const [serverStatus, setServerStatus] = useState<CoralServerStatus>({
    connected: false,
    url: "coral.8interns.com",
    activeSessions: 0,
    totalMessages: 0
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("tools")
  
  // Mode Switch Architecture state
  const [agentMode, setAgentMode] = useState<AgentMode>('auto')
  
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

  // Load historical messages when threads tab is activated
  const loadHistoricalMessages = async () => {
    if (!user) return

    try {
      const response = await fetch(`/api/coral/threads?userId=${user.id}&limit=100`)
      const data = await response.json()
      
      if (data.messages) {
        setMessages(data.messages)
      }
    } catch (error) {
      console.error('Error loading historical messages:', error)
    }
  }

  // Setup SSE connection for real-time messages
  useEffect(() => {
    if (!user || activeTab !== 'threads') return

    // Load historical messages first
    loadHistoricalMessages()

    const eventSource = new EventSource(`/api/coral/stream?agentId=user_interface_agent_${user.id}&userId=${user.id}`)

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log("New message:", data)

        // Add new message to the thread
        const newMessage: ThreadMessage = {
          id: data.id || `msg_${Date.now()}`,
          threadId: data.threadId || 'default',
          fromAgentId: data.fromAgentId || 'unknown',
          toAgentId: data.toAgentId || 'unknown',
          content: data.content || data.message || '',
          timestamp: data.timestamp || new Date().toISOString(),
          type: data.type || 'message'
        }

        setMessages(prev => [...prev, newMessage])
      } catch (error) {
        console.error("Error parsing SSE message:", error)
      }
    }

    eventSource.onerror = (err) => {
      console.error("SSE error", err)
      eventSource.close()
    }

    return () => eventSource.close()
  }, [user, activeTab])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    fetchAgentStatuses()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchAgentStatuses, 30000)
    return () => clearInterval(interval)
  }, [user])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'offline':
        return <XCircle className="h-4 w-4 text-gray-400" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'connecting':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      online: "bg-green-100 text-green-800",
      offline: "bg-gray-100 text-gray-800", 
      error: "bg-red-100 text-red-800",
      connecting: "bg-yellow-100 text-yellow-800"
    }
    
    return (
      <Badge className={variants[status as keyof typeof variants] || variants.offline}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const handleSendMessage = async () => {
    if (!messageContent || !user?.id) return

    try {
      // Check if we have an active Interface Agent session
      const statusResponse = await fetch(`/api/coral/interface-agent?userId=${user.id}`)
      const status = await statusResponse.json()

      if (!status.hasActiveSession) {
        // Start new Interface Agent session with SSE
        startInterfaceAgentSession()
      } else {
        // Send message to existing session
        await fetch('/api/coral/interface-agent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: messageContent,
            userId: user.id
          })
        })
      }
      
      // Clear form
      setMessageContent("")
    } catch (error) {
      setToolResponse(`Error: ${error}`)
    }
  }

  const startInterfaceAgentSession = async () => {
    if (!user?.id) return

    try {
      setToolResponse("🚀 Starting Interface Agent session...\n")
      
      // Start SSE connection to Interface Agent
      const response = await fetch('/api/coral/interface-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageContent,
          userId: user.id
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`)
      }

      if (!response.body) {
        throw new Error('No response stream received')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      try {
        // Read the SSE stream
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) {
            console.log('SSE stream completed')
            break
          }

          // Decode the chunk and add to buffer
          const chunk = decoder.decode(value, { stream: true })
          buffer += chunk
          
          // Process complete lines
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.trim() === '') continue // Skip empty lines
            
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.slice(6).trim()
                if (jsonStr && jsonStr !== '') {
                  const data = JSON.parse(jsonStr)
                  console.log('Received SSE data:', data)
                  handleInterfaceAgentMessage(data)
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e, 'Line:', line)
                setToolResponse(prev => `${prev}[ERROR] Failed to parse: ${line}\n`)
              }
            } else if (line.trim() !== '') {
              console.log('Non-SSE line received:', line)
            }
          }
        }
      } finally {
        reader.releaseLock()
      }
      
      setToolResponse(prev => `${prev}✅ Interface Agent session completed.\n`)
    } catch (error) {
      console.error('Interface Agent error:', error)
      setToolResponse(prev => `${prev}❌ Error: ${error.message || error}\n`)
    }
  }

  const handleInterfaceAgentMessage = (data: any) => {
    const timestamp = new Date(data.timestamp).toLocaleTimeString()
    
    switch (data.type) {
      case 'status':
        setToolResponse(prev => `${prev}\n[${timestamp}] ${data.message}`)
        break
      case 'agent_question':
        setToolResponse(prev => `${prev}\n[${timestamp}] Agent: ${data.question}`)
        break
      case 'user_response':
        setToolResponse(prev => `${prev}\n[${timestamp}] You: ${data.message}`)
        break
      case 'agent_thinking':
        setToolResponse(prev => `${prev}\n[${timestamp}] ${data.message}`)
        break
      case 'agent_selection':
        setToolResponse(prev => `${prev}\n[${timestamp}] Selected: ${data.agent}`)
        break
      case 'agent_response':
        setToolResponse(prev => `${prev}\n[${timestamp}] ${data.agent}: ${data.response}`)
        break
      case 'error':
        setToolResponse(prev => `${prev}\n[${timestamp}] ERROR: ${data.message}`)
        break
      default:
        setToolResponse(prev => `${prev}\n[${timestamp}] ${data.message || JSON.stringify(data)}`)
    }
  }

  const handleStartAgent = async (agentName: string) => {
    try {
      const response = await fetch('/api/agents/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentName: agentName,
          mode: agentMode // Pass the selected mode to the process manager
        })
      })

      const result = await response.json()
      if (result.success) {
        // Refresh agent statuses
        fetchAgentStatuses()
        console.log(`Started ${agentName} in ${agentMode} mode`)
      } else {
        console.error('Failed to start agent:', result.error)
      }
    } catch (error) {
      console.error('Error starting agent:', error)
    }
  }

  const handleStopAgent = async (agentName: string) => {
    try {
      const response = await fetch('/api/agents/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentName: agentName,
          mode: agentMode // Pass the selected mode to the process manager
        })
      })

      const result = await response.json()
      if (result.success) {
        // Refresh agent statuses
        fetchAgentStatuses()
        console.log(`Stopped ${agentName} in ${agentMode} mode`)
      } else {
        console.error('Failed to stop agent:', result.error)
      }
    } catch (error) {
      console.error('Error stopping agent:', error)
    }
  }

  const exportMessages = () => {
    const filteredMessages = messages.filter(msg => {
      const matchesThread = !threadFilter || msg.threadId.includes(threadFilter)
      const matchesAgent = !agentFilter || msg.fromAgentId.includes(agentFilter) || msg.toAgentId.includes(agentFilter)
      return matchesThread && matchesAgent
    })

    const dataStr = JSON.stringify(filteredMessages, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `coral-messages-${new Date().toISOString().split('T')[0]}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please log in to view Coral Inspector</p>
      </div>
    )
  }

  const filteredMessages = messages.filter(msg => {
    const matchesThread = !threadFilter || msg.threadId.includes(threadFilter)
    const matchesAgent = !agentFilter || msg.fromAgentId.includes(agentFilter) || msg.toAgentId.includes(agentFilter)
    return matchesThread && matchesAgent
  })

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
          {/* Mode Switch Architecture Toggle */}
          <Card className="p-3">
            <div className="flex items-center gap-3">
              <Label htmlFor="agent-mode" className="text-sm font-medium">
                Agent Mode:
              </Label>
              <Select value={agentMode} onValueChange={(value: AgentMode) => setAgentMode(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      Auto
                    </div>
                  </SelectItem>
                  <SelectItem value="coral">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      Coral
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>
          <Button onClick={fetchAgentStatuses} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>


      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Tools
          </TabsTrigger>
          <TabsTrigger value="threads" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Threads
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Logs
          </TabsTrigger>
        </TabsList>


        {/* Threads Tab */}
        <TabsContent value="threads" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Agent Threads</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportMessages}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="thread-filter">Thread ID</Label>
                  <Input
                    id="thread-filter"
                    placeholder="Filter by thread ID..."
                    value={threadFilter}
                    onChange={(e) => setThreadFilter(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="agent-filter">Agent</Label>
                  <Input
                    id="agent-filter"
                    placeholder="Filter by agent ID..."
                    value={agentFilter}
                    onChange={(e) => setAgentFilter(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Messages */}
          <Card>
            <CardHeader>
              <CardTitle>Messages ({filteredMessages.length})</CardTitle>
              <CardDescription>
                Real-time agent communications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 w-full">
                <div className="space-y-4">
                  {filteredMessages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No messages yet. Messages will appear here in real-time.
                    </div>
                  ) : (
                    filteredMessages.map((message) => (
                      <div key={message.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{message.type}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {message.fromAgentId} → {message.toAgentId}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-sm">
                          <strong>Thread:</strong> {message.threadId}
                        </div>
                        <div className="mt-2 p-2 bg-muted rounded text-sm">
                          {message.content}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tools Tab - Chat Interface at Top */}
        <TabsContent value="tools" className="space-y-4">
          {/* Main Chat Interface - Moved to Top */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Chat with Interface Agent
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowProtocolHelp(!showProtocolHelp)}
                  className="ml-auto"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </CardTitle>
              <CardDescription>
                Send messages directly to your Interface Agent - it will automatically route them to the right agents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Simple message input - no agent selection */}
              <div>
                <Label htmlFor="message-content">What would you like me to help you with?</Label>
                <Textarea
                  id="message-content"
                  placeholder="Type your request here... e.g., 'Are there any new tweets to scrape?' or 'Write a blog about the latest tech trends'"
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Examples: "Check for new tweets", "Write a blog about AI", "What's trending on social media?"
                </p>
              </div>

              <Button 
                onClick={handleSendMessage} 
                disabled={!messageContent}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </Button>

              {toolResponse && (
                <div>
                  <Label>Response</Label>
                  <ScrollArea className="h-32 w-full">
                    <pre className="text-xs bg-muted p-4 rounded">
                      {toolResponse}
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Collapsible Protocol Help */}
          {showProtocolHelp && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-green-800">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Coral Protocol - Automatic Routing
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowProtocolHelp(false)}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                </CardTitle>
                <CardDescription className="text-green-700">
                  No need to select agents - the Interface Agent decides automatically
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-green-800">
                  <p className="mb-2">
                    <strong>How it works:</strong> Just ask what you want - "Are there any new tweets?" or "Write a blog about AI"
                  </p>
                  <p className="mb-2">
                    <strong>Message Flow:</strong> You → Interface Agent → Interface Agent chooses best agent → Response
                  </p>
                  <p>
                    <strong>Your Role:</strong> Simply describe what you want done, like talking to a smart assistant
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Agent Mode Help */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${agentMode === 'coral' ? 'bg-green-500' : 'bg-blue-500'}`} />
                  Current Mode: {agentMode === 'coral' ? 'Coral' : 'Auto'}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowModeHelp(!showModeHelp)}
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </CardTitle>
              <CardDescription>
                {agentMode === 'coral' 
                  ? 'Multi-agent communication enabled'
                  : 'Independent agent operation'
                }
              </CardDescription>
            </CardHeader>
            {showModeHelp && (
              <CardContent>
                <div className={`text-sm ${agentMode === 'coral' ? 'text-green-800' : 'text-blue-800'}`}>
                  {agentMode === 'coral' ? (
                    <div className="space-y-2">
                      <p><strong>How it works:</strong> Interface Agent coordinates with other agents via Coral Protocol</p>
                      <p><strong>Best for:</strong> Complex tasks requiring multiple agents (research + writing + posting)</p>
                      <p><strong>Communication:</strong> Real-time agent-to-agent messaging and coordination</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p><strong>How it works:</strong> Each agent operates independently based on its configuration</p>
                      <p><strong>Best for:</strong> Simple, single-purpose tasks (just scraping, just writing, etc.)</p>
                      <p><strong>Communication:</strong> No inter-agent communication, direct user interaction only</p>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Quick Start Guide */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Quick Start Guide
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">1</div>
                  <div>
                    <p className="font-medium">Type Your Request</p>
                    <p className="text-muted-foreground">Just describe what you want - no need to select which agent</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">2</div>
                  <div>
                    <p className="font-medium">Interface Agent Routes Automatically</p>
                    <p className="text-muted-foreground">The Interface Agent will choose the best agent for your request</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">3</div>
                  <div>
                    <p className="font-medium">Watch the Threads Tab</p>
                    <p className="text-muted-foreground">See real-time communication between agents as they work on your request</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold mb-4">System Logs</h2>
            <p className="text-muted-foreground mb-6">
              Real-time Coral server logs and system events
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Coming Soon</CardTitle>
              <CardDescription>
                Real-time log streaming will be implemented in a future update
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Log streaming functionality will be added here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
