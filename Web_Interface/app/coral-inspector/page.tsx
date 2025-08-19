"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useAgentMode, AgentModeProvider } from "@/contexts/AgentModeContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
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
      } catch (streamError: any) {
        console.error('[FRONTEND] Stream reading error:', streamError)
        console.error('[FRONTEND] Error type:', streamError.constructor?.name)
        console.error('[FRONTEND] Error message:', streamError.message || 'Unknown error')
        throw streamError
      } finally {
        console.log('[FRONTEND] Releasing reader lock')
        reader.releaseLock()
      }
      
      console.log('[FRONTEND] Interface Agent session completed successfully')
      setToolResponse(prev => `${prev}✅ Interface Agent session completed.\n`)
    } catch (error: any) {
      console.error('[FRONTEND] Interface Agent error:', error)
      console.error('[FRONTEND] Error type:', error.constructor?.name)
      console.error('[FRONTEND] Error message:', error.message || 'Unknown error')
      console.error('[FRONTEND] Error stack:', error.stack)
      setToolResponse(prev => `${prev}❌ Error: ${error.message || String(error)}\n`)
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
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Simple message input - no agent selection */}
          <div>
            <Textarea
              id="message-content"
              placeholder="Type your request here..."
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              rows={4}
              className="mt-2 text-base"
            />
          </div>

          <Button 
            onClick={handleSendMessage} 
            disabled={!messageContent}
            className="w-full h-12 text-base"
          >
            <Send className="h-5 w-5 mr-2" />
            Send Message
          </Button>

          {toolResponse && (
            <div>
              <ScrollArea className="h-[300px] w-full mt-2">
                <pre className="text-sm bg-muted p-4 rounded">
                  {toolResponse}
                </pre>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Simplified Mode Indicator */}
      <Card className="border-gray-200 bg-gray-50">
        <CardHeader className="py-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <div className={`w-3 h-3 rounded-full ${agentMode === 'coral' ? 'bg-green-500' : 'bg-blue-500'}`} />
            {agentMode === 'coral' ? 'Coral Mode' : 'Auto Mode'}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Help button - collapsed by default */}
      <Button
        onClick={() => setShowInstructions(!showInstructions)}
        className="w-full justify-between bg-transparent border border-gray-200 hover:bg-gray-100"
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          <span className="font-semibold">Help</span>
        </div>
        {showInstructions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>
      
      {showInstructions && (
        <Card className="mt-2">
          <CardContent className="pt-4">
            <div className="space-y-2 text-sm">
              <p>Type your request in the text area above and click Send Message.</p>
              <p>The system will automatically route your request to the appropriate agent.</p>
            </div>
          </CardContent>
        </Card>
      )}
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
