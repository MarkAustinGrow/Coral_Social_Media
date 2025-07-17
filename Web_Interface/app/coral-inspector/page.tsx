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
  Play
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

export default function CoralInspectorPage() {
  const { user } = useAuth()
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([])
  const [serverStatus, setServerStatus] = useState<CoralServerStatus>({
    connected: false,
    url: "coral.8interns.com",
    activeSessions: 0,
    totalMessages: 0
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("dashboard")
  
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
    if (!messageContent) return

    try {
      // Send message directly to Interface Agent - no agent selection needed
      const response = await fetch('/api/coral/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: messageContent,
          userId: user?.id
        })
      })

      const result = await response.json()
      setToolResponse(JSON.stringify(result, null, 2))
      
      // Clear form
      setMessageContent("")
    } catch (error) {
      setToolResponse(`Error: ${error}`)
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
          agentName: agentName
        })
      })

      const result = await response.json()
      if (result.success) {
        // Refresh agent statuses
        fetchAgentStatuses()
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
          agentName: agentName
        })
      })

      const result = await response.json()
      if (result.success) {
        // Refresh agent statuses
        fetchAgentStatuses()
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
        <Button onClick={fetchAgentStatuses} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Server Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Coral Server Connection
          </CardTitle>
          <CardDescription>
            Connection status to {serverStatus.url}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {serverStatus.connected ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="font-medium">
                  {serverStatus.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {serverStatus.activeSessions} active agents
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {serverStatus.totalMessages} total messages
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="threads" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Threads
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Tools
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-4">My Agents</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {USER_AGENTS.map((agent) => {
                const agentId = getUserAgentId(agent.key)
                const status = agentStatuses.find(s => s.agentId === agentId)
                
                return (
                  <Card key={agent.key} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className={`w-3 h-3 rounded-full ${agent.color}`} />
                        {getStatusIcon(status?.status || 'offline')}
                      </div>
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {agent.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Status</span>
                          {getStatusBadge(status?.status || 'offline')}
                        </div>
                        
                        {status?.lastSeen && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Last Seen</span>
                            <span className="text-sm">
                              {new Date(status.lastSeen).toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Messages</span>
                          <span className="text-sm font-medium">
                            {status?.messageCount || 0}
                          </span>
                        </div>

                        <div className="pt-2">
                          {agent.isSpecial ? (
                            // Interface Agent gets start/stop buttons
                            <div className="space-y-2">
                              {status?.status === 'online' ? (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="w-full"
                                  onClick={() => handleStopAgent(agent.name)}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Stop Agent
                                </Button>
                              ) : (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="w-full"
                                  onClick={() => handleStartAgent(agent.name)}
                                >
                                  <Play className="h-3 w-3 mr-1" />
                                  Start Agent
                                </Button>
                              )}
                              {status?.sessionId && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="w-full"
                                  onClick={() => setActiveTab('threads')}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Inspect
                                </Button>
                              )}
                            </div>
                          ) : (
                            // Other agents get inspect button
                            status?.sessionId && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full"
                                onClick={() => setActiveTab('threads')}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Inspect
                              </Button>
                            )
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Common Coral Protocol inspection tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <Button variant="outline" className="justify-start" onClick={() => setActiveTab('threads')}>
                  <Activity className="h-4 w-4 mr-2" />
                  View All Sessions
                </Button>
                <Button variant="outline" className="justify-start" onClick={() => setActiveTab('threads')}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Recent Messages
                </Button>
                <Button variant="outline" className="justify-start" onClick={() => setActiveTab('tools')}>
                  <Users className="h-4 w-4 mr-2" />
                  Agent Interactions
                </Button>
                <Button variant="outline" className="justify-start" onClick={() => setActiveTab('tools')}>
                  <Eye className="h-4 w-4 mr-2" />
                  Debug Tools
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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

        {/* Tools Tab - Now a Simple Chat Interface */}
        <TabsContent value="tools" className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Chat with Interface Agent</h2>
            <p className="text-muted-foreground mb-6">
              Send messages directly to your Interface Agent - it will automatically route them to the right agents
            </p>
          </div>

          {/* Architecture Info */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <MessageCircle className="h-5 w-5" />
                Coral Protocol - Automatic Routing
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Chat Interface
              </CardTitle>
              <CardDescription>
                Send a message to your Interface Agent
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

          {/* Instructions Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                How to Use
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
