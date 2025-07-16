import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const userId = searchParams.get('userId')

    if (!agentId || !userId) {
      return NextResponse.json({ error: 'Agent ID and User ID are required' }, { status: 400 })
    }

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        const encoder = new TextEncoder()
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'connection',
          message: 'Connected to Coral Inspector',
          timestamp: new Date().toISOString(),
          agentId,
          userId
        })}\n\n`))

        // Set up connection to Coral server
        const coralUrl = `http://localhost:5555/devmode/exampleApplication/privkey/session1/sse?agentId=${agentId}&waitForAgents=1&agentDescription=Coral Inspector Agent`
        
        let eventSource: EventSource | null = null
        
        const connectToCoral = () => {
          try {
            eventSource = new EventSource(coralUrl)
            
            eventSource.onopen = () => {
              console.log('Connected to Coral server')
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'coral_connected',
                message: 'Connected to Coral server',
                timestamp: new Date().toISOString()
              })}\n\n`))
            }

            eventSource.onmessage = (event) => {
              try {
                const data = JSON.parse(event.data)
                
                // Forward the message to the client
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  ...data,
                  timestamp: data.timestamp || new Date().toISOString(),
                  userId
                })}\n\n`))

                // Log message to Supabase for persistence
                supabase
                  .from('coral_messages')
                  .insert({
                    user_id: userId,
                    agent_id: agentId,
                    thread_id: data.threadId || 'default',
                    from_agent_id: data.fromAgentId || 'unknown',
                    to_agent_id: data.toAgentId || 'unknown',
                    content: data.content || data.message || '',
                    message_type: data.type || 'message',
                    timestamp: data.timestamp || new Date().toISOString(),
                    raw_data: data
                  })
                  .then(({ error }) => {
                    if (error) {
                      console.error('Error logging message to Supabase:', error)
                    }
                  })

              } catch (error) {
                console.error('Error parsing Coral message:', error)
              }
            }

            eventSource.onerror = (error) => {
              console.error('Coral SSE error:', error)
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'error',
                message: 'Coral server connection error',
                timestamp: new Date().toISOString()
              })}\n\n`))
              
              // Attempt to reconnect after 5 seconds
              setTimeout(() => {
                if (eventSource) {
                  eventSource.close()
                }
                connectToCoral()
              }, 5000)
            }

          } catch (error) {
            console.error('Error connecting to Coral server:', error)
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              message: 'Failed to connect to Coral server',
              timestamp: new Date().toISOString()
            })}\n\n`))
          }
        }

        // Initial connection
        connectToCoral()

        // Cleanup function
        return () => {
          if (eventSource) {
            eventSource.close()
          }
        }
      },

      cancel() {
        console.log('SSE stream cancelled')
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })

  } catch (error) {
    console.error('Error in coral stream API:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
