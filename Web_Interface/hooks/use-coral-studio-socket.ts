'use client';

import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface CoralSession {
  sessionId: string;
  applicationId: string;
  privacyKey: string;
  agentId: string;
  userId: string;
}

interface CoralMessage {
  type: string;
  content: any;
  timestamp?: string;
}

interface UserInputRequest {
  id: string;
  sessionId: string;
  agentId: string;
  agentRequest: string;
  userQuestion?: string;
  agentAnswer?: string;
}

export function useCoralStudioSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [session, setSession] = useState<CoralSession | null>(null);
  const [messages, setMessages] = useState<CoralMessage[]>([]);
  const [userInputRequests, setUserInputRequests] = useState<{ [id: string]: UserInputRequest }>({});
  const [error, setError] = useState<string | null>(null);

  // Initialize Socket.IO connection
  const connect = useCallback(async (socketSecret?: string) => {
    try {
      // First, initialize the server-side Socket.IO if needed
      const initResponse = await fetch('/api/coral-studio-socket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initialize' })
      });

      if (!initResponse.ok) {
        throw new Error('Failed to initialize Socket.IO server');
      }

      const initData = await initResponse.json();
      const serverSocketSecret = socketSecret || initData.socketSecret;
      const port = initData.port || 3001;

      // Connect to Socket.IO server
      const socketUrl = `${window.location.protocol}//${window.location.hostname}:${port}`;
      
      const newSocket = io(socketUrl, {
        path: '/socket.io',
        auth: {
          secret: serverSocketSecret
        }
      });

      // Set up event listeners
      newSocket.on('connect', () => {
        console.log('Connected to Coral Studio Socket.IO server');
        setConnected(true);
        setError(null);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from Coral Studio Socket.IO server');
        setConnected(false);
      });

      newSocket.on('error', (errorData: any) => {
        console.error('Socket.IO error:', errorData);
        setError(errorData.message || 'Socket connection error');
      });

      // Coral protocol events
      newSocket.on('session_created', (sessionData: CoralSession) => {
        console.log('Coral session created:', sessionData);
        setSession(sessionData);
      });

      newSocket.on('endpoint_ready', (data: { endpoint: string }) => {
        console.log('Coral endpoint ready:', data.endpoint);
      });

      newSocket.on('coral_message', (message: CoralMessage) => {
        console.log('Coral message received:', message);
        setMessages(prev => [...prev, {
          ...message,
          timestamp: new Date().toISOString()
        }]);
      });

      newSocket.on('coral_event', (event: { type: string }) => {
        console.log('Coral event:', event);
      });

      newSocket.on('message_sent', (data: { success: boolean }) => {
        console.log('Message sent:', data);
      });

      // User input tool events
      newSocket.on('agent_request', (req: UserInputRequest) => {
        console.log('Agent user input request:', req);
        setUserInputRequests(prev => ({
          ...prev,
          [req.id]: req
        }));
      });

      newSocket.on('agent_answer', (req: { id: string; answer: string }) => {
        console.log('Agent answer:', req);
        setUserInputRequests(prev => ({
          ...prev,
          [req.id]: {
            ...prev[req.id],
            agentAnswer: req.answer
          }
        }));
      });

      setSocket(newSocket);

    } catch (error) {
      console.error('Failed to connect to Socket.IO:', error);
      setError(error instanceof Error ? error.message : 'Connection failed');
    }
  }, []);

  // Create a new Coral session
  const createSession = useCallback(async (agentId: string, userId: string, applicationId = 'exampleApplication', privacyKey = 'privkey') => {
    if (!socket) {
      throw new Error('Socket not connected');
    }

    socket.emit('create_session', {
      agentId,
      userId,
      applicationId,
      privacyKey
    });
  }, [socket]);

  // Send a message to the Coral server
  const sendMessage = useCallback((message: any) => {
    if (!socket) {
      throw new Error('Socket not connected');
    }

    socket.emit('send_message', message);
  }, [socket]);

  // Respond to user input request
  const respondToUserInput = useCallback((requestId: string, response: string) => {
    if (!socket) {
      throw new Error('Socket not connected');
    }

    setUserInputRequests(prev => ({
      ...prev,
      [requestId]: {
        ...prev[requestId],
        userQuestion: response
      }
    }));

    socket.emit('user_response', {
      id: requestId,
      value: response
    });
  }, [socket]);

  // Disconnect from Socket.IO
  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setConnected(false);
      setSession(null);
      setMessages([]);
      setUserInputRequests({});
      setError(null);
    }
  }, [socket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    // Connection state
    connected,
    error,
    
    // Session state
    session,
    messages,
    userInputRequests,
    
    // Actions
    connect,
    disconnect,
    createSession,
    sendMessage,
    respondToUserInput,
    
    // Raw socket for advanced usage
    socket
  };
}
