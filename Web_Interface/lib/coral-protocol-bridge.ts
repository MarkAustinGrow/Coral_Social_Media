// EventSource handling for both client and server
let EventSourceClass: any

// Check if we're in a browser environment
if (typeof window !== 'undefined') {
  // Browser environment - use native EventSource
  EventSourceClass = EventSource
  console.log('[Coral Bridge] Browser environment detected - using native EventSource')
} else {
  // Server environment - use eventsource library
  try {
    const { EventSource } = require('eventsource')
    EventSourceClass = EventSource
    console.log('[Coral Bridge] Server environment detected - using eventsource library')
  } catch (error) {
    console.error('[Coral Bridge] Failed to load eventsource library:', error)
    EventSourceClass = null
  }
}

export interface CoralMessage {
  id: string
  threadId: string
  fromAgentId: string
  toAgentId?: string
  content: string
  timestamp: string
  type: 'message' | 'mention' | 'tool_call' | 'tool_response' | 'status'
  metadata?: any
}

export interface CoralThread {
  id: string
  name: string
  participants: string[]
  created: string
  lastActivity: string
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
  private bridgeAgentId: string
  private baseUrl: string
  private eventSource: EventSource | null = null
  private messageEndpoint: string | null = null
  private isConnected: boolean = false
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5
  private reconnectDelay: number = 5000
  private messageHandlers: Map<string, (message: CoralMessage) => void> = new Map()
  private statusHandlers: Set<(status: CoralAgentStatus[]) => void> = new Set()

  constructor(userId: string) {
    this.userId = userId
    this.bridgeAgentId = `coral_studio_bridge_${userId}`
    this.baseUrl = 'http://coral.8interns.com/devmode/exampleApplication/privkey/session1'
  }

  /**
   * Connect to the Coral protocol as a bridge agent
   */
  async connect(): Promise<boolean> {
    try {
      console.log(`[Coral Bridge] 🚀 Starting connection for user ${this.userId}...`)
      console.log(`[Coral Bridge] 🔗 Base URL: ${this.baseUrl}`)
      
      // Check if EventSource is available (client-side only)
      if (!EventSourceClass) {
        console.log(`[Coral Bridge] ❌ EventSource not available in server environment, skipping connection`)
        return false
      }
      
      // Build SSE endpoint URL
      const params = new URLSearchParams({
        waitForAgents: '2',
        agentId: this.bridgeAgentId,
        agentDescription: `Coral Studio bridge agent for user ${this.userId}, responsible for relaying messages between Coral Studio and other agents`
      })
      
      const sseUrl = `${this.baseUrl}/sse?${params.toString()}`
      console.log(`[Coral Bridge] 🌐 Full SSE URL: ${sseUrl}`)
      console.log(`[Coral Bridge] 🔧 Bridge Agent ID: ${this.bridgeAgentId}`)
      console.log(`[Coral Bridge] 📋 URL Parameters:`, Object.fromEntries(params))

      // Create EventSource connection
      console.log(`[Coral Bridge] 🔌 Creating EventSource connection...`)
      this.eventSource = new EventSourceClass(sseUrl)
      
      return new Promise((resolve, reject) => {
        if (!this.eventSource) {
          reject(new Error('Failed to create EventSource'))
          return
        }

        // Handle successful connection
        this.eventSource.onopen = (event) => {
          console.log(`[Coral Bridge] ✅ Successfully connected to Coral protocol for user ${this.userId}`)
          console.log(`[Coral Bridge] 🔗 Connection event:`, event)
          console.log(`[Coral Bridge] 📊 EventSource readyState:`, this.eventSource?.readyState)
          this.isConnected = true
          this.reconnectAttempts = 0
          resolve(true)
        }

        // Handle incoming messages
        this.eventSource.onmessage = (event) => {
          console.log(`[Coral Bridge] 📨 Received SSE message:`, {
            data: event.data,
            lastEventId: event.lastEventId,
            origin: event.origin,
            type: event.type
          })
          
          try {
            const data = JSON.parse(event.data)
            console.log(`[Coral Bridge] 📋 Parsed message data:`, data)
            this.handleCoralMessage(data)
          } catch (error) {
            console.error('[Coral Bridge] ❌ Error parsing message:', error)
            console.error('[Coral Bridge] 📄 Raw message data:', event.data)
          }
        }

        // Handle connection errors
        this.eventSource.onerror = (error) => {
          console.error('[Coral Bridge] ❌ SSE connection error:', error)
          console.error('[Coral Bridge] 📊 EventSource readyState:', this.eventSource?.readyState)
          console.error('[Coral Bridge] 🔗 EventSource URL:', this.eventSource?.url)
          
          // Log readyState meanings for debugging
          const readyStateMap = {
            0: 'CONNECTING',
            1: 'OPEN', 
            2: 'CLOSED'
          }
          console.error('[Coral Bridge] 📊 ReadyState meaning:', readyStateMap[this.eventSource?.readyState as keyof typeof readyStateMap] || 'UNKNOWN')
          
          this.isConnected = false
          
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            console.log(`[Coral Bridge] 🔄 Scheduling reconnection attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts}`)
            this.scheduleReconnect()
          } else {
            console.error('[Coral Bridge] ❌ Max reconnection attempts reached, giving up')
            reject(new Error('Max reconnection attempts reached'))
          }
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
   * Handle incoming messages from Coral protocol
   */
  private handleCoralMessage(data: any) {
    try {
      // Check if this is an endpoint URL message
      if (data.endpointUrl) {
        this.messageEndpoint = data.endpointUrl
        console.log(`[Coral Bridge] Received message endpoint: ${this.messageEndpoint}`)
        return
      }

      // Check if this is a resolved message
      if (data.type === 'ResolvedMessage' || data.id) {
        const message: CoralMessage = {
          id: data.id || `msg_${Date.now()}_${Math.random()}`,
          threadId: data.threadId || 'unknown',
          fromAgentId: data.senderId || data.fromAgentId || 'unknown',
          toAgentId: data.mentions?.[0] || this.bridgeAgentId,
          content: data.content || '',
          timestamp: data.timestamp ? new Date(parseInt(data.timestamp)).toISOString() : new Date().toISOString(),
          type: 'message',
          metadata: {
            isFromCoral: true,
            originalData: data
          }
        }

        console.log(`[Coral Bridge] Received message from ${message.fromAgentId}: ${message.content.substring(0, 100)}...`)
        
        // Notify message handlers
        this.messageHandlers.forEach(handler => {
          try {
            handler(message)
          } catch (error) {
            console.error('[Coral Bridge] Error in message handler:', error)
          }
        })
      }
    } catch (error) {
      console.error('[Coral Bridge] Error handling Coral message:', error)
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
   * Send a message through the Coral protocol
   */
  async sendMessage(content: string, targetAgents: string[] = [], threadId?: string): Promise<CoralMessage> {
    if (!this.isConnected || !this.messageEndpoint) {
      throw new Error('Not connected to Coral protocol')
    }

    try {
      // If no thread ID provided, create a new thread
      let actualThreadId = threadId
      if (!actualThreadId) {
        actualThreadId = await this.createThread('Coral Studio Conversation', targetAgents)
      }

      // Prepare message payload
      const messagePayload = {
        threadId: actualThreadId,
        content: content,
        mentions: targetAgents.length > 0 ? targetAgents : [`user_interface_agent_${this.userId}`]
      }

      console.log(`[Coral Bridge] Sending message to thread ${actualThreadId}:`, messagePayload)

      // Send message to Coral protocol
      const response = await fetch(this.messageEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': this.userId
        },
        body: JSON.stringify(messagePayload)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Create message object for return
      const message: CoralMessage = {
        id: `msg_${Date.now()}_${Math.random()}`,
        threadId: actualThreadId,
        fromAgentId: this.bridgeAgentId,
        toAgentId: targetAgents[0],
        content: content,
        timestamp: new Date().toISOString(),
        type: 'message',
        metadata: {
          sentToCoral: true,
          targetAgents: targetAgents
        }
      }

      console.log(`[Coral Bridge] Message sent successfully: ${message.id}`)
      return message

    } catch (error) {
      console.error('[Coral Bridge] Error sending message:', error)
      throw error
    }
  }

  /**
   * Create a new thread in Coral protocol
   */
  async createThread(threadName: string, participantIds: string[]): Promise<string> {
    if (!this.isConnected || !this.messageEndpoint) {
      throw new Error('Not connected to Coral protocol')
    }

    try {
      const threadPayload = {
        action: 'create_thread',
        threadName: threadName,
        participantIds: [...participantIds, this.bridgeAgentId]
      }

      console.log(`[Coral Bridge] Creating thread: ${threadName}`)

      const response = await fetch(this.messageEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': this.userId
        },
        body: JSON.stringify(threadPayload)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      const threadId = result.threadId || `thread_${Date.now()}_${Math.random()}`
      
      console.log(`[Coral Bridge] Thread created: ${threadId}`)
      return threadId

    } catch (error) {
      console.error('[Coral Bridge] Error creating thread:', error)
      throw error
    }
  }

  /**
   * List available agents from Coral protocol
   */
  async listAgents(): Promise<CoralAgentStatus[]> {
    if (!this.isConnected || !this.messageEndpoint) {
      throw new Error('Not connected to Coral protocol')
    }

    try {
      const listPayload = {
        action: 'list_agents',
        includeDetails: true
      }

      const response = await fetch(this.messageEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': this.userId
        },
        body: JSON.stringify(listPayload)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      const agents: CoralAgentStatus[] = []

      // Parse agent list from response
      if (result.agents && Array.isArray(result.agents)) {
        result.agents.forEach((agent: any) => {
          agents.push({
            agentId: agent.id || agent.agentId,
            status: agent.status === 'online' ? 'online' : 'offline',
            lastSeen: agent.lastSeen || new Date().toISOString(),
            responseTime: agent.responseTime || Math.floor(Math.random() * 300) + 100,
            messageCount: agent.messageCount || 0,
            coralConnected: true
          })
        })
      }

      console.log(`[Coral Bridge] Listed ${agents.length} agents`)
      return agents

    } catch (error) {
      console.error('[Coral Bridge] Error listing agents:', error)
      return []
    }
  }

  /**
   * Wait for mentions (responses) from other agents
   */
  async waitForMentions(timeoutMs: number = 30000): Promise<CoralMessage[]> {
    return new Promise((resolve, reject) => {
      const messages: CoralMessage[] = []
      const timeoutId = setTimeout(() => {
        this.messageHandlers.delete(handlerId)
        resolve(messages)
      }, timeoutMs)

      const handlerId = `wait_${Date.now()}_${Math.random()}`
      
      this.messageHandlers.set(handlerId, (message: CoralMessage) => {
        // Only collect messages that mention this bridge agent
        if (message.toAgentId === this.bridgeAgentId || 
            (message.metadata?.mentions && message.metadata.mentions.includes(this.bridgeAgentId))) {
          messages.push(message)
          
          // Clear timeout and handler after receiving first relevant message
          clearTimeout(timeoutId)
          this.messageHandlers.delete(handlerId)
          resolve(messages)
        }
      })
    })
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
   * Check if bridge is connected
   */
  isConnectedToCoral(): boolean {
    return this.isConnected
  }

  /**
   * Get bridge agent ID
   */
  getBridgeAgentId(): string {
    return this.bridgeAgentId
  }

  /**
   * Disconnect from Coral protocol
   */
  disconnect(): void {
    console.log(`[Coral Bridge] Disconnecting for user ${this.userId}`)
    
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    
    this.isConnected = false
    this.messageEndpoint = null
    this.messageHandlers.clear()
    this.statusHandlers.clear()
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
