import {
  API_KEY_EXPIRY_OPTIONS,
  describeScopes,
  expiryFromOption,
  isApiKeyExpired,
} from '../api-key-scopes'

const NOW = new Date('2026-10-01T00:00:00.000Z')

describe('expiryFromOption', () => {
  it('returns null for keys that never expire', () => {
    expect(expiryFromOption('never', NOW)).toBeNull()
  })

  it('adds the option’s days to now', () => {
    expect(expiryFromOption('30', NOW)).toBe('2026-10-31T00:00:00.000Z')
    expect(expiryFromOption('365', NOW)).toBe('2027-10-01T00:00:00.000Z')
  })

  it('treats an unknown option as never expiring', () => {
    expect(expiryFromOption('bogus', NOW)).toBeNull()
  })

  it('offers a never-expiring option first', () => {
    expect(API_KEY_EXPIRY_OPTIONS[0]).toMatchObject({ value: 'never', days: null })
  })
})

describe('isApiKeyExpired', () => {
  it('is false for keys without an expiry', () => {
    expect(isApiKeyExpired({ expires_at: null }, NOW)).toBe(false)
  })

  it('is true once the expiry has passed', () => {
    expect(isApiKeyExpired({ expires_at: '2026-09-30T23:59:59Z' }, NOW)).toBe(true)
    expect(isApiKeyExpired({ expires_at: NOW.toISOString() }, NOW)).toBe(true)
  })

  it('is false for a future expiry or an unparseable date', () => {
    expect(isApiKeyExpired({ expires_at: '2026-10-02T00:00:00Z' }, NOW)).toBe(false)
    expect(isApiKeyExpired({ expires_at: 'not a date' }, NOW)).toBe(false)
  })
})

describe('describeScopes', () => {
  it('reports full access for legacy keys without scopes', () => {
    expect(describeScopes(undefined)).toEqual(['Full access'])
    expect(describeScopes([])).toEqual(['Full access'])
  })

  it('lists scope labels in a stable order', () => {
    expect(describeScopes(['payouts', 'read'])).toEqual(['Read', 'Payouts'])
  })
})
