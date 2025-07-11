import { NextRequest, NextResponse } from 'next/server'

// POST - Verify Twitter credentials by testing them
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { api_key, api_secret, access_token, access_token_secret, bearer_token } = body

    if (!api_key || !api_secret || !access_token || !access_token_secret) {
      return NextResponse.json({ 
        error: 'Missing required fields: api_key, api_secret, access_token, access_token_secret' 
      }, { status: 400 })
    }

    // Test the credentials by making a simple API call to Twitter
    // We'll use the verify_credentials endpoint
    const oauth = require('oauth-1.0a')
    const crypto = require('crypto')

    const oauthClient = oauth({
      consumer: { key: api_key, secret: api_secret },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string: string, key: string) {
        return crypto
          .createHmac('sha1', key)
          .update(base_string)
          .digest('base64')
      },
    })

    const token = {
      key: access_token,
      secret: access_token_secret,
    }

    const requestData = {
      url: 'https://api.twitter.com/1.1/account/verify_credentials.json',
      method: 'GET',
    }

    const authHeader = oauthClient.toHeader(oauthClient.authorize(requestData, token))

    const response = await fetch(requestData.url, {
      method: 'GET',
      headers: {
        Authorization: authHeader['Authorization'],
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Twitter API error:', response.status, errorText)
      
      if (response.status === 401) {
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid Twitter credentials. Please check your API keys and tokens.' 
        }, { status: 400 })
      }
      
      return NextResponse.json({ 
        success: false, 
        error: `Twitter API error: ${response.status}` 
      }, { status: 400 })
    }

    const userData = await response.json()

    return NextResponse.json({
      success: true,
      accountInfo: {
        username: userData.screen_name,
        display_name: userData.name,
        user_id: userData.id_str,
        followers_count: userData.followers_count,
        following_count: userData.friends_count,
        verified: userData.verified,
        profile_image_url: userData.profile_image_url_https,
      }
    })

  } catch (error) {
    console.error('Error verifying Twitter credentials:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to verify credentials. Please check your API keys and try again.' 
    }, { status: 500 })
  }
}
