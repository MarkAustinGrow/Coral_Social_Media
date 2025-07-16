import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const threadId = searchParams.get('threadId')
    const agentId = searchParams.get('agentId')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Build query
    let query = supabase
      .from('coral_messages')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (threadId) {
      query = query.eq('thread_id', threadId)
    }

    if (agentId) {
      query = query.or(`from_agent_id.eq.${agentId},to_agent_id.eq.${agentId}`)
    }

    const { data: messages, error } = await query

    if (error) {
      console.error('Error fetching coral messages:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch messages' 
      }, { status: 500 })
    }

    // Transform messages to match frontend interface
    const transformedMessages = messages?.map(msg => ({
      id: msg.id,
      threadId: msg.thread_id,
      fromAgentId: msg.from_agent_id,
      toAgentId: msg.to_agent_id,
      content: msg.content,
      timestamp: msg.timestamp,
      type: msg.message_type
    })) || []

    // Get thread statistics
    const { data: threadStats, error: statsError } = await supabase
      .from('coral_messages')
      .select('thread_id, count(*)')
      .eq('user_id', userId)
      .group('thread_id')

    if (statsError) {
      console.error('Error fetching thread stats:', statsError)
    }

    // Get unique threads
    const uniqueThreads = [...new Set(messages?.map(msg => msg.thread_id) || [])]

    return NextResponse.json({
      messages: transformedMessages,
      threads: uniqueThreads,
      threadStats: threadStats || [],
      pagination: {
        limit,
        offset,
        total: messages?.length || 0
      }
    })

  } catch (error) {
    console.error('Error in coral threads API:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
