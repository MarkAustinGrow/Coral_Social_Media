# Coral Studio Integration Roadmap - REVISED

## 🎯 Phase 1: Repository Analysis & Setup ✅ COMPLETE

### ✅ Completed Tasks
- [x] **Repository cloned** - `coral-studio-source/` successfully cloned
- [x] **Technology stack analyzed** - SvelteKit, Socket.IO, TypeScript identified
- [x] **Key components identified** - Core functionality mapped
- [x] **Dependencies analyzed** - Package requirements documented
- [x] **Integration strategy selected** - Component translation approach chosen
- [x] **Analysis documentation created** - `CORAL_STUDIO_ANALYSIS.md` completed

### 📊 Key Findings
- **Framework**: SvelteKit 2.16.0 (requires translation to React/Next.js)
- **Real-time**: Socket.IO 4.8.1 (will replace current SSE approach)
- **UI Library**: bits-ui (Svelte equivalent of shadcn/ui)
- **State Management**: Svelte 5 runes + Runed library
- **Core Features**: Session management, thread visualization, agent registry, real-time monitoring

### 🎯 **REVISED SCOPE**: Coral Inspector Replacement
- **Primary Goal**: Replace `/coral-inspector` with full Coral Studio functionality
- **Initial Focus**: Tweet Scraping Agent integration
- **Timeline**: 4-5 weeks (reduced from 7-8 weeks)
- **Approach**: Direct replacement, not parallel systems

## 🚀 Phase 1.5: Coral Inspector Replacement Prep (Next Phase)

### 🎯 Objectives
- Audit current Coral Inspector functionality
- Plan direct replacement strategy
- Prepare Tweet Scraping Agent integration
- Eliminate SSE/Socket.IO coexistence concerns

### 📋 Tasks

#### **1.5.1 Current System Audit**
- [ ] Map existing `/coral-inspector` functionality that must be preserved
- [ ] Identify current SSE implementation patterns
- [ ] Document Tweet Scraping Agent Coral Protocol integration
- [ ] Plan clean removal of SSE infrastructure

#### **1.5.2 Tweet Scraping Agent Focus**
- [ ] Analyze `2_langchain_tweet_scraping_agent_coral.py` integration patterns
- [ ] Identify specific session/thread patterns used by Tweet Scraping Agent
- [ ] Map Socket.IO event routing requirements for this agent
- [ ] Document agent-specific UI requirements

#### **1.5.3 Replacement Strategy**
- [ ] Plan `/coral-inspector` to `/coral-studio` migration
- [ ] Design redirect/replacement mechanism
- [ ] Identify navigation updates needed
- [ ] Plan user communication for the transition

### 🎯 Success Criteria
- [ ] Complete understanding of current Coral Inspector usage
- [ ] Clear migration path from SSE to Socket.IO
- [ ] Tweet Scraping Agent integration requirements documented
- [ ] Replacement strategy finalized

### ⏱️ Estimated Timeline: 2 days

## 🏗️ Phase 2: Foundation & Replacement (Revised)

### 🎯 Objectives
- Install Socket.IO dependencies and create basic infrastructure
- Create Coral Studio page to replace Coral Inspector
- Implement core Socket.IO connection management
- Integrate with existing Supabase authentication

### 📋 Tasks

#### **2.1 Dependencies Installation**
```bash
# Add to Web_Interface/package.json
npm install socket.io-client@^4.8.1 @phosphor-icons/react@^2.0.15
npm install -D @types/socket.io-client@^3.0.0
```

#### **2.2 Core Infrastructure Setup**
- [ ] Create `Web_Interface/lib/coral-studio/` directory structure
- [ ] Implement `socket-client.ts` - Clean Socket.IO wrapper for React
- [ ] Create `types.ts` - TypeScript definitions from Svelte analysis
- [ ] Set up `session-manager.ts` - Simplified session state management

#### **2.3 Coral Studio Page Creation**
- [ ] Create `Web_Interface/app/coral-studio/page.tsx` - Main Coral Studio interface
- [ ] **Replace** `/coral-inspector` route to redirect to `/coral-studio`
- [ ] Update navigation in `Web_Interface/components/side-nav.tsx`
- [ ] Implement basic layout matching existing design system

#### **2.4 Basic Socket.IO Integration**
- [ ] `use-coral-socket.ts` - Socket.IO connection management hook
- [ ] `use-tweet-scraping-agent.ts` - Tweet Scraping Agent specific integration
- [ ] Basic connection status display
- [ ] Error handling and reconnection logic

#### **2.5 Authentication Integration**
- [ ] Integrate with existing `useAuth()` context
- [ ] Implement user-specific Coral server connections
- [ ] Add permission checks for Coral Studio access
- [ ] User isolation for sessions and threads

### 🎯 Success Criteria
- [ ] Coral Studio page accessible at `/coral-studio`
- [ ] Coral Inspector successfully replaced/redirected
- [ ] Socket.IO connection established and stable
- [ ] Authentication working with existing Supabase system
- [ ] Tweet Scraping Agent detectable and connectable

### ⏱️ Estimated Timeline: 1 week

## 🎨 Phase 3: Core Coral Studio Features (Revised)

### 🎯 Objectives
- Focus on essential Coral Studio functionality for Tweet Scraping Agent
- Implement session management interface
- Create thread visualization and real-time messaging
- Build basic agent monitoring and logging

### 📋 Tasks

#### **3.1 Essential UI Components (Tweet Scraping Agent Focus)**
- [ ] `StudioLayout.tsx` - Main layout matching existing design system
- [ ] `SessionManager.tsx` - Session creation and switching for Tweet Scraping Agent
- [ ] `ThreadView.tsx` - Thread visualization for Tweet Scraping Agent conversations
- [ ] `AgentStatus.tsx` - Real-time Tweet Scraping Agent status monitoring

#### **3.2 Core Functionality**
- [ ] **Session Management** - Create, switch, and persist sessions
- [ ] **Real-time Messaging** - Live message streaming from Tweet Scraping Agent
- [ ] **Thread Visualization** - Chat-like interface for agent conversations
- [ ] **Connection Management** - Stable Socket.IO connection handling

#### **3.3 Tweet Scraping Agent Integration**
- [ ] Connect specifically to `2_langchain_tweet_scraping_agent_coral.py`
- [ ] Handle agent-specific message patterns and events
- [ ] Display agent activity and status updates
- [ ] Implement agent-specific logging and monitoring

#### **3.4 Data Persistence (Basic)**
- [ ] Store sessions in Supabase with user isolation
- [ ] Implement basic conversation history storage
- [ ] Add session state persistence across browser sessions
- [ ] User-specific session management

### 🎯 Success Criteria
- [ ] Tweet Scraping Agent successfully connects and communicates
- [ ] Real-time message streaming working reliably
- [ ] Session management fully functional
- [ ] Basic logging and monitoring operational
- [ ] UI consistent with existing Web Interface design

### ⏱️ Estimated Timeline: 2 weeks

## 🚀 Phase 4: Polish & Production (Final Phase)

### 🎯 Objectives
- Polish UI/UX to match existing design system perfectly
- Optimize performance and add comprehensive error handling
- Prepare for production deployment
- **Defer advanced features** to post-MVP

### 📋 Tasks

#### **4.1 UI/UX Consistency**
- [ ] Apply existing design system components and styling
- [ ] Ensure responsive design matches other pages
- [ ] Add loading states and skeleton screens
- [ ] Implement consistent navigation and interactions

#### **4.2 Performance & Reliability**
- [ ] Optimize Socket.IO connection management
- [ ] Implement robust error handling and recovery
- [ ] Add connection retry logic and fallback mechanisms
- [ ] Optimize real-time update performance

#### **4.3 Production Readiness**
- [ ] Comprehensive error boundary implementation
- [ ] User-friendly error messages and states
- [ ] Production deployment and testing
- [ ] Integration testing with existing system

#### **4.4 Documentation & Handoff**
- [ ] Update user documentation
- [ ] Create deployment and maintenance guides
- [ ] Document Tweet Scraping Agent integration patterns
- [ ] Prepare for future agent integrations

### 🎯 Success Criteria
- [ ] Production-ready Coral Studio replacement for Coral Inspector
- [ ] Consistent UI/UX with existing Web Interface
- [ ] Robust error handling and recovery mechanisms
- [ ] Tweet Scraping Agent integration fully operational
- [ ] Ready for additional agent integrations in future

### ⏱️ Estimated Timeline: 1 week

### 🔄 **Deferred Features** (Post-MVP)
- Advanced debug console
- Multi-agent orchestration
- Complex export functionality
- Advanced configuration UI
- Integration with remaining 7 agents

## 📁 File Structure Plan

```
Web_Interface/
├── app/
│   └── coral-studio/
│       ├── page.tsx                    # Main Coral Studio page
│       ├── session/
│       │   └── [sessionId]/
│       │       └── page.tsx            # Session-specific page
│       └── thread/
│           └── [threadId]/
│               └── page.tsx            # Thread view page
├── components/coral-studio/
│   ├── StudioLayout.tsx               # Main layout
│   ├── StudioSidebar.tsx              # Navigation sidebar
│   ├── ServerConnection.tsx           # Server connection
│   ├── SessionManager.tsx             # Session management
│   ├── AgentRegistry.tsx              # Agent registry
│   ├── ThreadView.tsx                 # Thread interface
│   ├── MessageComponent.tsx           # Message display
│   ├── LogViewer.tsx                  # Logging interface
│   └── dialogs/
│       ├── CreateSessionDialog.tsx    # Session creation
│       └── AgentConfigDialog.tsx      # Agent configuration
├── hooks/
│   ├── use-coral-socket.ts            # Socket.IO management
│   ├── use-coral-session.ts           # Session management
│   ├── use-coral-agents.ts            # Agent management
│   └── use-coral-threads.ts           # Thread management
├── lib/coral-studio/
│   ├── socket-client.ts               # Socket.IO client
│   ├── session-manager.ts             # Session state
│   ├── agent-manager.ts               # Agent management
│   ├── thread-manager.ts              # Thread handling
│   └── types.ts                       # TypeScript definitions
└── contexts/
    └── CoralStudioContext.tsx         # Global state context
```

## 🔧 Technical Implementation Details

### **Socket.IO Integration Pattern**
```typescript
// Web_Interface/hooks/use-coral-socket.ts
export function useCoralSocket(serverUrl: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  
  useEffect(() => {
    const newSocket = io(serverUrl);
    
    newSocket.on('connect', () => setConnected(true));
    newSocket.on('disconnect', () => setConnected(false));
    
    setSocket(newSocket);
    
    return () => newSocket.close();
  }, [serverUrl]);
  
  return { socket, connected };
}
```

### **Session Management Pattern**
```typescript
// Web_Interface/hooks/use-coral-session.ts
export function useCoralSession() {
  const { user } = useAuth(); // Existing auth context
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  
  const createSession = async (name: string, agents: string[]) => {
    // Create session with user context
    // Store in Supabase for persistence
  };
  
  return { sessions, currentSession, createSession };
}
```

### **Navigation Integration**
```typescript
// Add to Web_Interface/components/side-nav.tsx
{
  title: "Coral Studio",
  href: "/coral-studio",
  icon: CoralIcon,
  description: "Advanced agent development environment"
}
```

## 📊 Progress Tracking - REVISED

### **Phase 1: Analysis & Setup** ✅ COMPLETE
- [x] Repository cloned and analyzed
- [x] Technology stack documented
- [x] Integration strategy defined
- [x] Roadmap created and revised

### **Phase 1.5: Coral Inspector Replacement Prep** ✅ COMPLETE
- [x] Current system audit completed
- [x] Tweet Scraping Agent integration requirements documented
- [x] Replacement strategy finalized
- [x] SSE to Socket.IO migration plan ready

### **Phase 2: Foundation & Replacement** ⏳ PENDING
- [ ] Dependencies installed
- [ ] Core infrastructure created
- [ ] Coral Studio page created
- [ ] Coral Inspector replaced/redirected
- [ ] Basic Socket.IO integration working
- [ ] Authentication integration complete

### **Phase 3: Core Coral Studio Features** ⏳ PENDING
- [ ] Essential UI components for Tweet Scraping Agent
- [ ] Session management functional
- [ ] Real-time messaging working
- [ ] Thread visualization complete
- [ ] Basic data persistence implemented

### **Phase 4: Polish & Production** ⏳ PENDING
- [ ] UI/UX consistency achieved
- [ ] Performance optimization complete
- [ ] Error handling robust
- [ ] Production deployment ready
- [ ] Documentation and handoff complete

## 🎯 **REVISED TIMELINE**: 4-5 weeks total
- **Phase 1**: ✅ Complete (1 session)
- **Phase 1.5**: 2 days
- **Phase 2**: 1 week  
- **Phase 3**: 2 weeks
- **Phase 4**: 1 week

## 🎯 Success Metrics

### **Technical Metrics**
- [ ] Socket.IO connection stability > 99%
- [ ] Real-time message latency < 100ms
- [ ] Component render performance < 16ms
- [ ] Error rate < 0.1%

### **User Experience Metrics**
- [ ] Session creation time < 3 seconds
- [ ] Thread loading time < 1 second
- [ ] UI responsiveness on mobile devices
- [ ] Consistent design with existing system

### **Integration Metrics**
- [ ] Successful connection to all 8 existing agents
- [ ] Authentication seamlessly integrated
- [ ] Data persistence working correctly
- [ ] No conflicts with existing functionality

## 🚨 Risk Mitigation

### **Technical Risks**
- **Socket.IO conflicts** - Test thoroughly with existing SSE implementation
- **State management complexity** - Use proven patterns from existing codebase
- **Performance impact** - Monitor and optimize real-time connections

### **Timeline Risks**
- **Component translation complexity** - Start with core components first
- **Integration challenges** - Maintain close communication with existing system
- **Testing requirements** - Allocate sufficient time for comprehensive testing

### **Mitigation Strategies**
- **Incremental development** - Build and test one component at a time
- **Fallback options** - Keep iframe integration as backup plan
- **Regular checkpoints** - Review progress weekly and adjust as needed

## 📞 Next Steps

1. **Review and approve this roadmap** - Confirm approach and timeline
2. **Begin Phase 2 implementation** - Start with dependencies and basic setup
3. **Set up development environment** - Prepare tools and workspace
4. **Create first Socket.IO connection** - Establish basic connectivity
5. **Regular progress reviews** - Weekly check-ins on development progress

This roadmap provides a clear path from the completed analysis phase to a fully integrated Coral Studio within your existing Web Interface, maintaining your current architecture while adding powerful agent development capabilities.
