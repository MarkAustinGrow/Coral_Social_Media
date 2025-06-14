import { spawn, ChildProcess, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getSupabaseClient } from './supabase';
import os from 'os';
import { promisify } from 'util';

const execPromise = promisify(exec);

/**
 * Check if a process is running by its name
 */
async function isProcessRunningByName(processName: string): Promise<boolean> {
  try {
    if (os.platform() === 'win32') {
      // On Windows, use tasklist
      const { stdout } = await execPromise(`tasklist /FI "IMAGENAME eq python.exe" /FO CSV`);
      return stdout.toLowerCase().includes(processName.toLowerCase());
    } else {
      // On Unix-like systems, use ps
      const { stdout } = await execPromise(`ps aux | grep python | grep ${processName}`);
      // Filter out the grep process itself
      const lines = stdout.split('\n').filter(line => !line.includes('grep'));
      return lines.length > 0;
    }
  } catch (error) {
    console.error(`Error checking if process ${processName} is running:`, error);
    return false;
  }
}

/**
 * Kill a process by its name
 */
async function killProcessByName(processName: string): Promise<boolean> {
  try {
    if (os.platform() === 'win32') {
      // On Windows, use taskkill with a more specific filter
      // First try with WINDOWTITLE filter
      try {
        await execPromise(`taskkill /F /IM python.exe /FI "WINDOWTITLE eq *${processName}*"`);
      } catch (e) {
        // If that fails, try with a more aggressive approach using FINDSTR to find the process
        console.log(`First kill attempt failed, trying more aggressive approach for ${processName}`);
        
        // Get a list of all python processes
        const { stdout } = await execPromise('tasklist /FI "IMAGENAME eq python.exe" /FO CSV');
        
        // Extract the PIDs
        const lines = stdout.split('\n');
        for (const line of lines) {
          if (line.toLowerCase().includes(processName.toLowerCase())) {
            // Extract PID from the CSV line (format: "python.exe","1234",...)
            const match = line.match(/"python\.exe","(\d+)"/i);
            if (match && match[1]) {
              const pid = match[1];
              console.log(`Found matching process with PID ${pid}, killing...`);
              await execPromise(`taskkill /F /PID ${pid} /T`);
            }
          }
        }
        
        // As a last resort, try using WMIC to find and kill the process
        try {
          await execPromise(`wmic process where "commandline like '%${processName}%' and name='python.exe'" call terminate`);
        } catch (wmicError) {
          console.log(`WMIC kill attempt failed: ${wmicError}`);
        }
      }
    } else {
      // On Unix-like systems, use pkill with the -f flag to match against the full command line
      await execPromise(`pkill -f "${processName}"`);
      
      // If that doesn't work, try a more aggressive approach
      try {
        await execPromise(`ps aux | grep "${processName}" | grep -v grep | awk '{print $2}' | xargs kill -9`);
      } catch (e) {
        // Ignore errors from this command, as it might fail if no processes are found
      }
    }
    return true;
  } catch (error) {
    console.error(`Error killing process ${processName}:`, error);
    return false;
  }
}

// Map of agent names to their processes
const runningProcesses: Record<string, ChildProcess> = {};

// Map of agent names to their file paths
const agentFilePaths: Record<string, string> = {
  'Tweet Scraping Agent': '2_langchain_tweet_scraping_agent_with_status.py',
  'Tweet Research Agent': '3_langchain_tweet_research_agent.py',
  'Hot Topic Agent': '3.5_langchain_hot_topic_agent.py',
  'Blog Critique Agent': '4_langchain_blog_critique_agent.py',
  'Blog Writing Agent': '4_langchain_blog_writing_agent.py',
  'Blog to Tweet Agent': '5_langchain_blog_to_tweet_agent.py',
  'X Reply Agent': '6_langchain_x_reply_agent.py',
  'Twitter Posting Agent': '7_langchain_twitter_posting_agent.py'
};

/**
 * Start an agent process
 */
export async function startAgent(agentName: string): Promise<boolean> {
  try {
    // Check if the agent is already running
    if (runningProcesses[agentName]) {
      console.log(`Agent ${agentName} is already running`);
      return true;
    }

    // Get the agent file path
    const agentFilePath = agentFilePaths[agentName];
    if (!agentFilePath) {
      console.error(`Unknown agent: ${agentName}`);
      return false;
    }

    // Get the root directory (where the Python scripts are located)
    const rootDir = path.resolve(process.cwd(), '..');

    // Check if the agent file exists
    const fullPath = path.join(rootDir, agentFilePath);
    if (!fs.existsSync(fullPath)) {
      console.error(`Agent file not found: ${fullPath}`);
      return false;
    }

    // Determine the Python executable
    const pythonExecutable = os.platform() === 'win32' ? 'python' : 'python3';

    // Start the agent process
    const agentProcess = spawn(pythonExecutable, [agentFilePath], {
      cwd: rootDir,
      stdio: 'ignore', // Ignore stdin, stdout, and stderr
      detached: true, // Run the process in the background
      shell: true // Use shell to run the command
    });

    // Store the process
    runningProcesses[agentName] = agentProcess;

    // Handle process exit
    agentProcess.on('exit', (code: number | null) => {
      console.log(`Agent ${agentName} exited with code ${code}`);
      delete runningProcesses[agentName];

      // Update the agent status in the database
      updateAgentStatus(agentName, 'stopped', 0, `Process exited with code ${code}`);
    });

    // Handle process error
    agentProcess.on('error', (error: Error) => {
      console.error(`Error starting agent ${agentName}:`, error);
      delete runningProcesses[agentName];

      // Update the agent status in the database
      updateAgentStatus(agentName, 'error', 0, `Error starting process: ${error.message}`);
    });

    console.log(`Started agent ${agentName}`);
    return true;
  } catch (error) {
    console.error(`Error starting agent ${agentName}:`, error);
    return false;
  }
}

/**
 * Stop an agent process
 */
export async function stopAgent(agentName: string): Promise<boolean> {
  try {
    let processKilled = false;
    
    // Get the agent file path
    const agentFilePath = agentFilePaths[agentName];
    if (!agentFilePath) {
      console.error(`Unknown agent: ${agentName}`);
      return false;
    }
    
    // First, check if the agent is in our runningProcesses map
    const agentProcess = runningProcesses[agentName];
    if (agentProcess) {
      // Kill the process we know about
      try {
        if (agentProcess.pid) {
          // On Windows, we need to use taskkill to kill the process tree
          if (os.platform() === 'win32') {
            spawn('taskkill', ['/pid', agentProcess.pid.toString(), '/f', '/t']);
          } else {
            // On Unix-like systems, we can use process.kill
            agentProcess.kill('SIGTERM');
          }
          processKilled = true;
        }
      } catch (killError) {
        console.error(`Error killing process for ${agentName}:`, killError);
      }
      
      // Remove the process from the map
      delete runningProcesses[agentName];
    } else {
      console.log(`Agent ${agentName} is not in the runningProcesses map`);
    }
    
    // Even if the process is not in our map, check if it's running by name
    // This handles cases where the process was started outside the web interface
    const isRunning = await isProcessRunningByName(agentFilePath);
    if (isRunning) {
      console.log(`Agent ${agentName} is running but not in our map, attempting to kill by name`);
      const killed = await killProcessByName(agentFilePath);
      if (killed) {
        processKilled = true;
        console.log(`Successfully killed ${agentName} process by name`);
      } else {
        console.log(`Failed to kill ${agentName} process by name`);
      }
    }
    
    // Update the database regardless of whether we found and killed a process
    try {
      const supabase = await getSupabaseClient();
      if (supabase) {
        await supabase
          .from('agent_status')
          .update({
            status: 'stopped',
            health: 0,
            last_activity: processKilled 
              ? 'Agent stopped via API' 
              : 'Agent marked as stopped (no process found)',
            updated_at: new Date().toISOString()
          })
          .eq('agent_name', agentName);
      }
    } catch (dbError) {
      console.error(`Error updating database for ${agentName}:`, dbError);
    }
    
    console.log(`Stopped agent ${agentName} (process killed: ${processKilled})`);
    return true;
  } catch (error) {
    console.error(`Error stopping agent ${agentName}:`, error);
    return false;
  }
}

/**
 * Start all agents
 */
export async function startAllAgents(): Promise<boolean> {
  try {
    // Start each agent
    const results = await Promise.all(
      Object.keys(agentFilePaths).map(agentName => startAgent(agentName))
    );

    // Return true if all agents were started successfully
    return results.every(result => result);
  } catch (error) {
    console.error('Error starting all agents:', error);
    return false;
  }
}

/**
 * Update an agent's status in the database
 */
async function updateAgentStatus(
  agentName: string,
  status: 'running' | 'warning' | 'error' | 'stopped',
  health: number,
  lastActivity?: string
): Promise<void> {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      console.error('Supabase client not available');
      return;
    }

    // Update the agent status
    const { error } = await supabase
      .from('agent_status')
      .update({
        status,
        health,
        last_activity: lastActivity || `Status changed to ${status}`,
        updated_at: new Date().toISOString()
      })
      .eq('agent_name', agentName);

    if (error) {
      console.error(`Error updating agent status for ${agentName}:`, error);
    }
  } catch (error) {
    console.error(`Error updating agent status for ${agentName}:`, error);
  }
}
