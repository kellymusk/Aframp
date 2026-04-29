/**
 * Mnemonic generation and validation utilities
 * Uses a secure client-side implementation for BIP39 mnemonic phrases
 */

// Word list for BIP39 (first 100 words for demo - in production, use full 2048 word list)
const WORD_LIST = [
  'abandon',
  'ability',
  'able',
  'about',
  'above',
  'absent',
  'absorb',
  'abstract',
  'absurd',
  'abuse',
  'access',
  'accident',
  'account',
  'accuse',
  'achieve',
  'acid',
  'acoustic',
  'acquire',
  'across',
  'act',
  'action',
  'actor',
  'actress',
  'actual',
  'adapt',
  'add',
  'addict',
  'address',
  'adjust',
  'admit',
  'adult',
  'advance',
  'advice',
  'aerobic',
  'affair',
  'afford',
  'afraid',
  'again',
  'age',
  'agent',
  'agree',
  'ahead',
  'aim',
  'air',
  'airport',
  'aisle',
  'alarm',
  'album',
  'alcohol',
  'alert',
  'alien',
  'all',
  'alley',
  'allow',
  'almost',
  'alone',
  'alpha',
  'already',
  'also',
  'alter',
  'always',
  'amateur',
  'amazing',
  'among',
  'amount',
  'amused',
  'analyst',
  'anchor',
  'ancient',
  'anger',
  'angle',
  'angry',
  'animal',
  'ankle',
  'announce',
  'annual',
  'another',
  'answer',
  'antenna',
  'antique',
  'anxiety',
  'any',
  'apart',
  'apology',
  'appear',
  'apple',
  'approve',
  'april',
  'arch',
  'arctic',
  'area',
  'arena',
  'argue',
  'arm',
  'armed',
  'armor',
  'army',
  'around',
  'arrange',
  'arrest',
  'arrive',
  'arrow',
  'art',
  'artefact',
]

/**
 * Generate a cryptographically secure random 12-word mnemonic phrase
 * In production, this should use the full BIP39 word list and proper entropy
 */
export function generateMnemonic(): string[] {
  const words: string[] = []

  // Use crypto.getRandomValues for secure randomness
  const randomValues = new Uint32Array(12)
  crypto.getRandomValues(randomValues)

  for (let i = 0; i < 12; i++) {
    const index = randomValues[i] % WORD_LIST.length
    words.push(WORD_LIST[index])
  }

  return words
}

/**
 * Validate a mnemonic phrase
 * @param mnemonic - Array of words or space-separated string
 * @returns true if valid, false otherwise
 */
export function validateMnemonic(mnemonic: string[] | string): boolean {
  const words = Array.isArray(mnemonic) ? mnemonic : mnemonic.trim().split(/\s+/)

  // Check word count (12, 15, 18, 21, or 24 words)
  if (![12, 15, 18, 21, 24].includes(words.length)) {
    return false
  }

  // Check if all words are in the word list
  return words.every((word) => WORD_LIST.includes(word.toLowerCase()))
}

/**
 * Convert mnemonic to seed (placeholder - in production use proper BIP39 derivation)
 * @param mnemonic - Array of words
 * @returns Hex string seed
 */
export async function mnemonicToSeed(mnemonic: string[]): Promise<string> {
  const phrase = mnemonic.join(' ')
  const encoder = new TextEncoder()
  const data = encoder.encode(phrase)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Securely clear mnemonic from memory (best effort)
 * @param mnemonic - Array of words to clear
 */
export function clearMnemonic(mnemonic: string[]): void {
  for (let i = 0; i < mnemonic.length; i++) {
    mnemonic[i] = ''
  }
  mnemonic.length = 0
}
