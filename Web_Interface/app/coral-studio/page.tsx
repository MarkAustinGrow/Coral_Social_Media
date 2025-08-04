'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

// Simple icon components to replace lucide-react
const RefreshIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
)

const ServerIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" strokeWidth={2}/>
    <line x1="8" y1="21" x2="16" y2="21" strokeWidth={2}/>
    <line x1="12" y1="17" x2="12" y2="21" strokeWidth={2}/>
  </svg>
)

const UsersIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
)

const MessageIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
)

const SettingsIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const PlayIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <polygon points="5,3 19,12 5,21" strokeWidth={2}/>
  </svg>
)

interface CoralConnection {
  host: string
  appId: string
  privacyKey: string
}

interface RegistryAgent {
  id: string
  name: string
  description?: string
  state?: 'connected' | 'disconnected' | 'error'
}

interface CoralSession {
  id: string
  name: string
  connected: boolean
  agents: Record<string, RegistryAgent>
  threads: any[]
}

export default function CoralStudioPage() {
  const [connection, setConnection] = useState<CoralConnection | null>(null)
  const [registry, setRegistry] = useState<Record<string, RegistryAgent> | null>(null)
  const [sessions, setSessions] = useState<string[]>([])
  const [currentSession, setCurrentSession] = useState<CoralSession | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [serverHost, setServerHost] = useState('coral.8interns.com')

  // Connection management
  const connectToServer = async (host: string) => {
    try {
      setConnecting(true)
      setError(null)
      setRegistry(null)
      
      const newConnection: CoralConnection = {
        host,
        appId: 'exampleApplication',
        privacyKey: 'privkey'
      }
      
      setConnection(newConnection)
      
      // Fetch agent registry
      const agentsResponse = await fetch(`https://${host}/api/v1/registry`)
      if (!agentsResponse.ok) throw new Error(`Failed to fetch agents: ${agentsResponse.status}`)
      
      const agents = await agentsResponse.json() as RegistryAgent[]
      const agentRegistry = Object.fromEntries(agents.map((agent) => [agent.id, agent]))
      setRegistry(agentRegistry)

      // Fetch available sessions
      const sessionsResponse = await fetch(`https://${host}/api/v1/sessions`)
      if (!sessionsResponse.ok) throw new Error(`Failed to fetch sessions: ${sessionsResponse.status}`)
      
      const sessionList = await sessionsResponse.json() as string[]
      setSessions(sessionList)
      
      setConnecting(false)
    } catch (e) {
      setConnecting(false)
      setRegistry(null)
      setError(`Connection failed: ${e}`)
    }
  }

  const createSession = async (sessionName: string) => {
    if (!connection) return
    
    try {
      const response = await fetch(`https://${connection.host}/api/v1/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          session: sessionName,
          appId: connection.appId,
          privacyKey: connection.privacyKey
        })
      })
      
      if (!response.ok) throw new Error(`Failed to create session: ${response.status}`)
      
      // Refresh sessions list
      await connectToServer(connection.host)
      
      // Connect to the new session
      connectToSession(sessionName)
    } catch (e) {
      setError(`Failed to create session: ${e}`)
    }
  }

  const connectToSession = (sessionId: string) => {
    if (!connection) return
    
    const session: CoralSession = {
      id: sessionId,
      name: sessionId,
      connected: true,
      agents: registry || {},
      threads: []
    }
    
    setCurrentSession(session)
  }

  const refreshConnection = () => {
    if (connection) {
      connectToServer(connection.host)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex flex-col space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Coral Studio</h1>
            <p className="text-muted-foreground">
              Create, manage & inspect agent sessions through Coral Server
            </p>
          </div>
          <Button
            onClick={refreshConnection}
            disabled={connecting}
          >
            <RefreshIcon className={cn("h-4 w-4 mr-2", connecting && "animate-spin")} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Server Connection Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ServerIcon className="h-5 w-5" />
                Server Connection
              </CardTitle>
              <CardDescription>
                Connect to your Coral Server instance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="server-host">Server Host</Label>
                <Input
                  id="server-host"
                  value={serverHost}
                  onChange={(e) => setServerHost(e.target.value)}
                  placeholder="coral.8interns.com"
                />
              </div>
              
              <Button 
                onClick={() => connectToServer(serverHost)}
                disabled={connecting}
                className="w-full"
              >
                {connecting ? (
                  <>
                    <RefreshIcon className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ServerIcon className="h-4 w-4 mr-2" />
                    Connect
                  </>
                )}
              </Button>

              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {error}
                </div>
              )}

              {registry && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <div className="h-2 w-2 bg-green-500 rounded-full" />
                  Connected • {Object.keys(registry).length} agents
                </div>
              )}
            </CardContent>
          </Card>

          {/* Agent Registry Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersIcon className="h-5 w-5" />
                Agent Registry
              </CardTitle>
              <CardDescription>
                Available agents on the server
              </CardDescription>
            </CardHeader>
            <CardContent>
              {registry ? (
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {Object.entries(registry).map(([id, agent]) => (
                      <div key={id} className="flex items-center justify-between p-2 border rounded-md">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{agent.name || id}</p>
                          {agent.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {agent.description}
                            </p>
                          )}
                        </div>
                        <Badge 
                          className="ml-2"
                        >
                          {agent.state || 'unknown'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <div className="text-center">
                    <ServerIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Connect to server to view agents</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Session Management Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageIcon className="h-5 w-5" />
                Sessions
              </CardTitle>
              <CardDescription>
                Manage agent communication sessions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {connection && (
                <>
                  <div className="space-y-2">
                    <Label>Available Sessions</Label>
                    <ScrollArea className="h-32">
                      <div className="space-y-1">
                        {sessions.map((session) => (
                          <Button
                            key={session}
                            className="w-full justify-start"
                            onClick={() => connectToSession(session)}
                          >
                            <MessageIcon className="h-4 w-4 mr-2" />
                            {session}
                          </Button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="new-session">Create New Session</Label>
                    <div className="flex gap-2">
                      <Input
                        id="new-session"
                        placeholder="session-name"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const target = e.target as HTMLInputElement
                            if (target.value.trim()) {
                              createSession(target.value.trim())
                              target.value = ''
                            }
                          }
                        }}
                      />
                      <Button
                        onClick={() => {
                          const input = document.getElementById('new-session') as HTMLInputElement
                          if (input.value.trim()) {
                            createSession(input.value.trim())
                            input.value = ''
                          }
                        }}
                      >
                        <PlayIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {!connection && (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <div className="text-center">
                    <MessageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Connect to server first</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Current Session Status */}
        {currentSession && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Current Session: {currentSession.name}
              </CardTitle>
              <CardDescription>
                Session is active and ready for agent communication
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
                <Separator orientation="vertical" className="h-4" />
                <div className="text-sm text-muted-foreground">
                  {Object.keys(currentSession.agents).length} agents available
                </div>
                <Separator orientation="vertical" className="h-4" />
                <div className="text-sm text-muted-foreground">
                  Server: {connection?.host}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Getting Started Guide */}
        {!connection && (
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>
                Welcome to Coral Studio! Follow these steps to begin:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium">Connect to Server</h4>
                    <p className="text-sm text-muted-foreground">
                      Enter your Coral Server host and establish connection
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium">Create Session</h4>
                    <p className="text-sm text-muted-foreground">
                      Create or connect to an existing agent session
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium">Manage Agents</h4>
                    <p className="text-sm text-muted-foreground">
                      View and interact with your AI agents in real-time
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
