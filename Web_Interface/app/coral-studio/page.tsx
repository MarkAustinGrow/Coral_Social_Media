"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useAgentMode, AgentModeProvider } from "@/contexts/AgentModeContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  MessageCircle,
  RefreshCw,
  Send,
  Sparkles,
  Layers,
  Globe
} from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useCoralStudioSSE } from "@/hooks/use-coral-studio-sse"

// Enhanced agent configuration for Coral Studio
const CORAL_STUDIO_AGENTS = [
  {
    name: "Interface Agent",
    key: "interface_agent",
    description: "Central hub for all agent communications",
    color: "bg-yellow-500",
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

function CoralStudioPageContent() {
  const { user } = useAuth()
  const { agentMode } = useAgentMode()
  
  // Coral Studio SSE connection
  const {
    connected,
    error,
    session,
    messages,
    userInputRequests,
    messageEndpoint,
    createSession,
    sendMessage,
    respondToUserInput,
    disconnect
  } = useCoralStudioSSE()

  // UI State
  const [activeTab, setActiveTab] = useState("studio")
  const [messageContent, setMessageContent] = useState("")
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-create session when user is available
  useEffect(() => {
    if (user && !session && !connected) {
      createSession('interface_agent', user.id)
    }
  }, [user, session, connected, createSession])

  const handleSendMessage = async () => {
    if (!messageContent.trim() || !connected) return

    try {
      await sendMessage({
        type: 'user_message',
        content: messageContent,
        agents: selectedAgents.length > 0 ? selectedAgents : ['interface_agent']
      })
      
      setMessageContent("")
      setSelectedAgents([])
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'connecting':
        return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getConnectionStatusBadge = () => {
    if (connected) {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          SSE Connected
        </Badge>
      )
    } else if (error) {
      return (
        <Badge className="bg-red-100 text-red-800">
          <XCircle className="h-3 w-3 mr-1" />
          Connection Error
        </Badge>
      )
    } else {
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          <Clock className="h-3 w-3 mr-1 animate-pulse" />
          Connecting...
        </Badge>
      )
    }
  }

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
            Advanced multi-agent communication platform with real-time SSE connections
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
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Session Status */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-purple-600" />
            Active Session: {session ? session.sessionId : 'Default Session'}
          </CardTitle>
          <CardDescription>
            {session ? (
              <span>Connected to Coral server ({messages.length} messages)</span>
            ) : (
              "Establishing connection to Coral server..."
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-800">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="font-medium">Connection Error</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
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
        </TabsList>

        {/* Studio Tab - Main Chat Interface */}
        <TabsContent value="studio" className="space-y-4">
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
                disabled={!messageContent.trim() || !connected}
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
              <CardTitle>Live Messages ({messages.length})</CardTitle>
              <CardDescription>
                Real-time agent communications via Socket.IO
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 w-full">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No messages yet. Send a message above to start the conversation.
                    </div>
                  ) : (
                    messages.map((message, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{message.type}</Badge>
                            <span className="text-sm text-muted-foreground">
                              Agent Response
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : 'Now'}
                          </span>
                        </div>
                        <div className="mt-2 p-2 bg-muted rounded text-sm">
                          {typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}
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

        {/* Agents Tab */}
        <TabsContent value="agents" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Agent Status Dashboard</h2>
            <Button onClick={() => window.location.reload()}>
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
                  {agents.map((agent) => (
                    <Card key={agent.key} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${agent.color}`} />
                          <span className="font-medium">{agent.name}</span>
                        </div>
                        {getStatusIcon(connected ? 'connected' : 'connecting')}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {agent.description}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Status: {connected ? 'Ready' : 'Connecting'}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Message History</h2>
          </div>

          {/* Message List */}
          <Card>
            <CardHeader>
              <CardTitle>All Messages ({messages.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 w-full">
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{message.type}</Badge>
                          <span className="text-sm text-muted-foreground">
                            Session: {session?.sessionId || 'Default'}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {message.timestamp ? new Date(message.timestamp).toLocaleString() : 'Now'}
                        </span>
                      </div>
                      <div className="p-2 bg-muted rounded text-sm">
                        {typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
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
