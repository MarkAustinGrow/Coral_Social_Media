import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { supabaseUrl, supabaseKey } = data
    
    // Validate inputs
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // In a production environment, you would want to add more validation
    // and security checks here
    
    // Path to root .env file (one directory up from the Web_Interface directory)
    const envFilePath = path.resolve(process.cwd(), '../.env')
    
    // Check if the file exists
    if (!fs.existsSync(envFilePath)) {
      return NextResponse.json(
        { error: 'Root .env file not found' },
        { status: 500 }
      )
    }
    
    // Read existing .env file
    let envContent = fs.readFileSync(envFilePath, 'utf8')
    
    // Update or add Supabase URL and key
    const envLines = envContent.split('\n')
    let updatedUrl = false
    let updatedKey = false
    
    const updatedLines = envLines.map(line => {
      if (line.startsWith('SUPABASE_URL=')) {
        updatedUrl = true
        return `SUPABASE_URL="${supabaseUrl}"`
      }
      if (line.startsWith('SUPABASE_KEY=')) {
        updatedKey = true
        return `SUPABASE_KEY="${supabaseKey}"`
      }
      return line
    })
    
    // Add lines if they don't exist
    if (!updatedUrl) {
      updatedLines.push(`SUPABASE_URL="${supabaseUrl}"`)
    }
    if (!updatedKey) {
      updatedLines.push(`SUPABASE_KEY="${supabaseKey}"`)
    }
    
    // Write updated content back to .env
    fs.writeFileSync(envFilePath, updatedLines.join('\n'))
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving Supabase configuration:', error)
    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500 }
    )
  }
}
