import { resolveBackendUrl } from '@/lib/config/backend-url.mjs'

describe('resolveBackendUrl (NEXT_API_URL)', () => {
  it('accepts an absolute https URL', () => {
    expect(resolveBackendUrl('https://api.example.com')).toBe('https://api.example.com')
  })

  it('accepts an absolute http URL', () => {
    expect(resolveBackendUrl('http://localhost:8000')).toBe('http://localhost:8000')
  })

  it.each([undefined, '', '   '])('falls back to the local backend when unset (%p)', (raw) => {
    expect(resolveBackendUrl(raw)).toBe('http://127.0.0.1:3000')
  })

  it('strips trailing slashes', () => {
    expect(resolveBackendUrl('https://api.example.com//')).toBe('https://api.example.com')
  })

  it('assumes https for a bare host pasted into a dashboard', () => {
    expect(resolveBackendUrl('aframp-backend.up.railway.app')).toBe(
      'https://aframp-backend.up.railway.app'
    )
  })

  it.each(['"https://api.example.com"', "'https://api.example.com'", ' "api.example.com" '])(
    'unwraps a quoted value %p',
    (raw) => {
      expect(resolveBackendUrl(raw)).toBe('https://api.example.com')
    }
  )

  it('rejects a non-http(s) protocol', () => {
    expect(() => resolveBackendUrl('ftp://api.example.com')).toThrow(/must use http or https/)
  })

  it('rejects a malformed URL', () => {
    expect(() => resolveBackendUrl('not a url')).toThrow(/not a valid URL/)
  })
})
