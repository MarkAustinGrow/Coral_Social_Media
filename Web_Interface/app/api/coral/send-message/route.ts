import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fromAgentId, toAgentId, content, threadId, userId } = body

    if (!toAgentId || !content || !userId) {
      return NextResponse.json({ 
        error: 'toAgentId, content, and userId are required' 
      }, { status: 400 })
    }

    // Always use Interface Agent as the sender in Coral Protocol
    const interfaceAgentId = `user_interaction_agent_${userId}`

    // For now, we'll simulate sending a message to the Coral server
    // In a real implementation, this would make an HTTP request to the Coral server
    // to send the message through the proper protocol
    
    const messageData = {
      id: `msg_${Date.now()}`,
      threadId: threadId || `thread_${Date.now()}`,
      fromAgentId: interfaceAgentId,
      toAgentId,
      content,
      timestamp: new Date().toISOString(),
      type: 'interface_instruction',
      userId
    }

    // Log the message to Supabase
    const { data, error } = await supabase
      .from('coral_messages')
      .insert({
        user_id: userId,
        agent_id: interfaceAgentId,
        thread_id: messageData.threadId,
        from_agent_id: interfaceAgentId,
        to_agent_id: toAgentId,
        content,
        message_type: 'interface_instruction',
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

    // In a real implementation, you would send this to the Coral server:
    // const coralResponse = await fetch('http://localhost:5555/api/send-message', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     threadId: messageData.threadId,
    //     fromAgentId,
    //     toAgentId,
    //     content,
    //     type: 'mention'
    //   })
    // })

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      data: messageData,
      note: 'This is a simulated response. In production, this would interact with the actual Coral server.'
    })

  } catch (error) {
    console.error('Error in send-message API:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
