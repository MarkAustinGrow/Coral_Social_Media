import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { content, userId } = body

    if (!content || !userId) {
      return NextResponse.json({ 
        error: 'content and userId are required' 
      }, { status: 400 })
    }

    // In Coral Protocol, we send messages directly to the Interface Agent
    // The Interface Agent will decide which agent to route to
    const interfaceAgentId = `user_interface_agent_${userId}`
    
    const messageData = {
      id: `msg_${Date.now()}`,
      threadId: `thread_${Date.now()}`,
      fromAgentId: 'web_interface',
      toAgentId: interfaceAgentId,
      content,
      timestamp: new Date().toISOString(),
      type: 'user_message',
      userId
    }

    // Log the message to Supabase
    const { data, error } = await supabase
      .from('coral_messages')
      .insert({
        user_id: userId,
        agent_id: interfaceAgentId,
        thread_id: messageData.threadId,
        from_agent_id: 'web_interface',
        to_agent_id: interfaceAgentId,
        content,
        message_type: 'user_message',
        timestamp: messageData.timestamp,
        raw_data: messageData
      })
      .select()

    if (error) {
      console.error('Error logging message to Supabase:', error)
      return NextResponse.json({ 
        error: 'Failed to log message' 
      }, { status: 500 })
    }

    // Send message to the real Coral server where the Interface Agent is running
    try {
      const coralResponse = await fetch('http://coral.8interns.com/devmode/exampleApplication/privkey/session1/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId
        },
        body: JSON.stringify({
          threadId: messageData.threadId,
          fromAgentId: 'web_interface',
          toAgentId: interfaceAgentId,
          content,
          type: 'mention',
          mentions: [interfaceAgentId]
        })
      })

      if (!coralResponse.ok) {
        throw new Error(`Coral server responded with ${coralResponse.status}`)
      }

      const coralResult = await coralResponse.json()

      return NextResponse.json({
        success: true,
        message: 'Message sent to Interface Agent successfully',
        data: {
          ...messageData,
          coralResponse: coralResult
        }
      })

    } catch (coralError) {
      console.error('Error sending to Coral server:', coralError)
      
      // Return success for logging but note the Coral server issue
      return NextResponse.json({
        success: true,
        message: 'Message logged but failed to reach Coral server',
        data: messageData,
        warning: 'Could not connect to Coral server. Make sure the Interface Agent is running.'
      })
    }

  } catch (error) {
    console.error('Error in send-message API:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
