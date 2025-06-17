import { getSupabaseClient } from './supabase'

/**
 * Log an agent activity to the agent_logs table
 * 
 * @param agentName - The name of the agent
 * @param level - The log level (info, warning, error)
 * @param message - The log message
 * @param metadata - Optional metadata to store with the log
 * @returns Promise<boolean> - True if the log was successfully added
 */
export async function logAgentActivity(
  agentName: string,
  level: 'info' | 'warning' | 'error',
  message: string,
  metadata: any = null
): Promise<boolean> {
  try {
    const supabase = await getSupabaseClient()
    
    if (!supabase) {
      console.error('Supabase client not available, log not saved')
      return false
    }
    
    const { error } = await supabase
      .from('agent_logs')
      .insert({
        timestamp: new Date().toISOString(),
        level,
        agent_name: agentName,
        message,
        metadata
      })
    
    if (error) {
      console.error('Error logging agent activity:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error logging agent activity:', error)
    return false
  }
}

/**
 * Log an info level message
 */
export function logInfo(agentName: string, message: string, metadata: any = null): Promise<boolean> {
  return logAgentActivity(agentName, 'info', message, metadata)
}

/**
 * Log a warning level message
 */
export function logWarning(agentName: string, message: string, metadata: any = null): Promise<boolean> {
  return logAgentActivity(agentName, 'warning', message, metadata)
}

/**
 * Log an error level message
 */
export function logError(agentName: string, message: string, metadata: any = null): Promise<boolean> {
  return logAgentActivity(agentName, 'error', message, metadata)
}

/**
 * Add a sample log entry (for testing)
 */
export async function addSampleLog(): Promise<boolean> {
  const agents = [
    'Tweet Scraping Agent',
    'Hot Topic Agent',
    'Tweet Research Agent',
    'Blog Writing Agent',
    'Blog Critique Agent',
    'Blog to Tweet Agent',
    'Twitter Posting Agent',
    'X Reply Agent'
  ]
  
  const levels = ['info', 'warning', 'error'] as const
  const agent = agents[Math.floor(Math.random() * agents.length)]
  const level = levels[Math.floor(Math.random() * levels.length)]
  
  let message = ''
  
  switch (level) {
    case 'info':
      message = [
        `Successfully processed 15 tweets from @OpenAI`,
        `Analyzed 10 tweets and stored insights in database`,
        `Generated new blog post: 'Understanding AI in 2025'`,
        `Posted tweet thread with 4 tweets`,
        `Converted blog post to tweet thread`
      ][Math.floor(Math.random() * 5)]
      break
    case 'warning':
      message = [
        `API rate limit warning: 10% of daily quota remaining`,
        `Tweet generation took longer than expected (5.2s)`,
        `Unable to fetch some tweets due to API limitations`,
        `Blog post generation partially completed`,
        `Some tweets were not analyzed due to language constraints`
      ][Math.floor(Math.random() * 5)]
      break
    case 'error':
      message = [
        `API rate limit exceeded when calling OpenAI API`,
        `Failed to post reply: Tweet with ID 98765 not found`,
        `Database connection error during tweet analysis`,
        `Authentication failed with Twitter API`,
        `Failed to generate blog content: prompt too long`
      ][Math.floor(Math.random() * 5)]
      break
  }
  
  return logAgentActivity(agent, level, message)
}
