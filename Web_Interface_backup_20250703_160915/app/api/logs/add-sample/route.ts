import { NextRequest, NextResponse } from 'next/server'
import { addSampleLog } from '@/lib/log-agent-activity'

export async function POST(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const count = parseInt(searchParams.get('count') || '1', 10)
    
    // Add sample logs
    const results = []
    for (let i = 0; i < count; i++) {
      const success = await addSampleLog()
      results.push(success)
    }
    
    // Return results
    return NextResponse.json({
      success: true,
      count: results.filter(Boolean).length,
      message: `Added ${results.filter(Boolean).length} sample logs`
    })
  } catch (error: any) {
    console.error('Error adding sample logs:', error)
    return NextResponse.json(
      { error: error.message || 'An unknown error occurred' },
      { status: 500 }
    )
  }
}
