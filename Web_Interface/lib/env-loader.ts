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
    // First try the absolute path (most reliable)
    let rootEnvPath = 'E:/Plank pushers/Core-Social-Infrastructure/.env';
    console.log('Trying to load .env from absolute path:', rootEnvPath);
    
    // If not found, try the current directory
    if (!fs.existsSync(rootEnvPath)) {
      rootEnvPath = path.resolve(process.cwd(), '.env');
      console.log('Not found, trying current directory:', rootEnvPath);
    }
    
    // If not found, try one level up (in case we're in the Web_Interface directory)
    if (!fs.existsSync(rootEnvPath)) {
      rootEnvPath = path.resolve(process.cwd(), '../.env');
      console.log('Not found, trying one level up:', rootEnvPath);
    }
    
    // If still not found, try two levels up
    if (!fs.existsSync(rootEnvPath)) {
      rootEnvPath = path.resolve(process.cwd(), '../../.env');
      console.log('Not found, trying two levels up:', rootEnvPath);
    }
    
    // Check if the file exists
    if (!fs.existsSync(rootEnvPath)) {
      console.error('Root .env file not found at any location. Last tried:', rootEnvPath);
      return {};
    }
    
    console.log('Found .env file at:', rootEnvPath);

    // Read the file
    const envContent = fs.readFileSync(rootEnvPath, 'utf8');
    console.log(`Read .env file, content length: ${envContent.length} characters`);
    
    // Parse the environment variables
    const envVars: Record<string, string> = {};
    
    // Debug: Count lines in the file
    const lines = envContent.split('\n');
    console.log(`Total lines in .env file: ${lines.length}`);
    
    let parsedCount = 0;
    let commentCount = 0;
    let emptyCount = 0;
    
    lines.forEach((line, index) => {
      // Skip comments and empty lines
      if (line.startsWith('#')) {
        commentCount++;
        return;
      }
      
      if (!line.trim()) {
        emptyCount++;
        return;
      }
      
      try {
        // More robust approach to parsing .env lines
        // First, find the position of the first equals sign
        const equalsPos = line.indexOf('=');
        
        // If there's no equals sign, skip this line
        if (equalsPos === -1) {
          console.log(`Line ${index + 1} has no equals sign: ${line.substring(0, 20)}...`);
          return;
        }
        
        // Extract key and value based on the position of the equals sign
        const key = line.substring(0, equalsPos).trim();
        let value = line.substring(equalsPos + 1).trim();
        
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }
        
        // Store the key-value pair
        envVars[key] = value;
        parsedCount++;
        
        // Debug: Log the first few characters of each value
        const valuePreview = value.length > 10 ? 
          `${value.substring(0, 2)}...${value.substring(value.length - 2)}` : 
          '(short value)';
        console.log(`Parsed env var at line ${index + 1}: ${key}=${valuePreview}, length=${value.length}`);
      } catch (error: any) {
        console.error(`Error parsing line ${index + 1}: ${error?.message || 'Unknown error'}`);
        console.log(`Problematic line content: ${line.substring(0, 20)}...`);
      }
    });
    
    console.log(`Env parsing summary: ${parsedCount} variables parsed, ${commentCount} comments, ${emptyCount} empty lines`);
    
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
