import fs from 'fs';
import path from 'path';

// Cache for environment variables
let envCache: Record<string, string> | null = null;

/**
 * Load environment variables from the root .env file
 */
export function loadEnvFromRoot(): Record<string, string> {
  // Return cached values if available
  if (envCache) {
    return envCache;
  }

  try {
    // In a browser environment, we can't access the file system
    if (typeof window !== 'undefined') {
      return {};
    }

    // Path to the root .env file
    // First try the current directory
    let rootEnvPath = path.resolve(process.cwd(), '.env');
    console.log('Trying to load .env from:', rootEnvPath);
    
    // If not found, try one level up (in case we're in the Web_Interface directory)
    if (!fs.existsSync(rootEnvPath)) {
      rootEnvPath = path.resolve(process.cwd(), '../.env');
      console.log('Not found, trying:', rootEnvPath);
    }
    
    // If still not found, try two levels up
    if (!fs.existsSync(rootEnvPath)) {
      rootEnvPath = path.resolve(process.cwd(), '../../.env');
      console.log('Not found, trying:', rootEnvPath);
    }
    
    // If still not found, try absolute path
    if (!fs.existsSync(rootEnvPath)) {
      rootEnvPath = 'e:/Plank pushers/Core-Social-Infrastructure/.env';
      console.log('Not found, trying absolute path:', rootEnvPath);
    }
    
    // Check if the file exists
    if (!fs.existsSync(rootEnvPath)) {
      console.error('Root .env file not found at any location. Last tried:', rootEnvPath);
      return {};
    }
    
    console.log('Found .env file at:', rootEnvPath);

    // Read the file
    const envContent = fs.readFileSync(rootEnvPath, 'utf8');
    
    // Parse the environment variables
    const envVars: Record<string, string> = {};
    
    envContent.split('\n').forEach(line => {
      // Skip comments and empty lines
      if (line.startsWith('#') || !line.trim()) {
        return;
      }
      
      // Extract key and value
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }
        
        envVars[key] = value;
      }
    });
    
    // Cache the result
    envCache = envVars;
    
    return envVars;
  } catch (error) {
    console.error('Error loading root .env file:', error);
    return {};
  }
}

/**
 * Get an environment variable from the root .env file
 */
export function getRootEnv(key: string): string | undefined {
  const envVars = loadEnvFromRoot();
  return envVars[key];
}
