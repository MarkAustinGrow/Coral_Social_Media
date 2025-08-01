# 🧪 Coral Studio Phase 3 Testing Checklist

## 📋 **Pre-Phase 4 Testing Guide**

Before proceeding to Phase 4 (Real Agent Integration), please complete this comprehensive testing checklist to ensure all Phase 3 functionality is working correctly.

## ✅ **Critical Tests to Perform**

### **1. Connection Status Test**
- [ ] **Navigate to** `/coral-studio`
- [ ] **Check Status Indicator** in header - should show "Connected" (green) not "Socket.IO error" (red)
- [ ] **Wait 30 seconds** for initial connection to establish
- [ ] **Refresh page** if status doesn't update

**Expected Result**: Green "Connected" status with "Mode: Coral"

### **2. Basic Messaging Test**
- [ ] **Type a test message** in the text area (e.g., "Hello, can you help me?")
- [ ] **Click any colored agent button** (e.g., Interface Agent - yellow)
- [ ] **Click "Send Message via Socket.IO"** button
- [ ] **Wait 1-3 seconds** for simulated response
- [ ] **Check Live Messages section** updates from "(0)" to "(1)" or "(2)"

**Expected Result**: Message sent successfully, simulated response received

### **3. Agent Status Monitoring Test**
- [ ] **Click "Agents" tab** at the top
- [ ] **Verify agent statuses** are displayed with colors:
  - Interface Agent: Online (green)
  - Tweet Scraping Agent: Offline (gray)
  - Tweet Research Agent: Online (green)
  - Hot Topic Agent: Online (green)
  - Blog Writing Agent: Offline (gray)
  - Blog Critique Agent: Online (green)
  - Blog to Tweet Agent: Offline (gray)
  - Twitter Posting Agent: Online (green)
  - X Reply Agent: Error (red)
- [ ] **Check response times** are shown for online agents (e.g., "150ms")
- [ ] **Check message counts** are displayed

**Expected Result**: 9 agents with realistic status indicators and metrics

### **4. Session Management Test**
- [ ] **Click "Manage Sessions"** button
- [ ] **Create new session** with a custom name
- [ ] **Switch between sessions** and verify message history is preserved
- [ ] **Send messages in different sessions** to test isolation
- [ ] **Archive a session** and verify it's marked as archived

**Expected Result**: Multiple sessions work independently with persistent history

### **5. Real-Time Updates Test**
- [ ] **Send a message** and note the message count
- [ ] **Wait 5 seconds** and check if message count updates
- [ ] **Wait 30 seconds** and check if agent statuses refresh
- [ ] **Leave page open for 2 minutes** to test continuous polling

**Expected Result**: Automatic updates without manual refresh

### **6. Multi-Agent Targeting Test**
- [ ] **Select different agent buttons** (different colors)
- [ ] **Send messages to each agent type**:
  - Interface Agent (yellow)
  - Tweet Research Agent (purple)  
  - Hot Topic Agent (orange)
  - Blog Writing Agent (indigo)
  - Twitter Posting Agent (cyan)
- [ ] **Verify responses** mention the correct agent name

**Expected Result**: Each agent responds with its own identity

### **7. Messages Tab Test**
- [ ] **Click "Messages" tab**
- [ ] **Verify message history** is displayed chronologically
- [ ] **Check message formatting** shows sender and timestamp
- [ ] **Test message filtering** if available

**Expected Result**: Complete message history with proper formatting

### **8. Analytics Tab Test**
- [ ] **Click "Analytics" tab**
- [ ] **Check for metrics display** (may show placeholder data)
- [ ] **Verify tab loads without errors**

**Expected Result**: Analytics tab loads successfully

## 🚨 **Troubleshooting Common Issues**

### **Issue: Status Shows "Socket.IO error"**
**Solutions**:
1. **Refresh the page** and wait 30 seconds
2. **Check browser console** for JavaScript errors (F12 → Console)
3. **Verify server is running** and accessible
4. **Check network connectivity** to the server

### **Issue: Messages Not Sending**
**Solutions**:
1. **Check connection status** is "Connected"
2. **Verify text is entered** in the message field
3. **Ensure an agent is selected** (colored button clicked)
4. **Check browser console** for API errors

### **Issue: No Agent Statuses**
**Solutions**:
1. **Wait 30 seconds** for initial load
2. **Click "Agents" tab** to refresh
3. **Check browser network tab** for API calls
4. **Verify user authentication** is working

### **Issue: Sessions Not Working**
**Solutions**:
1. **Try creating a new session** with a different name
2. **Refresh page** and try again
3. **Check if default session exists**
4. **Verify user ID** is properly set

## 🔧 **Server-Side Verification**

If you have server access, also check:

### **API Endpoint Tests**
```bash
# Test agent statuses endpoint
curl "https://8interns.com/api/socket.io?action=get-agent-statuses&userId=YOUR_USER_ID"

# Test sessions endpoint  
curl "https://8interns.com/api/socket.io?action=get-sessions&userId=YOUR_USER_ID"
```

### **Server Logs**
- Check for any errors in server logs
- Verify API endpoints are responding
- Monitor response times

## 📊 **Success Criteria**

Phase 3 is ready for Phase 4 when:

- ✅ **Connection Status**: Shows "Connected" consistently
- ✅ **Messaging**: Messages send and receive simulated responses
- ✅ **Agent Status**: All 9 agents show correct status indicators
- ✅ **Sessions**: Can create, switch, and manage multiple sessions
- ✅ **Real-time**: Automatic updates work without manual refresh
- ✅ **Multi-Agent**: Different agents respond with their identities
- ✅ **UI Tabs**: All four tabs (Studio, Agents, Messages, Analytics) load properly
- ✅ **No Errors**: Browser console shows no critical JavaScript errors

## 🚀 **Ready for Phase 4?**

Once all tests pass, we can proceed to **Phase 4: Real Agent Integration**, which will:

1. **Replace simulated responses** with real Python agent communication
2. **Integrate with existing Coral protocol** for authentic multi-agent conversations
3. **Add database persistence** for permanent message storage
4. **Enable advanced features** like tool calls and file uploads

## 📝 **Test Results**

Please test each item and report any issues you encounter. This will help ensure a smooth transition to Phase 4 with real agent integration.

**Testing Status**: ⏳ Pending
**Issues Found**: _List any problems here_
**Ready for Phase 4**: ⏳ Pending successful testing
