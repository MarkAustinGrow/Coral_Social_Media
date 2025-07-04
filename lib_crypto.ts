// lib/crypto.ts
import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
const ALGORITHM = 'aes-256-gcm'

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be exactly 32 characters long')
}

export interface EncryptedData {
  encrypted: string
  iv: string
  tag: string
}

/**
 * Encrypts a string using AES-256-GCM
 */
export function encrypt(text: string): EncryptedData {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY)
  cipher.setAAD(Buffer.from('coral-social-media', 'utf8'))
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const tag = cipher.getAuthTag()
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  }
}

/**
 * Decrypts an encrypted string using AES-256-GCM
 */
export function decrypt(encryptedData: EncryptedData): string {
  const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY)
  decipher.setAAD(Buffer.from('coral-social-media', 'utf8'))
  decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'))
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

/**
 * Encrypts an API key for storage in the database
 */
export function encryptApiKey(apiKey: string): string {
  const encrypted = encrypt(apiKey)
  return JSON.stringify(encrypted)
}

/**
 * Decrypts an API key from the database
 */
export function decryptApiKey(encryptedApiKey: string): string {
  try {
    const encryptedData: EncryptedData = JSON.parse(encryptedApiKey)
    return decrypt(encryptedData)
  } catch (error) {
    throw new Error('Failed to decrypt API key')
  }
}

/**
 * Generates a secure random string for API keys or tokens
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Hashes a password using bcrypt-like approach with crypto
 */
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, actualSalt, 10000, 64, 'sha512').toString('hex')
  
  return { hash, salt: actualSalt }
}

/**
 * Verifies a password against a hash
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const { hash: newHash } = hashPassword(password, salt)
  return newHash === hash
}

/**
 * Creates a masked version of an API key for display
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) return '***'
  
  const start = apiKey.substring(0, 4)
  const end = apiKey.substring(apiKey.length - 4)
  const middle = '*'.repeat(Math.max(0, apiKey.length - 8))
  
  return `${start}${middle}${end}`
}

/**
 * Validates API key format for different services
 */
export function validateApiKeyFormat(service: string, apiKey: string): boolean {
  const patterns = {
    openai: /^sk-[a-zA-Z0-9]{48}$/,
    twitter_bearer: /^[a-zA-Z0-9%]{100,}$/,
    twitter_api_key: /^[a-zA-Z0-9]{25}$/,
    twitter_api_secret: /^[a-zA-Z0-9]{50}$/,
    twitter_access_token: /^[0-9]+-[a-zA-Z0-9]{40}$/,
    twitter_access_secret: /^[a-zA-Z0-9]{45}$/
  }
  
  const pattern = patterns[service as keyof typeof patterns]
  return pattern ? pattern.test(apiKey) : true // Allow unknown services
}

/**
 * Sanitizes API key input
 */
export function sanitizeApiKey(apiKey: string): string {
  return apiKey.trim().replace(/\s+/g, '')
}
