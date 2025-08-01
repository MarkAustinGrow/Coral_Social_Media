#!/usr/bin/env node

/**
 * EventSource Connection Diagnostic Tool
 * Tests the exact same connection that Coral Studio uses
 */

const { EventSource } = require('eventsource');

// Test configuration - matches Coral Studio exactly
const testConfig = {
  baseUrl: 'http://coral.8interns.com/devmode/exampleApplication/privkey/session1',
  userId: 'test_user_diagnostic',
  agentId: 'coral_studio_bridge_test_diagnostic',
  agentDescription: 'Diagnostic test agent for EventSource debugging'
};

console.log('🧪 EventSource Connection Diagnostic Tool');
console.log('==========================================');
console.log(`📅 Test started at: ${new Date().toISOString()}`);
console.log(`🔗 Base URL: ${testConfig.baseUrl}`);
console.log(`👤 User ID: ${testConfig.userId}`);
console.log(`🤖 Agent ID: ${testConfig.agentId}`);
console.log('');

// Build the exact URL that Coral Studio uses
const params = new URLSearchParams({
  waitForAgents: '2',
  agentId: testConfig.agentId,
  agentDescription: testConfig.agentDescription
});

const sseUrl = `${testConfig.baseUrl}/sse?${params.toString()}`;

console.log('🌐 Full SSE URL:');
console.log(sseUrl);
console.log('');

console.log('📋 URL Parameters:');
console.log(Object.fromEntries(params));
console.log('');

// Test 1: Basic EventSource connection
console.log('🔌 Test 1: Basic EventSource Connection');
console.log('---------------------------------------');

let connectionStartTime = Date.now();
let eventSource = null;
let connectionTimeout = null;
let hasReceivedData = false;
let connectionEstablished = false;

try {
  console.log('Creating EventSource instance...');
  eventSource = new EventSource(sseUrl);
  
  // Set a timeout for the connection test
  connectionTimeout = setTimeout(() => {
    console.log('⏰ Connection timeout reached (30 seconds)');
    if (eventSource) {
      eventSource.close();
    }
    process.exit(1);
  }, 30000);

  // Handle successful connection
  eventSource.onopen = (event) => {
    const connectionTime = Date.now() - connectionStartTime;
    console.log(`✅ Connection opened successfully in ${connectionTime}ms`);
    console.log('📊 Connection event details:', {
      type: event.type,
      readyState: eventSource.readyState,
      url: eventSource.url
    });
    connectionEstablished = true;
  };

  // Handle incoming messages
  eventSource.onmessage = (event) => {
    hasReceivedData = true;
    console.log('📨 Received SSE message:');
    console.log('  Data:', event.data);
    console.log('  Last Event ID:', event.lastEventId);
    console.log('  Origin:', event.origin);
    console.log('  Type:', event.type);
    
    try {
      const parsedData = JSON.parse(event.data);
      console.log('  Parsed JSON:', parsedData);
    } catch (error) {
      console.log('  (Not JSON data)');
    }
    console.log('');
  };

  // Handle errors
  eventSource.onerror = (error) => {
    const connectionTime = Date.now() - connectionStartTime;
    console.log(`❌ SSE connection error after ${connectionTime}ms:`);
    console.log('  Error object:', error);
    console.log('  Error type:', error.type);
    console.log('  Error message:', error.message);
    console.log('  EventSource readyState:', eventSource.readyState);
    console.log('  EventSource URL:', eventSource.url);
    
    // Log readyState meanings
    const readyStateMap = {
      0: 'CONNECTING',
      1: 'OPEN',
      2: 'CLOSED'
    };
    console.log('  ReadyState meaning:', readyStateMap[eventSource.readyState] || 'UNKNOWN');
    
    // Close and exit
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
    }
    eventSource.close();
    
    console.log('');
    console.log('🔍 Diagnostic Summary:');
    console.log(`  Connection established: ${connectionEstablished}`);
    console.log(`  Data received: ${hasReceivedData}`);
    console.log(`  Connection duration: ${connectionTime}ms`);
    console.log('');
    
    process.exit(1);
  };

  // Keep the process alive to receive events
  console.log('⏳ Waiting for events... (will timeout in 30 seconds)');
  
  // If we get here and receive data, consider it a success
  setTimeout(() => {
    if (connectionEstablished && hasReceivedData) {
      console.log('🎉 SUCCESS: EventSource connection working properly!');
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
      eventSource.close();
      process.exit(0);
    } else if (connectionEstablished && !hasReceivedData) {
      console.log('⚠️  PARTIAL SUCCESS: Connection established but no data received yet');
      console.log('   This might be normal - the server may not send immediate data');
    }
  }, 10000); // Check after 10 seconds

} catch (error) {
  console.log('💥 Failed to create EventSource:');
  console.log('  Error:', error.message);
  console.log('  Stack:', error.stack);
  
  if (connectionTimeout) {
    clearTimeout(connectionTimeout);
  }
  
  process.exit(1);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  if (eventSource) {
    eventSource.close();
  }
  if (connectionTimeout) {
    clearTimeout(connectionTimeout);
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test terminated');
  if (eventSource) {
    eventSource.close();
  }
  if (connectionTimeout) {
    clearTimeout(connectionTimeout);
  }
  process.exit(0);
});
