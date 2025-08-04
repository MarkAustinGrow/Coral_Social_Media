import { NextRequest, NextResponse } from 'next/server';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { CoralProtocolBridge } from '../../../lib/coral-studio-bridge';

// Global variables to store server instances
let io: SocketIOServer | null = null;
let bridge: CoralProtocolBridge | null = null;

export async function GET(req: NextRequest) {
  // This endpoint provides information about the Socket.IO server status
  return NextResponse.json({ 
    message: 'Coral Studio Socket.IO bridge is ready',
    socketPath: '/socket.io',
    status: io ? 'running' : 'not initialized',
    bridgeActive: bridge ? true : false
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, coralServerUrl } = body;

    if (action === 'initialize') {
      // Initialize Socket.IO server if not already done
      if (!io) {
        // In Next.js, we need to attach Socket.IO to the existing server
        // This is a simplified approach - in production, you'd want a custom server
        const httpServer = new HTTPServer();
        
        io = new SocketIOServer(httpServer, {
          path: '/socket.io',
          cors: {
            origin: "*",
            methods: ["GET", "POST"]
          }
        });

        // Initialize the bridge
        bridge = new CoralProtocolBridge(io, coralServerUrl || 'https://coral.8interns.com');

        // Start the HTTP server on a different port for Socket.IO
        const port = process.env.SOCKET_IO_PORT || 3001;
        httpServer.listen(port, () => {
          console.log(`Socket.IO server running on port ${port}`);
        });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Socket.IO server initialized',
        socketSecret: bridge?.getSocketSecret(),
        port: process.env.SOCKET_IO_PORT || 3001
      });
    }

    if (action === 'status') {
      return NextResponse.json({
        initialized: io ? true : false,
        bridgeActive: bridge ? true : false,
        socketSecret: bridge?.getSocketSecret()
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Socket.IO API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
