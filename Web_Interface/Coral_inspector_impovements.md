📌 Objective

Create an integrated Coral Inspector interface that:



Monitors and visualizes the multi-agent Influencer app powered by the Coral Protocol



Enables inspection, debugging, and testing of agents per user session



Adds real-time thread visualization, tool testing, and log monitoring



✅ Phase 1: Foundation (Already Implemented)

Task	Status

Coral Inspector sidebar tab added	✅

Coral server connection logic added	✅

Agent cards with status + message count	✅

X-User-ID agent scoping logic implemented	✅

Agent refresh loop every 30 seconds	✅

“Inspect” and “Quick Actions” UI structure	✅



🚧 Phase 2: Internal Tab Navigation

Goal: Organize inspector features into in-page tabs for clear separation.



Tasks:

&nbsp;Add tab navigation inside /coral-inspector using Tabs from shadcn/ui



&nbsp;Tabs:



Dashboard (default): current agent grid view



Threads: shows agent thread/message data



Tools: send manual messages and test agent behaviors



Logs (optional): real-time Coral server logs (SSE/WebSocket)



Sessions (optional): view active user sessions



Components Involved:

Tabs



Card, CardHeader, CardContent



Optional subroutes (/coral-inspector/tools, etc.) if necessary



🔁 Phase 3: Real-Time Thread Viewer

Goal: See agent-to-agent messages in real time (threaded or flat view)



Tasks:

&nbsp;Create ThreadViewer component



&nbsp;Fetch agent message threads for the logged-in user



&nbsp;Render message list grouped by threadId



&nbsp;Include sender agent, content, timestamp



&nbsp;Option to export conversation as JSON or CSV



Bonus:

&nbsp;Filter by agent



&nbsp;Filter by threadId



&nbsp;Auto-refresh or WebSocket/SSE connection



🧪 Phase 4: Interactive Tools Tab

Goal: Allow users/devs to manually send messages to agents and test tool usage



Tasks:

&nbsp;Create input field to send a message (mention)



&nbsp;Fields:



From Agent ID (dropdown)



To Agent ID (dropdown)



Message Body



Thread ID (optional)



&nbsp;Trigger Coral Protocol-compatible POST to /mention endpoint



&nbsp;Display agent’s response if synchronous



🔍 Phase 5: Agent Inspect Modals

Goal: Click "Inspect" on agent card → modal with live data



Tasks:

&nbsp;Create AgentInspectorModal component



&nbsp;Show:



Last 10 messages from/to agent



Session ID



LastSeen timestamp



Connected thread IDs



&nbsp;Button: “View in Thread Viewer”



📄 Phase 6: Server Logs (Optional)

Goal: Real-time streaming logs from Coral server (only if needed)



Tasks:

&nbsp;Add /api/coral/logs endpoint (streaming or polling)



&nbsp;Create LogsViewer component with:



Filters: Agent ID, message type



Pause/Resume stream



Tail log style UI



🧠 Phase 7: Session Viewer (Optional, Admin)

Goal: View and manage all user sessions



Tasks:

&nbsp;Add /api/coral/sessions endpoint



&nbsp;Show all sessions by user ID



&nbsp;List agents active per session



&nbsp;Option to force disconnect or inspect



🎨 Design Polish Tasks

&nbsp;Color-code agents consistently by category



&nbsp;Animate status indicators (e.g. pulsing green dot)



&nbsp;Graceful empty states (e.g., “No agents found”)



&nbsp;Improve “Refresh” button UX with tooltip, shortcut key



📊 Success Criteria

✅ Users should be able to:



View agent connection status by user



See communication threads per agent



Manually interact with agents/tools



Inspect message flow and debug issues



Export or copy message logs for review



📁 File/Component Suggestions

File	Purpose

/pages/coral-inspector.tsx	Main tab with Tabs

components/ThreadViewer.tsx	Message/thread renderer

components/ToolsTester.tsx	Manual message sender

components/AgentInspectorModal.tsx	Per-agent detailed view

components/LogsViewer.tsx	(optional) Real-time log viewer

lib/coral-api.ts	Shared fetch utils for Coral server



🛠 Suggested Backend Endpoints

Route	Function

/api/coral/agent-status	GET status of single agent

/api/coral/threads	GET threads/messages by user

/api/coral/send-message	POST to simulate agent message

/api/coral/sessions	(optional) GET all active sessions

/api/coral/logs	(optional) SSE/WebSocket for logs

