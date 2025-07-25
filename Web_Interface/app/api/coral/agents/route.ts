import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Query the actual Coral server for registered agents
    const coralServerUrl = 'http://coral.8interns.com/devmode/exampleApplication/privkey/session1/sse'
    
    try {
      // Create a temporary connection to get the list of registered agents
      const params = new URLSearchParams({
        waitForAgents: '1',
        agentId: `coral_inspector_${userId}`,
        agentDescription: 'Coral Inspector querying for registered agents'
      })
      
      const response = await fetch(`${coralServerUrl}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'X-User-ID': userId,
          'Accept': 'text/event-stream'
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })

      if (!response.ok) {
        throw new Error(`Coral server responded with ${response.status}`)
      }

      // Get the session endpoint from the response
      const sessionUrl = response.headers.get('X-Session-Endpoint')
      
      if (sessionUrl) {
        // Query the session for list of agents
        const listAgentsResponse = await fetch(`${sessionUrl.replace('/message', '/agents')}`, {
          method: 'GET',
          headers: {
            'X-User-ID': userId
          },
          signal: AbortSignal.timeout(3000)
        })

        if (listAgentsResponse.ok) {
          const agentsData = await listAgentsResponse.json()
          
          // Transform the agent data to include user-friendly names
          const agents = agentsData.agents?.map((agent: any) => {
            // Extract agent type from ID (e.g., "tweet_scraping_agent_user123" -> "Tweet Scraping Agent")
            const agentType = agent.id.replace(`_${userId}`, '').replace(/_/g, ' ')
            const friendlyName = agentType
              .split(' ')
              .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')

            return {
              id: agent.id,
              name: friendlyName,
              description: agent.description || `${friendlyName} for user ${userId}`,
              status: agent.status || 'unknown',
              lastSeen: agent.lastSeen,
              messageCount: agent.messageCount || 0
            }
          }) || []

          return NextResponse.json({
            success: true,
            agents,
            source: 'coral_server',
            timestamp: new Date().toISOString()
          })
        }
      }

      // If we can't get the agent list from Coral server, return empty list
      console.log('⚠️ [Coral Agents API] Could not retrieve agents from Coral server, returning empty list')
      return NextResponse.json({
        success: true,
        agents: [],
        source: 'coral_server_unavailable',
        message: 'Coral server is currently unavailable. No agents discovered.',
        timestamp: new Date().toISOString()
      })

    } catch (coralError) {
      console.error('Error querying Coral server:', coralError)
      
      const errorMessage = coralError instanceof Error ? coralError.message : 'Unknown error'
      
      // Return empty list instead of hardcoded agents
      return NextResponse.json({
        success: true,
        agents: [],
        source: 'error',
        error: `Could not connect to Coral server: ${errorMessage}`,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Error in coral agents API:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      agents: []
    }, { status: 500 })
  }
}
