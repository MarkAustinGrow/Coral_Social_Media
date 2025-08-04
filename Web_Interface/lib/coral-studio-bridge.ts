import { Server as SocketIOServer, Socket as SocketIOSocket } from 'socket.io';
import { NextApiRequest } from 'next';

export interface CoralStudioBridge {
  io: SocketIOServer;
  handleConnection: (socket: SocketIOSocket) => void;
}

interface CoralSession {
  sessionId: string;
  applicationId: string;
  privacyKey: string;
  agentId: string;
  userId: string;
  sseController?: AbortController;
  messageEndpoint?: string;
}

interface ActiveSession {
  [socketId: string]: CoralSession;
}

export class CoralProtocolBridge {
  private io: SocketIOServer;
  private activeSessions: ActiveSession = {};
  private coralServerUrl: string;
  private socketSecret: string;

  constructor(io: SocketIOServer, coralServerUrl: string = 'https://coral.8interns.com') {
    this.io = io;
    this.coralServerUrl = coralServerUrl;
    this.socketSecret = process.env.CORAL_SOCKET_SECRET || crypto.randomUUID();
    this.setupNamespaces();
  }

  private setupNamespaces() {
    // Create dynamic namespace handler (like original)
    const ns = this.io.of((name: string, auth: any, next: (err: Error | null, success: boolean) => void) => {
      next(null, true);
    });

    // Authentication middleware
    ns.use((socket: SocketIOSocket, next: (err?: Error) => void) => {
      const { tool, secret } = socket.handshake.auth;
      if (tool) {
        if (!secret) return next(new Error('no secret provided'));
        if (secret !== this.socketSecret) return next(new Error('invalid secret'));
        socket.data.tool = tool;
      }
      next();
    });

    // Handle connections
    ns.on('connection', (socket: SocketIOSocket) => {
      console.log('Coral Studio client connected:', socket.id);
      this.handleConnection(socket);
    });
  }

  private handleConnection(socket: SocketIOSocket) {
    // Handle coral session creation
    socket.on('create_session', async (data: any) => {
      try {
        await this.createCoralSession(socket, data);
      } catch (error) {
        console.error('Error creating Coral session:', error);
        socket.emit('error', { message: 'Failed to create session' });
      }
    });

    // Handle message sending
    socket.on('send_message', async (data: any) => {
      try {
        await this.sendMessage(socket, data);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle user input responses
    socket.on('user_response', (data: any) => {
      // Broadcast to all clients in the namespace
      socket.broadcast.emit('user_response', data);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      this.cleanupSession(socket.id);
    });

    // Broadcast all events to other clients (like original)
    socket.onAny((event: string, ...args: any[]) => {
      socket.broadcast.emit(event, ...args);
    });
  }

  private async createCoralSession(socket: SocketIOSocket, data: any) {
    const { applicationId = 'exampleApplication', privacyKey = 'privkey', agentId, userId } = data;
    
    if (!agentId || !userId) {
      throw new Error('agentId and userId are required');
    }

    const sessionId = `session_${crypto.randomUUID()}`;
    
    // Create SSE connection to Coral server
    const sseUrl = `${this.coralServerUrl}/devmode/${applicationId}/${privacyKey}/${sessionId}/sse?agentId=${agentId}`;
    
    console.log('Creating SSE connection to:', sseUrl);
    
    // Note: EventSource doesn't work in Node.js server-side, we need to use a different approach
    // We'll use fetch with streaming for SSE
    const session: CoralSession = {
      sessionId,
      applicationId,
      privacyKey,
      agentId,
      userId
    };

    this.activeSessions[socket.id] = session;

    // Start SSE connection
    await this.startSSEConnection(socket, session);

    socket.emit('session_created', {
      sessionId,
      applicationId,
      privacyKey,
      agentId,
      userId
    });
  }

  private async startSSEConnection(socket: SocketIOSocket, session: CoralSession) {
    const { applicationId, privacyKey, sessionId, agentId, userId } = session;
    const sseUrl = `${this.coralServerUrl}/devmode/${applicationId}/${privacyKey}/${sessionId}/sse?agentId=${agentId}`;

    try {
      // Use fetch with streaming for SSE connection
      const response = await fetch(sseUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'X-User-ID': userId
        }
      });

      if (!response.ok) {
        throw new Error(`SSE connection failed: ${response.status} ${response.statusText}`);
      }

      // Get the message endpoint from the SSE response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      // Read SSE stream
      this.readSSEStream(socket, session, reader);

    } catch (error) {
      console.error('Failed to start SSE connection:', error);
      socket.emit('error', { message: 'Failed to connect to Coral server' });
    }
  }

  private async readSSEStream(socket: SocketIOSocket, session: CoralSession, reader: ReadableStreamDefaultReader<Uint8Array>) {
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data.startsWith('/devmode/')) {
              // This is the message endpoint
              session.messageEndpoint = data;
              console.log('Got message endpoint:', data);
              socket.emit('endpoint_ready', { endpoint: data });
            } else {
              // This is a message from the Coral server
              try {
                const messageData = JSON.parse(data);
                socket.emit('coral_message', messageData);
              } catch (e) {
                // Not JSON, send as text
                socket.emit('coral_message', { type: 'text', content: data });
              }
            }
          } else if (line.startsWith('event: ')) {
            const eventType = line.slice(7);
            socket.emit('coral_event', { type: eventType });
          }
        }
      }
    } catch (error) {
      console.error('Error reading SSE stream:', error);
      socket.emit('error', { message: 'SSE connection lost' });
    } finally {
      reader.releaseLock();
    }
  }

  private async sendMessage(socket: SocketIOSocket, data: any) {
    const session = this.activeSessions[socket.id];
    if (!session || !session.messageEndpoint) {
      throw new Error('No active session or message endpoint');
    }

    const messageUrl = `${this.coralServerUrl}${session.messageEndpoint}`;
    
    try {
      const response = await fetch(messageUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': session.userId
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Message send failed: ${response.status} ${response.statusText}`);
      }

      socket.emit('message_sent', { success: true });
    } catch (error) {
      console.error('Failed to send message:', error);
      socket.emit('error', { message: 'Failed to send message to Coral server' });
    }
  }

  private cleanupSession(socketId: string) {
    const session = this.activeSessions[socketId];
    if (session) {
      console.log('Cleaning up session for socket:', socketId);
      // Abort SSE controller if it exists
      if (session.sseController) {
        session.sseController.abort();
      }
      delete this.activeSessions[socketId];
    }
  }

  public getSocketSecret(): string {
    return this.socketSecret;
  }
}
