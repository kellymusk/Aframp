import { resolveBackendUrl } from '@/lib/config/backend-url.mjs'

describe('resolveBackendUrl (NEXT_API_URL)', () => {
  it('accepts an absolute https URL', () => {
    expect(resolveBackendUrl('https://api.example.com')).toBe('https://api.example.com')
  })

  it('accepts an absolute http URL', () => {
    expect(resolveBackendUrl('http://api.internal:8000')).toBe('http://api.internal:8000')
  })

  it.each([undefined, '', '   ', '""'])('has no default when unset (%p)', (raw) => {
    expect(resolveBackendUrl(raw)).toBeNull()
  })

  it('strips trailing slashes', () => {
    expect(resolveBackendUrl('https://api.example.com//')).toBe('https://api.example.com')
  })

  it('assumes https for a bare host pasted into a dashboard', () => {
    expect(resolveBackendUrl('api.example.com')).toBe('https://api.example.com')
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
