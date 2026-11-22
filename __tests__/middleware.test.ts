/**
 * Tests for the CSP nonce middleware (#632).
 *
 * Verifies that:
 *  - Every response carries a Content-Security-Policy header.
 *  - The CSP does NOT contain 'unsafe-inline' for script-src.
 *  - The CSP contains a nonce directive.
 *  - The nonce is forwarded in the x-nonce response header.
 *  - Each request gets a unique nonce.
 */

import { NextRequest } from 'next/server'
import { middleware } from '../middleware'

function makeRequest(path = '/') {
  return new NextRequest(new URL(`http://localhost${path}`))
}

describe('CSP nonce middleware (#632)', () => {
  it('sets a Content-Security-Policy response header', async () => {
    const res = await middleware(makeRequest('/'))
    expect(res.headers.get('content-security-policy')).not.toBeNull()
  })

  it('does NOT include unsafe-inline in script-src', async () => {
    const res = await middleware(makeRequest('/'))
    const csp = res.headers.get('content-security-policy') ?? ''
    // Extract the script-src directive specifically.
    const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src'))
    expect(scriptSrc).toBeDefined()
    expect(scriptSrc).not.toContain('unsafe-inline')
  })

  it('includes a nonce in script-src', async () => {
    const res = await middleware(makeRequest('/'))
    const csp = res.headers.get('content-security-policy') ?? ''
    const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src'))
    expect(scriptSrc).toMatch(/'nonce-[A-Za-z0-9_-]+'/)
  })

  it('forwards the nonce in the x-nonce response header', async () => {
    const res = await middleware(makeRequest('/'))
    const nonce = res.headers.get('x-nonce')
    expect(nonce).toBeTruthy()
    // Nonce must be a non-empty base64url string.
    expect(nonce).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('nonce in x-nonce matches nonce in CSP script-src', async () => {
    const res = await middleware(makeRequest('/'))
    const nonce = res.headers.get('x-nonce') ?? ''
    const csp = res.headers.get('content-security-policy') ?? ''
    expect(csp).toContain(`'nonce-${nonce}'`)
  })

  it('generates a unique nonce per request', async () => {
    const [res1, res2] = await Promise.all([
      middleware(makeRequest('/')),
      middleware(makeRequest('/dashboard')),
    ])
    const nonce1 = res1.headers.get('x-nonce')
    const nonce2 = res2.headers.get('x-nonce')
    expect(nonce1).not.toBe(nonce2)
  })

  it('still sets other security headers', async () => {
    const res = await middleware(makeRequest('/'))
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('x-frame-options')).toBe('DENY')
    expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
  })

  describe('style-src (#1176)', () => {
    const original = process.env.CSP_STRICT_STYLES
    afterEach(() => {
      if (original === undefined) delete process.env.CSP_STRICT_STYLES
      else process.env.CSP_STRICT_STYLES = original
    })

    it("keeps 'unsafe-inline' for styles by default", async () => {
      delete process.env.CSP_STRICT_STYLES
      const res = await middleware(makeRequest('/'))
      const csp = res.headers.get('content-security-policy') ?? ''
      const styleSrc = csp.split(';').find((d) => d.trim().startsWith('style-src '))
      expect(styleSrc).toContain("'unsafe-inline'")
    })

    it('uses a nonce instead of unsafe-inline when CSP_STRICT_STYLES=true', async () => {
      process.env.CSP_STRICT_STYLES = 'true'
      const res = await middleware(makeRequest('/'))
      const nonce = res.headers.get('x-nonce') ?? ''
      const csp = res.headers.get('content-security-policy') ?? ''
      const styleSrc = csp.split(';').find((d) => d.trim().startsWith('style-src '))
      expect(styleSrc).toContain(`'nonce-${nonce}'`)
      expect(styleSrc).not.toContain('unsafe-inline')
    })
  })
})
