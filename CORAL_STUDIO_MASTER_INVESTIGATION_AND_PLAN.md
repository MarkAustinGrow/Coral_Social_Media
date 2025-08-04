# Coral Studio Master Investigation and Plan

## 🎯 Executive Summary

**Mission**: Fix the Coral Studio connection to enable real agent communication instead of simulated responses.

**Current Status**: 
- ✅ **HTTPS Fix Applied**: Agents now connect successfully to `https://coral.8interns.com`
- ✅ **React Interface Working**: Beautiful Coral Studio UI is functional
- 🚨 **Connection Issue**: CORS/404 errors when trying to connect to Coral server
- 🚨 **API Mismatch**: Coral Studio expects different endpoints than what Coral server provides

---

## 📊 Investigation Findings

### Phase 1: Historical Context Analysis

#### What We've Learned Previously:
1. **Original Plan**: Replace Coral Inspector with Coral Studio (from `CORAL_STUDIO_PROTOCOL_BRIDGE_FIX_PLAN.md`)
2. **Architecture Understanding**: Coral Studio is a SvelteKit app, we built React equivalent (from `CORAL_STUDIO_ANALYSIS.md`)
3. **HTTPS Success**: Fixed HTTP→HTTPS redirect issue (from `CORAL_HTTPS_URL_FIX_COMPLETE.md`)
4. **Working Agents**: Our agents successfully connect using MCP client pattern

### Phase 2: Current Implementation Gap Analysis

#### ✅ What's Working (Agents):
```python
# Working Agent Connection Pattern
base_url = "https://coral.8interns.com/devmode/exampleApplication/privkey/session1/sse"
params = {
    "waitForAgents": 2,
    "agentId": f"tweet_scraping_agent_{user_id}",
    "agentDescription": f"You are tweet_scraping_agent for user {user_id}..."
}
MCP_SERVER_URL = f"{base_url}?{query_string}"

# Uses MultiServerMCPClient with SSE transport
async with MultiServerMCPClient(
    connections={
        "coral": {
            "transport": "sse",
            "url": MCP_SERVER_URL,
            "headers": {"X-User-ID": user_id},
            "timeout": 300,
            "sse_read_timeout": 300,
        }
    }
) as client:
```

#### ❌ What's Broken (Coral Studio):
```typescript
// Current Coral Studio Attempts
const agentsResponse = await fetch(`https://${host}/api/v1/registry`)
const sessionsResponse = await fetch(`https://${host}/api/v1/sessions`)

// Results in:
// - CORS error: No 'Access-Control-Allow-Origin' header
// - 404 error: /api/v1/registry not found
```

### Phase 3: Root Cause Analysis

#### **Primary Issue: API Endpoint Mismatch**

**Coral Studio Expects** (Standard Coral Server API):
- `GET /api/v1/registry` - Get available agents
- `GET /api/v1/sessions` - Get available sessions  
- `POST /api/v1/sessions` - Create new session
- WebSocket/EventSource connections for real-time communication

**Coral Server Actually Provides** (MCP-based):
- `GET /devmode/exampleApplication/privkey/session1/sse` - SSE endpoint for agent communication
- No REST API endpoints like `/api/v1/registry`
- No session management API
- Direct MCP protocol communication only

#### **Secondary Issue: CORS Configuration**
- Coral server at `coral.8interns.com` doesn't allow requests from `https://8interns.com`
- Missing `Access-Control-Allow-Origin` headers

#### **Architecture Mismatch**
- **Coral Studio Design**: Expects full Coral Server with REST API + WebSocket
- **Our Coral Server**: Minimal MCP-based server for agent-to-agent communication
- **Our Agents**: Use MCP client directly, bypass any REST API layer

---

## 🏗️ Technical Architecture Map

### Current Working System:
```
[Agent] → [MCP Client] → [SSE] → [coral.8interns.com/devmode/.../sse] → [Other Agents]
```

### What Coral Studio Tries To Do:
```
[Coral Studio] → [REST API] → [coral.8interns.com/api/v1/*] → [❌ 404 Not Found]
```

### What We Need To Build:
```
[Coral Studio] → [Protocol Bridge] → [MCP Client] → [coral.8interns.com/devmode/.../sse] → [Agents]
```

---

## 🎯 Solution Strategy

### **Option A: Minimal Fix (Recommended)**
**Approach**: Make Coral Studio use the same MCP connection pattern as working agents
**Effort**: Low (1-2 days)
**Benefits**: 
- Leverages existing working connection
- No server-side changes needed
- Quick implementation

**Implementation**:
1. Replace REST API calls with MCP client connection
2. Use same SSE endpoint as agents: `https://coral.8interns.com/devmode/exampleApplication/privkey/session1/sse`
3. Implement agent discovery through MCP protocol
4. Handle session management client-side

### **Option B: Full Coral Server Implementation**
**Approach**: Build complete Coral Server with REST API
**Effort**: High (2-3 weeks)
**Benefits**: 
- Full Coral Studio compatibility
- Professional API layer
- Scalable architecture

**Drawbacks**:
- Requires significant server-side development
- May break existing agent connections
- Complex deployment

### **Option C: Hybrid Approach**
**Approach**: Create API proxy layer that translates REST calls to MCP
**Effort**: Medium (1 week)
**Benefits**: 
- Maintains Coral Studio interface expectations
- Doesn't require server changes
- Gradual migration path

---

## 📋 Recommended Implementation Plan

### **Phase 1: Quick Fix (Option A)**

#### Step 1: Update Coral Studio Connection Logic
Replace the current REST API approach with MCP client connection:

```typescript
// Replace this (broken):
const agentsResponse = await fetch(`https://${host}/api/v1/registry`)

// With this (working pattern):
import { MultiServerMCPClient } from 'langchain_mcp_adapters/client'

const connectToCoralServer = async (host: string, userId: string) => {
  const baseUrl = `https://${host}/devmode/exampleApplication/privkey/session1/sse`
  const params = {
    waitForAgents: 2,
    agentId: `coral_studio_${userId}`,
    agentDescription: `Coral Studio interface for user ${userId}`
  }
  const url = `${baseUrl}?${new URLSearchParams(params)}`
  
  const client = new MultiServerMCPClient({
    connections: {
      coral: {
        transport: "sse",
        url: url,
        headers: { "X-User-ID": userId },
        timeout: 300,
        sse_read_timeout: 300,
      }
    }
  })
  
  return client
}
```

#### Step 2: Implement Agent Discovery
Use MCP protocol to discover available agents:

```typescript
const discoverAgents = async (client: MultiServerMCPClient) => {
  // Use MCP tools to get agent registry
  const tools = client.get_tools()
  // Parse available agents from MCP connection
  return agents
}
```

#### Step 3: Handle Session Management
Implement client-side session management:

```typescript
const createSession = (sessionName: string) => {
  // Create session locally, use MCP connection for communication
  // No server-side session API needed
}
```

### **Phase 2: Enhanced Integration**

#### Step 1: Real-time Communication
Implement proper message streaming using the MCP connection

#### Step 2: Agent Interaction
Enable sending messages to agents through MCP protocol

#### Step 3: User Interface Polish
Improve UI to show real agent status and communication

---

## 🔧 Key Files to Modify

### **1. Coral Studio Page**
**File**: `Web_Interface/app/coral-studio/page.tsx`
**Changes**: Replace REST API calls with MCP client connection

### **2. Create MCP Hook**
**File**: `Web_Interface/hooks/use-coral-mcp.ts` (new)
**Purpose**: React hook for MCP client management

### **3. Protocol Bridge**
**File**: `Web_Interface/lib/coral-mcp-bridge.ts` (new)
**Purpose**: Bridge between React UI and MCP protocol

---

## 📦 Dependencies to Add

```json
{
  "dependencies": {
    "langchain_mcp_adapters": "latest"
  }
}
```

---

## ✅ Success Criteria

### **Phase 1 Success**:
- [ ] Coral Studio connects to `https://coral.8interns.com` without CORS errors
- [ ] Can discover and list available agents
- [ ] No more 404 errors on `/api/v1/registry`
- [ ] Basic session creation works

### **Phase 2 Success**:
- [ ] Can send messages to agents through Coral Studio
- [ ] Real-time agent communication works
- [ ] Agent status updates in real-time
- [ ] Full replacement of Coral Inspector functionality

---

## 🚨 Potential Risks

1. **MCP Client Compatibility**: React environment may have issues with MCP client
2. **Real-time Updates**: SSE in browser may need special handling
3. **User Context**: Need to properly pass user ID for multiuser support
4. **Performance**: Multiple MCP connections may impact performance

---

## 🔄 Rollback Plan

If the MCP approach fails:
1. **Immediate**: Revert to current Coral Studio (shows connection error)
2. **Short-term**: Use Coral Inspector as backup
3. **Long-term**: Consider Option B (full server implementation)

---

## 📈 Expected Timeline

### **Phase 1 (Quick Fix)**:
- **Day 1**: Implement MCP connection in Coral Studio
- **Day 2**: Test agent discovery and basic functionality
- **Day 3**: Polish UI and handle edge cases

### **Phase 2 (Enhanced Features)**:
- **Week 2**: Real-time communication and agent interaction
- **Week 3**: Full feature parity with original Coral Studio

---

## 🎯 Next Steps

### **Immediate Actions**:
1. **Install MCP Dependencies**: Add langchain_mcp_adapters to Web_Interface
2. **Create MCP Hook**: Build React hook for MCP client management  
3. **Update Coral Studio**: Replace REST calls with MCP connection
4. **Test Connection**: Verify connection to coral.8interns.com works

### **Testing Checklist**:
- [ ] Connection establishes without CORS errors
- [ ] Can detect available agents
- [ ] User context properly passed
- [ ] No 404 errors
- [ ] Real-time updates work

---

## 📝 Key Insights

1. **Root Cause**: API endpoint mismatch, not HTTPS or CORS primarily
2. **Working Pattern**: Our agents already have the solution - use MCP client directly
3. **Quick Win**: Leverage existing working connection instead of building new API
4. **Architecture**: MCP-first approach aligns with our existing system
5. **User Experience**: Can maintain beautiful Coral Studio UI while fixing backend

---

## 🔗 Related Documentation

- `CORAL_STUDIO_PROTOCOL_BRIDGE_FIX_PLAN.md` - Original investigation
- `CORAL_STUDIO_ANALYSIS.md` - Architecture analysis  
- `CORAL_HTTPS_URL_FIX_COMPLETE.md` - HTTPS fix details
- `2_langchain_tweet_scraping_agent_coral.py` - Working agent pattern
- `Web_Interface/app/coral-studio/page.tsx` - Current implementation

---

*This document serves as the single source of truth for Coral Studio integration. All implementation should reference this plan to avoid going in circles.*
