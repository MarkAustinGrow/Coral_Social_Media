# Coral Studio Protocol Bridge Fix Plan

## 🎯 Mission Statement

**Goal**: Replace Coral Inspector with Coral Studio by fixing the Coral Protocol Bridge connection to `coral.8interns.com`

**Success Criteria**: 
- Coral Studio connects to real agents instead of showing simulated responses
- All social media agents work through Coral Studio interface
- Coral Inspector can be fully replaced

**Flexibility**: Can modify Coral server on different Linode if needed

---

## 📊 Current State Analysis

### ✅ Working System (Coral Inspector)
- **Connection Method**: Uses `/api/coral/interface-agent` API
- **Communication**: Direct SSE streaming from Interface Agent
- **Agent Integration**: Successfully communicates with all 8 social media agents
- **Status**: Fully functional

### ❌ Non-Working System (Coral Studio)
- **Connection Method**: Uses Coral Protocol Bridge to `coral.8interns.com/devmode/exampleApplication/privkey/session1`
- **Communication**: EventSource (SSE) to Coral server
- **Current Behavior**: Falls back to simulated responses
- **Status**: Shows mock data instead of real agent communication

---

## 🔍 Investigation Phases

### Phase 1: Diagnose Current Connection Issues ⏳
**Status**: In Progress

#### 1.1 Test Coral Protocol Bridge Connection
- [ ] Check if `coral.8interns.com` is accessible
- [ ] Verify exact endpoint path and parameters
- [ ] Test EventSource (SSE) connectivity
- [ ] Check for CORS, SSL, or network issues

#### 1.2 Compare Working vs Non-Working Systems
- [ ] Analyze Coral Inspector's successful connection method
- [ ] Map differences between Interface Agent API and Coral Protocol Bridge
- [ ] Identify protocol/endpoint mismatches

#### 1.3 Examine Coral Studio's Expected Protocol
- [ ] Review Coral Studio's server requirements
- [ ] Check authentication/session requirements
- [ ] Verify message format expectations

### Phase 2: Determine Fix Strategy ⏸️
**Status**: Pending Phase 1 completion

**Potential Options**:
- **Option A**: Fix current `coral.8interns.com` server
- **Option B**: Set up new Coral server on different Linode
- **Option C**: Modify Coral Studio connection parameters

### Phase 3: Implementation ⏸️
**Status**: Pending Phase 2 completion

### Phase 4: Testing & Validation ⏸️
**Status**: Pending Phase 3 completion

---

## 🔧 Technical Findings

### Investigation Results

#### Phase 1.1: Coral Protocol Bridge Connection Analysis ✅

**Key Discovery**: The working agents and Coral Studio use **different endpoint paths**!

**Working Agents (Interface Agent)**:
- **Endpoint**: `http://coral.8interns.com/devmode/exampleApplication/privkey/session1/sse`
- **Method**: Direct SSE connection via MCP client
- **Parameters**: `waitForAgents=2&agentId=user_interface_agent_{userId}&agentDescription=...`
- **Status**: ✅ Working perfectly

**Coral Studio (Protocol Bridge)**:
- **Endpoint**: `http://coral.8interns.com/devmode/exampleApplication/privkey/session1/sse` (tries to add `/sse` again)
- **Method**: EventSource connection
- **Parameters**: `waitForAgents=2&agentId=coral_studio_bridge_{userId}&agentDescription=...`
- **Status**: ❌ Failing - Double `/sse` path issue

**Server Status**:
- **Base URL**: `http://coral.8interns.com` returns 404 (expected - needs full path)
- **HTTPS**: Not configured (port 443 connection refused)
- **HTTP**: Working on port 80 with correct path

#### Root Cause Identified 🎯

**The Issue**: Coral Protocol Bridge is constructing the wrong URL!

1. **Base URL**: `http://coral.8interns.com/devmode/exampleApplication/privkey/session1`
2. **SSE Path**: Bridge adds `/sse` → Results in `/sse?params`
3. **Final URL**: `http://coral.8interns.com/devmode/exampleApplication/privkey/session1/sse?params`

But the working agents use the **exact same URL structure**, so this should work!

**Secondary Issue**: The Coral Protocol Bridge expects different message formats than what the working MCP client receives.

---

## 📋 Implementation Plan
*Will be populated after investigation phase*

---

## ✅ Testing Checklist
*Will be created after implementation plan*

---

## 🔄 Rollback Plan
*Will be defined after implementation*

---

## � Progress Log

**2025-08-01 09:42 AM**: 
- Created documentation file
- Beginning Phase 1 investigation
- Starting with Coral Protocol Bridge connection analysis

---

*This document will be updated throughout the fix process*
