import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
)

export interface TwitterCredentials {
  api_key: string
  api_secret: string
  access_token: string
  access_token_secret: string
  twitter_username?: string
}

/**
 * Retrieve Twitter credentials for a specific user
 * @param userId - The user's ID
 * @returns Twitter credentials or null if not found
 */
export async function getUserTwitterCredentials(userId: string): Promise<TwitterCredentials | null> {
  try {
    const { data, error } = await supabase
      .from('user_twitter_credentials')
      .select('api_key, api_secret, access_token, access_token_secret, twitter_username')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Error fetching Twitter credentials:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getUserTwitterCredentials:', error)
    return null
  }
}

/**
 * Check if a user has Twitter credentials configured
 * @param userId - The user's ID
 * @returns boolean indicating if credentials exist
 */
export async function hasTwitterCredentials(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_twitter_credentials')
      .select('id')
      .eq('user_id', userId)
      .single()

    return !error && !!data
  } catch (error) {
    console.error('Error checking Twitter credentials:', error)
    return false
  }
}

/**
 * Save or update Twitter credentials for a user
 * @param userId - The user's ID
 * @param credentials - The Twitter credentials to save
 * @returns boolean indicating success
 */
export async function saveTwitterCredentials(
  userId: string, 
  credentials: TwitterCredentials
): Promise<boolean> {
  try {
    // Check if user already has credentials
    const { data: existing } = await supabase
      .from('user_twitter_credentials')
      .select('id')
      .eq('user_id', userId)
      .single()

    const credentialsData = {
      user_id: userId,
      api_key: credentials.api_key,
      api_secret: credentials.api_secret,
      access_token: credentials.access_token,
      access_token_secret: credentials.access_token_secret,
      twitter_username: credentials.twitter_username || null,
      updated_at: new Date().toISOString()
    }

    let result
    if (existing) {
      // Update existing credentials
      result = await supabase
        .from('user_twitter_credentials')
        .update(credentialsData)
        .eq('user_id', userId)
    } else {
      // Insert new credentials
      result = await supabase
        .from('user_twitter_credentials')
        .insert({
          ...credentialsData,
          created_at: new Date().toISOString()
        })
    }

    if (result.error) {
      console.error('Error saving Twitter credentials:', result.error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in saveTwitterCredentials:', error)
    return false
  }
}

/**
 * Delete Twitter credentials for a user
 * @param userId - The user's ID
 * @returns boolean indicating success
 */
export async function deleteTwitterCredentials(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_twitter_credentials')
      .delete()
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting Twitter credentials:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in deleteTwitterCredentials:', error)
    return false
  }
}
