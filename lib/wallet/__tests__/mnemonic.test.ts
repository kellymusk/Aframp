import { generateMnemonic, validateMnemonic, mnemonicToSeed, clearMnemonic } from '../mnemonic'

describe('Mnemonic utilities', () => {
  describe('generateMnemonic', () => {
    it('should generate 12 words', () => {
      const mnemonic = generateMnemonic()
      expect(mnemonic).toHaveLength(12)
    })

    it('should generate unique mnemonics', () => {
      const mnemonic1 = generateMnemonic()
      const mnemonic2 = generateMnemonic()
      expect(mnemonic1.join(' ')).not.toBe(mnemonic2.join(' '))
    })

    it('should only contain valid words', () => {
      const mnemonic = generateMnemonic()
      mnemonic.forEach((word) => {
        expect(typeof word).toBe('string')
        expect(word.length).toBeGreaterThan(0)
      })
    })
  })

  describe('validateMnemonic', () => {
    it('should validate correct 12-word mnemonic', () => {
      const mnemonic = generateMnemonic()
      expect(validateMnemonic(mnemonic)).toBe(true)
    })

    it('should validate string format', () => {
      const mnemonic = generateMnemonic()
      expect(validateMnemonic(mnemonic.join(' '))).toBe(true)
    })

    it('should reject invalid word count', () => {
      expect(validateMnemonic(['word1', 'word2'])).toBe(false)
      expect(validateMnemonic(Array(13).fill('abandon'))).toBe(false)
    })

    it('should accept valid word counts', () => {
      const validCounts = [12, 15, 18, 21, 24]
      validCounts.forEach((count) => {
        const mnemonic = Array(count).fill('abandon')
        expect(validateMnemonic(mnemonic)).toBe(true)
      })
    })
  })

  describe('mnemonicToSeed', () => {
    // Skip in Node.js test environment - this function is meant for browser use
    it.skip('should generate a seed from mnemonic', async () => {
      const mnemonic = generateMnemonic()
      const seed = await mnemonicToSeed(mnemonic)
      expect(typeof seed).toBe('string')
      expect(seed.length).toBe(64) // SHA-256 produces 64 hex characters
    })

    it.skip('should generate consistent seeds', async () => {
      const mnemonic = [
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
      ]
      const seed1 = await mnemonicToSeed(mnemonic)
      const seed2 = await mnemonicToSeed(mnemonic)
      expect(seed1).toBe(seed2)
    })
  })

  describe('clearMnemonic', () => {
    it('should clear mnemonic array', () => {
      const mnemonic = generateMnemonic()
      clearMnemonic(mnemonic)
      expect(mnemonic).toHaveLength(0)
    })
  })
})
