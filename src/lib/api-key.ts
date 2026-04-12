import { randomBytes, createHash } from 'crypto'

const KEY_PREFIX = 'graft_'
const DISPLAY_LENGTH = 16 // How many chars to show in the UI

/**
 * generateApiKey
 * Creates a cryptographically secure API key.
 * Format: "graft_" + 48 random hex chars = 54 chars total
 * Example: graft_a3f9c2d1e8b7...
 *
 * The FULL key is returned to the user ONCE and never stored.
 */
export function generateApiKey(): string {
  return KEY_PREFIX + randomBytes(24).toString('hex')
}

/**
 * hashApiKey
 * SHA-256 hash of the full key.
 * This is what we store in the database for validation.
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

/**
 * getKeyPrefix
 * Returns the first N characters of the key for safe display.
 * e.g. "graft_a3f9c2d1" (safe to show, cannot regenerate the full key from this)
 */
export function getKeyPrefix(key: string): string {
  return key.substring(0, DISPLAY_LENGTH)
}

/**
 * validateKeyFormat
 * Quick sanity check before hashing.
 */
export function validateKeyFormat(key: string): boolean {
  return typeof key === 'string' && key.startsWith(KEY_PREFIX) && key.length >= 30
}
