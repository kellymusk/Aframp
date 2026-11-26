import { getPasswordStrength, isCommonPassword, MIN_PASSWORD_STRENGTH } from './password'

describe('getPasswordStrength', () => {
  it.each(['bbbbbbbb', 'aaaaaaaaaaaa', 'abcdefgh'])('rejects weak password %s', (password) => {
    expect(getPasswordStrength(password)).toBeLessThan(MIN_PASSWORD_STRENGTH)
  })

  it('accepts a sufficiently long password with varied character classes', () => {
    expect(getPasswordStrength('V3ry$ecret!Passphrase')).toBeGreaterThanOrEqual(
      MIN_PASSWORD_STRENGTH
    )
  })
})

describe('isCommonPassword', () => {
  const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
  const digest = jest.fn()
  const fetchMock = jest.spyOn(globalThis, 'fetch')

  beforeAll(() => {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: { subtle: { digest } },
    })
  })

  beforeEach(() => {
    digest.mockResolvedValue(new Uint8Array(20).buffer)
    fetchMock.mockReset()
  })

  afterAll(() => {
    if (cryptoDescriptor) {
      Object.defineProperty(globalThis, 'crypto', cryptoDescriptor)
    } else {
      Reflect.deleteProperty(globalThis, 'crypto')
    }
    fetchMock.mockRestore()
  })

  it('checks a breached-password hash suffix from the range response', async () => {
    fetchMock.mockResolvedValue(new Response(`${'0'.repeat(35)}:123\nOTHERHASH:2`, { status: 200 }))

    await expect(isCommonPassword('not-a-real-password')).resolves.toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/api\.pwnedpasswords\.com\/range\/[A-F0-9]{5}$/),
      expect.objectContaining({ headers: { 'Add-Padding': 'true' }, cache: 'no-store' })
    )
  })

  it('does not treat a non-matching suffix as breached', async () => {
    fetchMock.mockResolvedValue(new Response('OTHERHASH:2', { status: 200 }))

    await expect(isCommonPassword('not-a-real-password')).resolves.toBe(false)
  })

  it('fails closed when the breach-check service is unavailable', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))

    await expect(isCommonPassword('not-a-real-password')).rejects.toThrow(
      'Unable to check whether this password has been exposed.'
    )
  })
})
