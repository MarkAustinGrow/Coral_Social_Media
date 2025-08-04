import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Get the socket secret from our internal Coral Studio bridge server
    const response = await fetch('http://localhost:3001/socket-secret')
    
    if (!response.ok) {
      throw new Error(`Failed to fetch socket secret: ${response.status}`)
    }
    
    const data = await response.json()
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Socket secret proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to get socket secret' },
      { status: 500 }
    )
  }
}
