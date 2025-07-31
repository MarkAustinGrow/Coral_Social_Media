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
  ChevronUp,
  Sparkles,
  Layers,
  Globe
} from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useSocket } from "@/hooks/use-socket"
import { useCoralStudio } from "@/hooks/use-coral-studio"

// Enhanced agent configuration for Coral Studio
const CORAL_STUDIO_AGENTS = [
  {
    name: "Interface Agent",
    key: "interface_agent",
    description: "Central hub for all agent communications",
    color: "bg-yellow-500",
    isSpecial: true,
    category: "Core"
  },
  {
    name: "Tweet Scraping Agent", 
    key: "tweet_scraping_agent",
    description: "Monitors Twitter accounts and collects tweets",
    color: "bg-green-500",
    category: "Data Collection"
  },
  {
    name: "Tweet Research Agent",
    key: "tweet_research_agent", 
    description: "Analyzes tweets and extracts insights",
    color: "bg-purple-500",
    category: "Analysis"
  },
  {
    name: "Hot Topic Agent",
    key: "hot_topic_agent",
    description: "Identifies trending topics and engagement",
    color: "bg-orange-500",
    category: "Analysis"
  },
  {
    name: "Blog Writing Agent", 
    key: "blog_writing_agent",
    description: "Creates blog content from research",
    color: "bg-indigo-500",
    category: "Content Creation"
  },
  {
    name: "Blog Critique Agent",
    key: "blog_critique_agent",
    description: "Reviews and fact-checks blog content",
    color: "bg-red-500",
    category: "Quality Assurance"
  },
  {
    name: "Blog to Tweet Agent",
    key: "blog_to_tweet_agent",
    description: "Converts blogs to tweet threads",
    color: "bg-pink-500",
    category: "Content Creation"
  },
  {
    name: "Twitter Posting Agent",
    key: "twitter_posting_agent",
    description: "Posts tweets and manages scheduling",
    color: "bg-cyan-500",
    category: "Publishing"
  },
  {
    name: "X Reply Agent",
    key: "x_reply_agent",
    description: "Generates and posts replies to tweets",
    color: "bg-blue-500",
    category: "Engagement"
  }
]

interface Session {
  id: string
  name: string
  created: string
  lastActive: string
  messageCount: number
  agents: string[]
  status: 'active' | 'idle' | 'archived'
}

interface AgentStatus {
  agentId: string
  status: 'online' | 'offline' | 'error' | 'connecting'
  lastSeen?: string
  messageCount?: number
  sessionId?: string
  responseTime?: number
}

interface CoralMessage {
  id: string
  sessionId: string
  fromAgentId: string
  toAgentId?: string
  content: string
  timestamp: string
  type: 'message' | 'mention' | 'tool_call' | 'tool_response' | 'status'
  metadata?: any
}

function CoralStudioPageContent() {
  const { user } = useAuth()
  const { agentMode } = useAgentMode()
  
  // Socket.IO connection
  const { socket, isConnected, connectionStatus } = useSocket()
  
  // Coral Studio specific hooks
  const {
    sessions,
    currentSession,
    createSession,
    switchSession,
    archiveSession,
    sendMessage,
    messages,
    agentStatuses,
    refreshAgentStatuses
  } = useCoralStudio(socket, user)

  // UI State
  const [activeTab, setActiveTab] = useState("studio")
  const [messageContent, setMessageContent] = useState("")
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [sessionName, setSessionName] = useState("")
  const [showSessionManager, setShowSessionManager] = useState(false)
  const [agentFilter, setAgentFilter] = useState("")
  const [messageFilter, setMessageFilter] = useState("")
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Generate user-specific agent IDs
  const getUserAgentId = (agentKey: string) => {
    return user ? `${agentKey}_${user.id}` : agentKey
  }

  const handleSendMessage = async () => {
    if (!messageContent.trim() || !currentSession) return

    try {
      await sendMessage({
        content: messageContent,
        sessionId: currentSession.id,
        targetAgents: selectedAgents.length > 0 ? selectedAgents : ['interface_agent']
      })
      
      setMessageContent("")
      setSelectedAgents([])
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleCreateSession = async () => {
    if (!sessionName.trim()) return

    try {
      await createSession(sessionName)
      setSessionName("")
      setShowSessionManager(false)
    } catch (error) {
      console.error('Failed to create session:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'offline':
        return <XCircle className="h-4 w-4 text-gray-400" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'connecting':
        return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getConnectionStatusBadge = () => {
    const variants = {
      connected: "bg-green-100 text-green-800",
      connecting: "bg-yellow-100 text-yellow-800",
      disconnected: "bg-red-100 text-red-800",
      error: "bg-red-100 text-red-800"
    }
    
    return (
      <Badge className={variants[connectionStatus] || variants.disconnected}>
        {connectionStatus === 'connected' && <CheckCircle className="h-3 w-3 mr-1" />}
        {connectionStatus === 'connecting' && <Clock className="h-3 w-3 mr-1 animate-pulse" />}
        {(connectionStatus === 'disconnected' || connectionStatus === 'error') && <XCircle className="h-3 w-3 mr-1" />}
        Socket.IO {connectionStatus}
      </Badge>
    )
  }

  const filteredMessages = messages.filter(msg => {
    const matchesAgent = !agentFilter || 
      msg.fromAgentId.includes(agentFilter) || 
      (msg.toAgentId && msg.toAgentId.includes(agentFilter))
    const matchesContent = !messageFilter || 
      msg.content.toLowerCase().includes(messageFilter.toLowerCase())
    return matchesAgent && matchesContent
  })

  const groupedAgents = CORAL_STUDIO_AGENTS.reduce((acc, agent) => {
    if (!acc[agent.category]) {
      acc[agent.category] = []
    }
    acc[agent.category].push(agent)
    return acc
  }, {} as Record<string, typeof CORAL_STUDIO_AGENTS>)

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please log in to access Coral Studio</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-purple-500" />
            Coral Studio
          </h1>
          <p className="text-muted-foreground">
            Advanced multi-agent communication platform with real-time Socket.IO connections
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <Card className="p-3">
            <div className="flex items-center gap-3">
              {getConnectionStatusBadge()}
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${agentMode === 'coral' ? 'bg-green-500' : 'bg-blue-500'}`} />
                <span className="text-sm font-medium">
                  Mode: {agentMode === 'coral' ? 'Coral' : 'Auto'}
                </span>
              </div>
            </div>
          </Card>
          <Button onClick={refreshAgentStatuses}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Session Management */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-600" />
              Session Management
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowSessionManager(!showSessionManager)}
            >
              {showSessionManager ? 'Hide' : 'Manage Sessions'}
            </Button>
          </CardTitle>
          <CardDescription>
            {currentSession ? (
              <span>Active Session: <strong>{currentSession.name}</strong> ({currentSession.messageCount} messages)</span>
            ) : (
              "No active session - create one to start communicating with agents"
            )}
          </CardDescription>
        </CardHeader>
        {showSessionManager && (
          <CardContent>
            <div className="space-y-4">
              {/* Create New Session */}
              <div className="flex gap-2">
                <Input
                  placeholder="Enter session name..."
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateSession()}
                />
                <Button onClick={handleCreateSession} disabled={!sessionName.trim()}>
                  Create Session
                </Button>
              </div>
              
              {/* Session List */}
              <div className="grid gap-2 max-h-40 overflow-y-auto">
                {sessions.map((session) => (
                  <div 
                    key={session.id}
                    className={`flex items-center justify-between p-3 rounded border cursor-pointer transition-colors ${
                      currentSession?.id === session.id 
                        ? 'bg-purple-100 border-purple-300' 
                        : 'bg-white hover:bg-gray-50'
                    }`}
                    onClick={() => switchSession(session.id)}
                  >
                    <div>
                      <p className="font-medium">{session.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {session.messageCount} messages • {session.agents.length} agents
                      </p>
                    </div>
                    <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                      {session.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Main Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="studio" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Studio
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Agents
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Studio Tab - Main Chat Interface */}
        <TabsContent value="studio" className="space-y-4">
          {!currentSession ? (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="text-center text-yellow-800">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2" />
                  <p className="font-medium">No Active Session</p>
                  <p className="text-sm text-yellow-600 mt-1">Create a session above to start communicating with agents</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Enhanced Chat Interface */}
              <Card className="border-2 border-purple-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Send className="h-6 w-6" />
                    Coral Studio Chat
                  </CardTitle>
                  <CardDescription className="text-base">
                    Enhanced multi-agent communication with Socket.IO real-time connections
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Agent Selection */}
                  <div>
                    <Label className="text-base font-medium">Target Agents (optional)</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {CORAL_STUDIO_AGENTS.map((agent) => (
                        <Button
                          key={agent.key}
                          variant={selectedAgents.includes(agent.key) ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setSelectedAgents(prev => 
                              prev.includes(agent.key)
                                ? prev.filter(id => id !== agent.key)
                                : [...prev, agent.key]
                            )
                          }}
                        >
                          <div className={`w-2 h-2 rounded-full ${agent.color} mr-2`} />
                          {agent.name}
                        </Button>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Leave empty to let Interface Agent route automatically
                    </p>
                  </div>

                  {/* Message Input */}
                  <div>
                    <Label htmlFor="message-content" className="text-base font-medium">
                      What would you like me to help you with?
                    </Label>
                    <Textarea
                      id="message-content"
                      placeholder="Type your request here... e.g., 'Are there any new tweets to scrape?' or 'Write a blog about the latest tech trends'"
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      rows={4}
                      className="mt-2 text-base"
                    />
                  </div>

                  <Button 
                    onClick={handleSendMessage} 
                    disabled={!messageContent.trim() || !isConnected}
                    className="w-full h-12 text-base"
                    size="lg"
                  >
                    <Send className="h-5 w-5 mr-2" />
                    Send Message via Socket.IO
                  </Button>
                </CardContent>
              </Card>

              {/* Real-time Messages */}
              <Card>
                <CardHeader>
                  <CardTitle>Live Messages ({filteredMessages.length})</CardTitle>
                  <CardDescription>
                    Real-time agent communications via Socket.IO
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96 w-full">
                    <div className="space-y-4">
                      {filteredMessages.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          No messages yet. Send a message above to start the conversation.
                        </div>
                      ) : (
                        filteredMessages.map((message) => (
                          <div key={message.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{message.type}</Badge>
                                <span className="text-sm text-muted-foreground">
                                  {message.fromAgentId} {message.toAgentId && `→ ${message.toAgentId}`}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(message.timestamp).toLocaleTimeString()}
                              </span>
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
            </>
          )}
        </TabsContent>

        {/* Agents Tab */}
        <TabsContent value="agents" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Agent Status Dashboard</h2>
            <Button onClick={refreshAgentStatuses}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh All
            </Button>
          </div>

          {Object.entries(groupedAgents).map(([category, agents]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  {category} Agents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {agents.map((agent) => {
                    const agentId = getUserAgentId(agent.key)
                    const status = agentStatuses.find(s => s.agentId === agentId)
                    
                    return (
                      <Card key={agent.key} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${agent.color}`} />
                            <span className="font-medium">{agent.name}</span>
                          </div>
                          {getStatusIcon(status?.status || 'offline')}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {agent.description}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Messages: {status?.messageCount || 0}</span>
                          {status?.responseTime && (
                            <span>Response: {status.responseTime}ms</span>
                          )}
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Message History</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
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
                  <Label htmlFor="agent-filter">Agent</Label>
                  <Input
                    id="agent-filter"
                    placeholder="Filter by agent..."
                    value={agentFilter}
                    onChange={(e) => setAgentFilter(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="message-filter">Content</Label>
                  <Input
                    id="message-filter"
                    placeholder="Filter by message content..."
                    value={messageFilter}
                    onChange={(e) => setMessageFilter(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Message List */}
          <Card>
            <CardHeader>
              <CardTitle>All Messages ({filteredMessages.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 w-full">
                <div className="space-y-4">
                  {filteredMessages.map((message) => (
                    <div key={message.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{message.type}</Badge>
                          <span className="text-sm text-muted-foreground">
                            Session: {message.sessionId}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-sm mb-2">
                        <strong>From:</strong> {message.fromAgentId}
                        {message.toAgentId && (
                          <span> <strong>To:</strong> {message.toAgentId}</span>
                        )}
                      </div>
                      <div className="p-2 bg-muted rounded text-sm">
                        {message.content}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Analytics Dashboard</h2>
            <p className="text-muted-foreground mb-6">
              Real-time analytics and performance metrics
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                <Layers className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sessions.length}</div>
                <p className="text-xs text-muted-foreground">
                  {sessions.filter(s => s.status === 'active').length} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{messages.length}</div>
                <p className="text-xs text-muted-foreground">
                  Across all sessions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Online Agents</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {agentStatuses.filter(s => s.status === 'online').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  of {agentStatuses.length} total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Connection</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isConnected ? 'Connected' : 'Offline'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Socket.IO status
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Coming Soon</CardTitle>
              <CardDescription>
                Advanced analytics including response times, message patterns, and agent performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Detailed analytics dashboard will be implemented in the next phase</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function CoralStudioPage() {
  return (
    <AgentModeProvider>
      <CoralStudioPageContent />
    </AgentModeProvider>
  )
}
