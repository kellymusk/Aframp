import { isValidStellarAddress, validateStellarAddress } from '@/lib/stellar-address'

// A real, well-known mainnet address (Stellar Development Foundation).
const VALID_ADDRESS = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H'

describe('isValidStellarAddress', () => {
  it('accepts a real, checksum-valid address', () => {
    expect(isValidStellarAddress(VALID_ADDRESS)).toBe(true)
  })

  it('rejects an address with a corrupted checksum (one char flipped)', () => {
    const corrupted = VALID_ADDRESS.slice(0, -1) + (VALID_ADDRESS.endsWith('H') ? 'I' : 'H')
    expect(isValidStellarAddress(corrupted)).toBe(false)
  })

  it('rejects an address that is too short', () => {
    expect(isValidStellarAddress(VALID_ADDRESS.slice(0, -1))).toBe(false)
  })

  it('rejects an address that is too long', () => {
    expect(isValidStellarAddress(`${VALID_ADDRESS}A`)).toBe(false)
  })

  it('rejects a secret seed (S-prefixed) in place of a public address', () => {
    expect(isValidStellarAddress(`S${VALID_ADDRESS.slice(1)}`)).toBe(false)
  })

  it('rejects a lowercase address', () => {
    expect(isValidStellarAddress(VALID_ADDRESS.toLowerCase())).toBe(false)
  })

  it('rejects non-base32 characters', () => {
    expect(isValidStellarAddress(`G${'1'.repeat(55)}`)).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isValidStellarAddress('')).toBe(false)
  })
})

describe('validateStellarAddress', () => {
  it('returns undefined for a valid address', () => {
    expect(validateStellarAddress(VALID_ADDRESS)).toBeUndefined()
  })

  it('returns undefined for a valid address with surrounding whitespace', () => {
    expect(validateStellarAddress(`  ${VALID_ADDRESS}  `)).toBeUndefined()
  })

  it('reports a required-field message for an empty value', () => {
    expect(validateStellarAddress('')).toMatch(/required/i)
  })

  it('reports a specific message for a non-G prefix', () => {
    expect(validateStellarAddress(`S${VALID_ADDRESS.slice(1)}`)).toMatch(/start with G/i)
  })

  it('reports a specific message for the wrong length', () => {
    expect(validateStellarAddress(VALID_ADDRESS.slice(0, -1))).toMatch(/56 characters/i)
  })

  it('reports a generic invalid message for a bad checksum', () => {
    const corrupted = VALID_ADDRESS.slice(0, -1) + (VALID_ADDRESS.endsWith('H') ? 'I' : 'H')
    expect(validateStellarAddress(corrupted)).toBe('Invalid Stellar address')
  })
})
