#!/usr/bin/env node
import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import injectSocketIO from './Web_Interface/lib/coral-studio-socketio-bridge.js';

const app = express();
const server = http.createServer(app);

// Generate global socket secret (like official Coral Studio)
globalThis.socketSecret = crypto.randomUUID();

const io = new Server(server, { 
  path: '/socket.io',
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Inject our Socket.IO bridge with MCP integration
const socketSecret = injectSocketIO(io);

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Coral Studio Socket.IO Bridge',
    socketSecret: socketSecret
  });
});

// Serve socket secret for client authentication
app.get('/socket-secret', (req, res) => {
  res.json({ socketSecret });
});

const port = process.env.CORAL_STUDIO_PORT || '3001';
const host = process.env.HOST || '0.0.0.0';

server.listen(port, host, () => {
  console.log(`\x1b[36mCoral Studio Socket.IO Bridge running on http://${host}:${port}\x1b[0m`);
  console.log(`Socket Secret: ${socketSecret}`);
  console.log('Ready to accept Coral Studio connections');
});
