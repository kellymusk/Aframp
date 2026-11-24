import { readSessionToken } from '../session-cookie'

describe('readSessionToken', () => {
  it('returns the token from a valid cookie value', () => {
    expect(readSessionToken(JSON.stringify({ token: 'jwt', userId: 'u' }))).toBe('jwt')
  })

  it.each([undefined, '', 'not-json', '{}', '{"token":""}', '{"token":5}'])(
    'returns null for %p',
    (raw) => {
      expect(readSessionToken(raw)).toBeNull()
    }
  )
})
