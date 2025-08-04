'use client';

import { useEffect, useState, useCallback } from 'react';

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

export function useCoralStudioSSE() {
  const [connected, setConnected] = useState(false);
  const [session, setSession] = useState<CoralSession | null>(null);
  const [messages, setMessages] = useState<CoralMessage[]>([]);
  const [userInputRequests, setUserInputRequests] = useState<{ [id: string]: UserInputRequest }>({});
  const [error, setError] = useState<string | null>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [messageEndpoint, setMessageEndpoint] = useState<string | null>(null);

  // Create a new Coral session with SSE
  const createSession = useCallback(async (agentId: string, userId: string, applicationId = 'exampleApplication', privacyKey = 'privkey') => {
    try {
      const sessionId = `session_${crypto.randomUUID()}`;
      
      // Create SSE connection to Coral server
      const coralServerUrl = 'https://coral.8interns.com';
      const sseUrl = `${coralServerUrl}/devmode/${applicationId}/${privacyKey}/${sessionId}/sse?agentId=${agentId}`;
      
      console.log('[Coral Studio SSE] Creating SSE connection to:', sseUrl);
      
      const newEventSource = new EventSource(sseUrl);
      
      newEventSource.onopen = () => {
        console.log('[Coral Studio SSE] ✅ Connected to Coral server');
        setConnected(true);
        setError(null);
      };

      newEventSource.onmessage = (event) => {
        console.log('[Coral Studio SSE] 📨 Message received:', event.data);
        
        try {
          // Check if this is the message endpoint
          if (event.data.startsWith('/devmode/')) {
            setMessageEndpoint(event.data);
            console.log('[Coral Studio SSE] 🔗 Message endpoint ready:', event.data);
            return;
          }

          // Try to parse as JSON
          let messageData;
          try {
            messageData = JSON.parse(event.data);
          } catch (e) {
            // Not JSON, treat as text
            messageData = { type: 'text', content: event.data };
          }

          // Add to messages
          setMessages(prev => [...prev, {
            ...messageData,
            timestamp: new Date().toISOString()
          }]);

          // Check if this is a user input request
          if (messageData.type === 'user_input_request') {
            setUserInputRequests(prev => ({
              ...prev,
              [messageData.id]: messageData
            }));
          }

        } catch (error) {
          console.error('[Coral Studio SSE] ❌ Error processing message:', error);
        }
      };

      newEventSource.onerror = (error) => {
        console.error('[Coral Studio SSE] ❌ Connection error:', error);
        setError('SSE connection error');
        setConnected(false);
      };

      setEventSource(newEventSource);
      setSession({
        sessionId,
        applicationId,
        privacyKey,
        agentId,
        userId
      });

    } catch (error) {
      console.error('[Coral Studio SSE] ❌ Failed to create session:', error);
      setError(error instanceof Error ? error.message : 'Failed to create session');
    }
  }, []);

  // Send a message to the Coral server
  const sendMessage = useCallback(async (message: any) => {
    if (!messageEndpoint || !session) {
      throw new Error('No active session or message endpoint');
    }

    const coralServerUrl = 'https://coral.8interns.com';
    const messageUrl = `${coralServerUrl}${messageEndpoint}`;
    
    try {
      console.log('[Coral Studio SSE] 📤 Sending message to:', messageUrl);
      
      const response = await fetch(messageUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': session.userId
        },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        throw new Error(`Message send failed: ${response.status} ${response.statusText}`);
      }

      console.log('[Coral Studio SSE] ✅ Message sent successfully');
    } catch (error) {
      console.error('[Coral Studio SSE] ❌ Failed to send message:', error);
      setError('Failed to send message to Coral server');
      throw error;
    }
  }, [messageEndpoint, session]);

  // Respond to user input request
  const respondToUserInput = useCallback(async (requestId: string, response: string) => {
    setUserInputRequests(prev => ({
      ...prev,
      [requestId]: {
        ...prev[requestId],
        userQuestion: response
      }
    }));

    // Send the response as a message
    await sendMessage({
      type: 'user_input_response',
      id: requestId,
      value: response
    });
  }, [sendMessage]);

  // Disconnect from SSE
  const disconnect = useCallback(() => {
    if (eventSource) {
      console.log('[Coral Studio SSE] 🔌 Disconnecting from Coral server');
      eventSource.close();
      setEventSource(null);
    }
    setConnected(false);
    setSession(null);
    setMessages([]);
    setUserInputRequests({});
    setMessageEndpoint(null);
    setError(null);
  }, [eventSource]);

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
    messageEndpoint,
    
    // Actions
    createSession,
    sendMessage,
    respondToUserInput,
    disconnect
  };
}
