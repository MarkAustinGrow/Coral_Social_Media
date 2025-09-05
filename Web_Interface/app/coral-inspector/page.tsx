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

// Interface Agent - Central hub for all communications
const INTERFACE_AGENT = {
  name: "Interface Agent",
  key: "user_interaction_agent",
  description: "Central hub for all agent communications",
  color: "bg-yellow-500"
}

// User's agents configuration including Interface Agent
const USER_AGENTS = [
  {
    name: "Interface Agent",
    key: "interface_agent",
    description: "Central hub for all agent communications",
    color: "bg-yellow-500",
    isSpecial: true
  },
  {
    name: "World News Agent",
    key: "world_news_agent",
    description: "Fetches and generates news topics",
    color: "bg-blue-500"
  },
  {
    name: "Tweet Scraping Agent", 
    key: "tweet_scraping_agent",
    description: "Scrapes and analyzes tweets",
    color: "bg-green-500"
  },
  {
    name: "Tweet Research Agent",
    key: "tweet_research_agent", 
    description: "Researches tweet content and context",
    color: "bg-purple-500"
  },
  {
    name: "Hot Topic Agent",
    key: "hot_topic_agent",
    description: "Identifies trending topics and engagement",
    color: "bg-orange-500"
  },
  {
    name: "Blog Critique Agent",
    key: "blog_critique_agent",
    description: "Reviews and fact-checks blog content",
    color: "bg-red-500"
  },
  {
    name: "Blog Writing Agent", 
    key: "blog_writing_agent",
    description: "Creates blog content from research",
    color: "bg-indigo-500"
  },
  {
    name: "Blog to Tweet Agent",
    key: "blog_to_tweet_agent",
    description: "Converts blogs to tweet threads",
    color: "bg-pink-500"
  },
  {
    name: "Twitter Posting Agent",
    key: "twitter_posting_agent",
    description: "Posts tweets and manages scheduling",
    color: "bg-cyan-500"
  }
]

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
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([])
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
  const [sessionId, setSessionId] = useState<string>("")

  // Help sections state
  const [showModeHelp, setShowModeHelp] = useState(false)
  const [showProtocolHelp, setShowProtocolHelp] = useState(false)
  const [showArchitectureInfo, setShowArchitectureInfo] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)

  // Session persistence functions
  const getSessionKey = () => user ? `coral-inspector-session-${user.id}` : null

  const saveSessionToStorage = (response: string, sessionId: string) => {
    const key = getSessionKey()
    if (!key) return
    
    const sessionData = {
      response,
      sessionId,
      timestamp: Date.now(),
      userId: user?.id
    }
    
    try {
      localStorage.setItem(key, JSON.stringify(sessionData))
    } catch (error) {
      console.error('Failed to save session to localStorage:', error)
    }
  }

  const loadSessionFromStorage = () => {
    const key = getSessionKey()
    if (!key) return null
    
    try {
      const stored = localStorage.getItem(key)
      if (!stored) return null
      
      const sessionData = JSON.parse(stored)
      
      // Check if session is less than 1 hour old
      const oneHour = 60 * 60 * 1000
      if (Date.now() - sessionData.timestamp > oneHour) {
        localStorage.removeItem(key)
        return null
      }
      
      return sessionData
    } catch (error) {
      console.error('Failed to load session from localStorage:', error)
      return null
    }
  }

  const clearSessionFromStorage = () => {
    const key = getSessionKey()
    if (!key) return
    
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Failed to clear session from localStorage:', error)
    }
  }

  // Load session on component mount
  useEffect(() => {
    if (!user) return
    
    const savedSession = loadSessionFromStorage()
    if (savedSession) {
      setToolResponse(savedSession.response)
      setSessionId(savedSession.sessionId)
    }
  }, [user])

  // Save session whenever toolResponse changes
  useEffect(() => {
    if (!user || !toolResponse) return
    
    saveSessionToStorage(toolResponse, sessionId)
  }, [toolResponse, sessionId, user])

  // Generate user-specific agent IDs
  const getUserAgentId = (agentKey: string) => {
    return user ? `${agentKey}_${user.id}` : agentKey
  }

  // Fetch user's agent statuses
  const fetchAgentStatuses = async () => {
    if (!user) return

    try {
      setLoading(true)
      
      // Fetch status for each user agent
      const statuses = await Promise.all(
        USER_AGENTS.map(async (agent) => {
          const agentId = getUserAgentId(agent.key)
          
          try {
            // Check if agent is connected to Coral server
            const response = await fetch(`/api/coral/agent-status?agentId=${agentId}`)
            const data = await response.json()
            
            return {
              agentId,
              status: data.connected ? 'online' : 'offline',
              lastSeen: data.lastSeen,
              messageCount: data.messageCount || 0,
              sessionId: data.sessionId
            } as AgentStatus
          } catch (error) {
            return {
              agentId,
              status: 'error',
              lastSeen: undefined,
              messageCount: 0
            } as AgentStatus
          }
        })
      )

      setAgentStatuses(statuses)

      // Update server status
      const connectedAgents = statuses.filter(s => s.status === 'online').length
      setServerStatus(prev => ({
        ...prev,
        connected: connectedAgents > 0,
        activeSessions: connectedAgents,
        totalMessages: statuses.reduce((sum, s) => sum + (s.messageCount || 0), 0)
      }))

    } catch (error) {
      console.error('Failed to fetch agent statuses:', error)
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
      console.log('[FRONTEND] Starting Interface Agent session for user:', user.id)
      
      // Clear previous session from storage when starting new session
      clearSessionFromStorage()
      
      // Generate new session ID
      const newSessionId = `session_${Date.now()}_${user.id}`
      setSessionId(newSessionId)
      
      setToolResponse("🚀 Starting Interface Agent session...\n")
      
      // Start SSE connection to Interface Agent
      console.log('[FRONTEND] Making POST request to /api/coral/interface-agent')
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

      console.log('[FRONTEND] Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[FRONTEND] HTTP error response:', errorText)
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`)
      }

      if (!response.body) {
        console.error('[FRONTEND] No response stream received')
        throw new Error('No response stream received')
      }

      console.log('[FRONTEND] Starting to read SSE stream')
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let chunkCount = 0

      try {
        // Read the SSE stream
        while (true) {
          console.log('[FRONTEND] Reading chunk', chunkCount + 1)
          const { done, value } = await reader.read()
          
          if (done) {
            console.log('[FRONTEND] SSE stream completed after', chunkCount, 'chunks')
            break
          }

          chunkCount++
          console.log('[FRONTEND] Chunk', chunkCount, 'received, size:', value?.length)

          // Decode the chunk and add to buffer
          const chunk = decoder.decode(value, { stream: true })
          buffer += chunk
          console.log('[FRONTEND] Chunk decoded, buffer size:', buffer.length)
          
          // Process complete lines
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // Keep incomplete line in buffer
          console.log('[FRONTEND] Processing', lines.length, 'lines from chunk', chunkCount)

          for (const line of lines) {
            if (line.trim() === '') continue // Skip empty lines
            
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.slice(6).trim()
                if (jsonStr && jsonStr !== '') {
                  const data = JSON.parse(jsonStr)
                  console.log('[FRONTEND] Received SSE data:', data)
                  handleInterfaceAgentMessage(data)
                }
              } catch (e) {
                console.error('[FRONTEND] Error parsing SSE data:', e, 'Line:', line)
                setToolResponse(prev => `${prev}[ERROR] Failed to parse: ${line}\n`)
              }
            } else if (line.trim() !== '') {
              console.log('[FRONTEND] Non-SSE line received:', line)
            }
          }
        }
      } catch (streamError) {
        console.error('[FRONTEND] Stream reading error:', streamError)
        console.error('[FRONTEND] Error type:', streamError.constructor.name)
        console.error('[FRONTEND] Error message:', streamError.message)
        throw streamError
      } finally {
        console.log('[FRONTEND] Releasing reader lock')
        reader.releaseLock()
      }
      
      console.log('[FRONTEND] Interface Agent session completed successfully')
      setToolResponse(prev => `${prev}✅ Interface Agent session completed.\n`)
    } catch (error) {
      console.error('[FRONTEND] Interface Agent error:', error)
      console.error('[FRONTEND] Error type:', error.constructor.name)
      console.error('[FRONTEND] Error message:', error.message)
      console.error('[FRONTEND] Error stack:', error.stack)
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

      {/* Main Chat Interface - Top Priority */}
      <Card className="border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Send className="h-6 w-6" />
            Chat Interface
          </CardTitle>
          <CardDescription className="text-base">
            Send messages directly to your Interface Agent - it will automatically route them to the right agents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Simple message input - no agent selection */}
          <div>
            <Label htmlFor="message-content" className="text-base font-medium">What would you like me to help you with?</Label>
            <Textarea
              id="message-content"
              placeholder="Type your request here... e.g., 'Are there any new tweets to scrape?' or 'Write a blog about the latest tech trends'"
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              rows={4}
              className="mt-2 text-base"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Examples: "Check for new tweets", "Write a blog about AI", "What's trending on social media?"
            </p>
          </div>

          <Button 
            onClick={handleSendMessage} 
            disabled={!messageContent}
            className="w-full h-12 text-base"
            size="lg"
          >
            <Send className="h-5 w-5 mr-2" />
            Send Message
          </Button>

          {toolResponse && (
            <div>
              <Label className="text-base font-medium">Response</Label>
              <ScrollArea className="h-40 w-full mt-2">
                <pre className="text-sm bg-muted p-4 rounded">
                  {toolResponse}
                </pre>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mode Switch Architecture Info */}
      <Card className={agentMode === 'coral' ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${agentMode === 'coral' ? 'text-green-800' : 'text-blue-800'}`}>
            <div className={`w-3 h-3 rounded-full ${agentMode === 'coral' ? 'bg-green-500' : 'bg-blue-500'}`} />
            {agentMode === 'coral' ? 'Coral Mode - Multi-Agent Communication' : 'Auto Mode - Independent Agents'}
          </CardTitle>
          <CardDescription className={agentMode === 'coral' ? 'text-green-700' : 'text-blue-700'}>
            {agentMode === 'coral' 
              ? 'Agents communicate with each other through the Coral Protocol for coordinated tasks'
              : 'Agents work independently without inter-agent communication'
            }
          </CardDescription>
        </CardHeader>
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
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Chat
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

        {/* Tools Tab - Help Sections Only */}
        <TabsContent value="tools" className="space-y-6">
          {/* Note about main chat interface */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="text-center text-blue-800">
                <MessageCircle className="h-8 w-8 mx-auto mb-2" />
                <p className="font-medium">The main chat interface is located at the top of this page</p>
                <p className="text-sm text-blue-600 mt-1">Scroll up to start chatting with your Interface Agent</p>
              </div>
            </CardContent>
          </Card>

          {/* Collapsible Help Sections */}
          <div className="space-y-3">
            {/* Architecture Info - Collapsible */}
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <Button
                  variant="ghost"
                  onClick={() => setShowArchitectureInfo(!showArchitectureInfo)}
                  className="w-full justify-between p-0 h-auto text-green-800 hover:bg-green-100"
                >
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    <span className="font-semibold">How Coral Protocol Works</span>
                  </div>
                  {showArchitectureInfo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CardHeader>
              {showArchitectureInfo && (
                <CardContent className="pt-0">
                  <div className="text-sm text-green-800 space-y-2">
                    <p>
                      <strong>How it works:</strong> Just ask what you want - "Are there any new tweets?" or "Write a blog about AI"
                    </p>
                    <p>
                      <strong>Message Flow:</strong> You → Interface Agent → Interface Agent chooses best agent → Response
                    </p>
                    <p>
                      <strong>Your Role:</strong> Simply describe what you want done, like talking to a smart assistant
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Instructions - Collapsible */}
            <Card>
              <CardHeader className="pb-3">
                <Button
                  variant="ghost"
                  onClick={() => setShowInstructions(!showInstructions)}
                  className="w-full justify-between p-0 h-auto hover:bg-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5" />
                    <span className="font-semibold">Step-by-Step Instructions</span>
                  </div>
                  {showInstructions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CardHeader>
              {showInstructions && (
                <CardContent className="pt-0">
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
              )}
            </Card>
          </div>
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

export default function CoralInspectorPage() {
  return (
    <AgentModeProvider>
      <CoralInspectorPageContent />
    </AgentModeProvider>
  )
}
