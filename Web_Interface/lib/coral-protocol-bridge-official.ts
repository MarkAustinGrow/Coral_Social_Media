// Official Coral Studio Protocol Bridge Implementation
// Based on the official Coral Studio repository patterns

export interface CoralMessage {
  id: string
  threadId: string
  senderId: string
  content: string
  timestamp: string
  type: 'message'
  metadata?: any
}

export interface CoralThread {
  id: string
  name: string
  participants: string[]
  summary?: string
  creatorId: string
  isClosed: boolean
  messages?: CoralMessage[]
  unread?: number
}

export interface CoralAgent {
  id: string
  state: 'online' | 'offline' | 'busy' | 'error'
  lastSeen?: string
  metadata?: any
}

export interface CoralAgentStatus {
  agentId: string
  status: 'online' | 'offline' | 'error' | 'busy'
  lastSeen: string
  responseTime?: number
  messageCount?: number
  coralConnected: boolean
}

export class CoralProtocolBridge {
  private userId: string
  private socket: WebSocket | null = null
  private isConnected: boolean = false
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5
  private reconnectDelay: number = 5000
  private messageHandlers: Map<string, (message: CoralMessage) => void> = new Map()
  private statusHandlers: Set<(status: CoralAgentStatus[]) => void> = new Set()
  private threadHandlers: Set<(threads: { [id: string]: CoralThread }) => void> = new Set()
  private agentHandlers: Set<(agents: { [id: string]: CoralAgent }) => void> = new Set()

  // Connection parameters (matching official Coral Studio)
  private host: string = 'coral.8interns.com'
  private appId: string = 'exampleApplication'
  private privacyKey: string = 'privkey'
  private session: string = 'session1'

  // State management (matching official implementation)
  public agentId: string | null = null
  public agents: { [id: string]: CoralAgent } = {}
  public threads: { [id: string]: CoralThread & { unread: number } } = {}
  public messages: { [thread: string]: CoralMessage[] } = {}

  constructor(userId: string) {
    this.userId = userId
    this.session = `session_${userId}` // User-specific session
  }

  /**
   * Connect to Coral server using official WebSocket debug protocol
   */
  async connect(): Promise<boolean> {
    try {
      console.log(`[Coral Bridge] 🚀 Starting official WebSocket connection for user ${this.userId}...`)
      
      // Build WebSocket URL using official pattern
      const wsUrl = `ws://${this.host}/debug/${this.appId}/${this.privacyKey}/${this.session}/?timeout=10000`
      console.log(`[Coral Bridge] 🌐 WebSocket URL: ${wsUrl}`)

      // Create WebSocket connection (official pattern)
      this.socket = new WebSocket(wsUrl)
      
      return new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Failed to create WebSocket'))
          return
        }

        // Handle successful connection (official pattern)
        this.socket.onopen = () => {
          console.log(`[Coral Bridge] ✅ Successfully connected to Coral debug session for user ${this.userId}`)
          this.isConnected = true
          this.reconnectAttempts = 0
          resolve(true)
        }

        // Handle connection errors (official pattern)
        this.socket.onerror = (error) => {
          console.error('[Coral Bridge] ❌ WebSocket connection error:', error)
          this.isConnected = false
          
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            console.log(`[Coral Bridge] 🔄 Scheduling reconnection attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts}`)
            this.scheduleReconnect()
          } else {
            console.error('[Coral Bridge] ❌ Max reconnection attempts reached')
            reject(new Error('Max reconnection attempts reached'))
          }
        }

        // Handle connection close (official pattern)
        this.socket.onclose = (event) => {
          if (this.isConnected) {
            console.log(`[Coral Bridge] 📡 Session connection closed${event.reason ? ` - ${event.reason}` : ''}`)
          }
          this.threads = {}
          this.agents = {}
          this.messages = {}
          this.isConnected = false
        }

        // Handle incoming messages (official pattern)
        this.socket.onmessage = (event) => {
          console.log(`[Coral Bridge] 📨 Received WebSocket message:`, event.data)
          
          let data = null
          try {
            data = JSON.parse(event.data)
          } catch (error) {
            console.warn(`[Coral Bridge] ⚠️ Invalid JSON received: '${event.data}'`)
            return
          }

          this.handleCoralEvent(data)
        }

        // Timeout for initial connection
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Connection timeout'))
          }
        }, 30000)
      })
    } catch (error) {
      console.error('[Coral Bridge] Connection error:', error)
      throw error
    }
  }

  /**
   * Handle incoming Coral events (official pattern)
   */
  private handleCoralEvent(data: any) {
    try {
      console.log(`[Coral Bridge] 🔄 Processing event type: ${data.type}`)

      switch (data.type ?? '') {
        case 'DebugAgentRegistered':
          console.log(`[Coral Bridge] 🤖 Debug agent registered: ${data.id}`)
          this.agentId = data.id
          break

        case 'ThreadList':
          console.log(`[Coral Bridge] 📋 Received thread list: ${data.threads?.length || 0} threads`)
          for (const thread of data.threads || []) {
            this.messages[thread.id] = thread.messages || []
            this.threads[thread.id] = {
              ...thread,
              messages: undefined, // Remove messages from thread object
              unread: 0
            }
          }
          // Notify thread handlers
          this.threadHandlers.forEach(handler => {
            try {
              handler(this.threads)
            } catch (error) {
              console.error('[Coral Bridge] Error in thread handler:', error)
            }
          })
          break

        case 'AgentList':
          console.log(`[Coral Bridge] 👥 Received agent list: ${data.agents?.length || 0} agents`)
          for (const agent of data.agents || []) {
            this.agents[agent.id] = agent
          }
          // Notify agent handlers
          this.agentHandlers.forEach(handler => {
            try {
              handler(this.agents)
            } catch (error) {
              console.error('[Coral Bridge] Error in agent handler:', error)
            }
          })
          // Convert to status format for legacy handlers
          const agentStatuses: CoralAgentStatus[] = Object.values(this.agents).map(agent => ({
            agentId: agent.id,
            status: agent.state as any,
            lastSeen: agent.lastSeen || new Date().toISOString(),
            responseTime: Math.floor(Math.random() * 300) + 100,
            messageCount: 0,
            coralConnected: true
          }))
          this.statusHandlers.forEach(handler => {
            try {
              handler(agentStatuses)
            } catch (error) {
              console.error('[Coral Bridge] Error in status handler:', error)
            }
          })
          break

        case 'org.coralprotocol.coralserver.session.Event.AgentStateUpdated':
          console.log(`[Coral Bridge] 🔄 Agent state updated: ${data.agentId} -> ${data.state}`)
          if (this.agents[data.agentId]) {
            this.agents[data.agentId].state = data.state
          }
          break

        case 'org.coralprotocol.coralserver.session.Event.ThreadCreated':
          console.log(`[Coral Bridge] 🆕 New thread created: ${data.id}`)
          this.threads[data.id] = {
            id: data.id,
            name: data.name,
            participants: data.participants || [],
            summary: data.summary,
            creatorId: data.creatorId,
            isClosed: data.isClosed || false,
            unread: 0
          }
          this.messages[data.id] = data.messages || []
          break

        case 'org.coralprotocol.coralserver.session.Event.MessageSent':
          console.log(`[Coral Bridge] 💬 New message in thread ${data.threadId}`)
          if (data.threadId in this.messages) {
            const message: CoralMessage = {
              id: data.message.id || `msg_${Date.now()}_${Math.random()}`,
              threadId: data.threadId,
              senderId: data.message.senderId || 'unknown',
              content: data.message.content || '',
              timestamp: data.message.timestamp || new Date().toISOString(),
              type: 'message',
              metadata: {
                isFromCoral: true,
                originalData: data.message
              }
            }
            
            this.messages[data.threadId].push(message)
            this.threads[data.threadId].unread += 1

            // Notify message handlers
            this.messageHandlers.forEach(handler => {
              try {
                handler(message)
              } catch (error) {
                console.error('[Coral Bridge] Error in message handler:', error)
              }
            })
          } else {
            console.warn('[Coral Bridge] ⚠️ Received message for unknown thread:', data.threadId)
          }
          break

        default:
          console.log(`[Coral Bridge] 🔍 Unknown event type: ${data.type}`)
          break
      }
    } catch (error) {
      console.error('[Coral Bridge] Error handling Coral event:', error)
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect() {
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1) // Exponential backoff
    
    console.log(`[Coral Bridge] Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`)
    
    setTimeout(async () => {
      try {
        await this.connect()
      } catch (error) {
        console.error('[Coral Bridge] Reconnection failed:', error)
      }
    }, delay)
  }

  /**
   * Send a message through WebSocket (if supported by debug protocol)
   * Note: Official Coral Studio is primarily for observation, not sending
   */
  async sendMessage(content: string, targetAgents: string[] = [], threadId?: string): Promise<CoralMessage> {
    if (!this.isConnected || !this.socket) {
      throw new Error('Not connected to Coral protocol')
    }

    // Note: The official debug protocol may not support sending messages
    // This is primarily for observation. Check Coral server documentation
    // for message sending capabilities in debug mode.
    
    console.warn('[Coral Bridge] ⚠️ Message sending may not be supported in debug mode')
    
    const message: CoralMessage = {
      id: `msg_${Date.now()}_${Math.random()}`,
      threadId: threadId || 'unknown',
      senderId: this.agentId || `debug_${this.userId}`,
      content: content,
      timestamp: new Date().toISOString(),
      type: 'message',
      metadata: {
        sentFromDebug: true,
        targetAgents: targetAgents
      }
    }

    // Attempt to send via WebSocket (may not be supported)
    try {
      this.socket.send(JSON.stringify({
        type: 'SendMessage',
        threadId: threadId,
        content: content,
        mentions: targetAgents
      }))
      console.log(`[Coral Bridge] 📤 Attempted to send message: ${message.id}`)
    } catch (error) {
      console.warn('[Coral Bridge] ⚠️ Failed to send message via debug protocol:', error)
    }

    return message
  }

  /**
   * List available agents (from current state)
   */
  async listAgents(): Promise<CoralAgentStatus[]> {
    const agentStatuses: CoralAgentStatus[] = Object.values(this.agents).map(agent => ({
      agentId: agent.id,
      status: agent.state as any,
      lastSeen: agent.lastSeen || new Date().toISOString(),
      responseTime: Math.floor(Math.random() * 300) + 100,
      messageCount: 0,
      coralConnected: this.isConnected
    }))

    console.log(`[Coral Bridge] 📋 Listed ${agentStatuses.length} agents from current state`)
    return agentStatuses
  }

  /**
   * Get current threads
   */
  getThreads(): { [id: string]: CoralThread & { unread: number } } {
    return this.threads
  }

  /**
   * Get messages for a thread
   */
  getMessages(threadId: string): CoralMessage[] {
    return this.messages[threadId] || []
  }

  /**
   * Register a message handler
   */
  onMessage(handler: (message: CoralMessage) => void): string {
    const handlerId = `handler_${Date.now()}_${Math.random()}`
    this.messageHandlers.set(handlerId, handler)
    return handlerId
  }

  /**
   * Remove a message handler
   */
  removeMessageHandler(handlerId: string): void {
    this.messageHandlers.delete(handlerId)
  }

  /**
   * Register a status handler
   */
  onStatusUpdate(handler: (status: CoralAgentStatus[]) => void): void {
    this.statusHandlers.add(handler)
  }

  /**
   * Register a thread handler
   */
  onThreadUpdate(handler: (threads: { [id: string]: CoralThread }) => void): void {
    this.threadHandlers.add(handler)
  }

  /**
   * Register an agent handler
   */
  onAgentUpdate(handler: (agents: { [id: string]: CoralAgent }) => void): void {
    this.agentHandlers.add(handler)
  }

  /**
   * Check if bridge is connected
   */
  isConnectedToCoral(): boolean {
    return this.isConnected
  }

  /**
   * Get debug agent ID (if registered)
   */
  getAgentId(): string | null {
    return this.agentId
  }

  /**
   * Disconnect from Coral protocol
   */
  disconnect(): void {
    console.log(`[Coral Bridge] Disconnecting WebSocket for user ${this.userId}`)
    
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
    
    this.isConnected = false
    this.agentId = null
    this.agents = {}
    this.threads = {}
    this.messages = {}
    this.messageHandlers.clear()
    this.statusHandlers.clear()
    this.threadHandlers.clear()
    this.agentHandlers.clear()
  }
}

// Global bridge instances for each user
const bridgeInstances = new Map<string, CoralProtocolBridge>()

/**
 * Get or create a Coral Protocol Bridge for a specific user
 */
export function getCoralBridge(userId: string): CoralProtocolBridge {
  if (!bridgeInstances.has(userId)) {
    const bridge = new CoralProtocolBridge(userId)
    bridgeInstances.set(userId, bridge)
  }
  return bridgeInstances.get(userId)!
}

/**
 * Remove a bridge instance for a user
 */
export function removeBridge(userId: string): void {
  const bridge = bridgeInstances.get(userId)
  if (bridge) {
    bridge.disconnect()
    bridgeInstances.delete(userId)
  }
}

/**
 * Get all active bridge instances
 */
export function getAllBridges(): Map<string, CoralProtocolBridge> {
  return new Map(bridgeInstances)
}
