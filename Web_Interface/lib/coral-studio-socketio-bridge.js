// Global socket secret (like official Coral Studio)
let socketSecret;

// MCP connection management
const activeMCPSessions = new Map();

export default function injectSocketIO(io) {
  // Generate socket secret (like official)
  socketSecret = crypto.randomUUID();
  console.log('Coral Studio Socket.IO bridge initialized with secret:', socketSecret);

  // Create dynamic namespace handler (exactly like official)
  const ns = io.of((name, auth, next) => {
    next(null, true);
  });

  // Authentication middleware (exactly like official)
  ns.use((socket, next) => {
    const { tool, secret } = socket.handshake.auth;
    if (tool) {
      if (!secret) return next(new Error('no secret provided'));
      if (secret !== socketSecret) return next(new Error('invalid secret'));
      socket.data.tool = tool;
    }
    next();
  });

  // Handle connections
  ns.on('connection', (socket) => {
    console.log('Coral Studio client connected:', socket.id);

    // Official broadcast pattern - forward all events to all clients
    socket.onAny((event, ...args) => {
      console.log('Broadcasting event:', event, args);
      ns.emit(event, ...args);
    });

    // Our MCP integration (NEW - what official doesn't have)
    handleMCPIntegration(socket, ns);

    socket.on('disconnect', () => {
      console.log('Coral Studio client disconnected:', socket.id);
      cleanupMCPSession(socket.id);
    });
  });

  return socketSecret;
}

function handleMCPIntegration(socket, ns) {
  // Handle session creation with MCP connection
  socket.on('create_session', async (data) => {
    try {
      console.log('Creating Coral session with MCP integration:', data);
      
      const { 
        applicationId = 'exampleApplication', 
        privacyKey = 'privkey', 
        agentId, 
        userId,
        sessionName 
      } = data;
      
      if (!agentId || !userId) {
        socket.emit('error', { message: 'agentId and userId are required' });
        return;
      }

      const sessionId = sessionName || `session_${crypto.randomUUID()}`;
      
      // Create MCP session using our proven working pattern
      const mcpSession = {
        sessionId,
        applicationId,
        privacyKey,
        agentId,
        userId
      };

      // Try to create MCP connection (will be implemented when langchain_mcp_adapters is available)
      try {
        await createMCPConnection(mcpSession);
        activeMCPSessions.set(socket.id, mcpSession);
        
        // Emit session created event (official pattern)
        socket.emit('session_created', {
          sessionId,
          applicationId,
          privacyKey,
          agentId,
          userId,
          success: true
        });

        console.log('MCP session created successfully:', sessionId);
      } catch (mcpError) {
        console.error('Failed to create MCP connection:', mcpError);
        socket.emit('error', { 
          message: 'Failed to connect to Coral server',
          details: mcpError instanceof Error ? mcpError.message : 'Unknown error'
        });
      }
    } catch (error) {
      console.error('Error creating session:', error);
      socket.emit('error', { 
        message: 'Failed to create session',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Handle message sending through MCP
  socket.on('send_message', async (data) => {
    try {
      const session = activeMCPSessions.get(socket.id);
      if (!session) {
        socket.emit('error', { message: 'No active session' });
        return;
      }

      console.log('Sending message through MCP:', data);
      
      // Send message through MCP client
      if (session.mcpClient) {
        await sendMCPMessage(session, data);
        socket.emit('message_sent', { success: true });
      } else {
        socket.emit('error', { message: 'MCP client not available' });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { 
        message: 'Failed to send message',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Handle agent listing
  socket.on('list_agents', async () => {
    try {
      const session = activeMCPSessions.get(socket.id);
      if (!session) {
        socket.emit('error', { message: 'No active session' });
        return;
      }

      console.log('Listing agents through MCP');
      
      // List agents through MCP
      const agents = await listMCPAgents(session);
      socket.emit('agents_list', agents);
    } catch (error) {
      console.error('Error listing agents:', error);
      socket.emit('error', { 
        message: 'Failed to list agents',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

async function createMCPConnection(session) {
  // This will use our proven working MCP pattern
  const baseUrl = "https://coral.8interns.com/devmode";
  const sseUrl = `${baseUrl}/${session.applicationId}/${session.privacyKey}/${session.sessionId}/sse`;
  
  console.log('Creating MCP connection to:', sseUrl);
  
  try {
    // For now, we'll simulate the connection until langchain_mcp_adapters is installed
    // TODO: Replace with actual MCP client when dependency is available
    
    // Simulated MCP connection (will be replaced)
    const params = new URLSearchParams({
      waitForAgents: '2',
      agentId: session.agentId,
      agentDescription: `Coral Studio agent for user ${session.userId}`
    });
    
    const fullUrl = `${sseUrl}?${params}`;
    console.log('MCP connection URL:', fullUrl);
    
    // For now, just mark as connected
    session.mcpClient = { connected: true, url: fullUrl };
    
    console.log('MCP connection established (simulated)');
  } catch (error) {
    console.error('MCP connection failed:', error);
    throw error;
  }
}

async function sendMCPMessage(session, data) {
  // TODO: Implement actual MCP message sending
  console.log('Sending MCP message (simulated):', data);
  
  // For now, simulate message sending
  // This will be replaced with actual MCP client calls
}

async function listMCPAgents(session) {
  // TODO: Implement actual MCP agent listing
  console.log('Listing MCP agents (simulated)');
  
  // For now, return simulated agent list
  return [
    {
      id: 'tweet_scraping_agent',
      name: 'Tweet Scraping Agent',
      description: 'Scrapes and analyzes tweets',
      state: 'connected'
    },
    {
      id: 'blog_writing_agent',
      name: 'Blog Writing Agent', 
      description: 'Writes blog posts based on research',
      state: 'connected'
    }
  ];
}

function cleanupMCPSession(socketId) {
  const session = activeMCPSessions.get(socketId);
  if (session) {
    console.log('Cleaning up MCP session:', session.sessionId);
    
    // TODO: Cleanup MCP client connection
    if (session.mcpClient) {
      // session.mcpClient.disconnect();
    }
    
    activeMCPSessions.delete(socketId);
  }
}

export function getSocketSecret() {
  return socketSecret;
}
