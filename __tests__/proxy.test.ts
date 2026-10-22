/**
 * Tests for the CSP nonce proxy (#632, migrated from middleware.ts).
 *
 * Verifies that:
 *  - Every response carries a Content-Security-Policy header.
 *  - The CSP does NOT contain 'unsafe-inline' for script-src.
 *  - The CSP contains a nonce directive.
 *  - The nonce is forwarded in the x-nonce response header.
 *  - Each request gets a unique nonce.
 */

import { NextRequest } from 'next/server'
import { proxy } from '../proxy'

function makeRequest(path = '/') {
  return new NextRequest(new URL(`http://localhost${path}`))
}

describe('CSP nonce proxy (#632)', () => {
  it('sets a Content-Security-Policy response header', async () => {
    const res = await proxy(makeRequest('/'))
    expect(res.headers.get('content-security-policy')).not.toBeNull()
  })

  it('does NOT include unsafe-inline in script-src', async () => {
    const res = await proxy(makeRequest('/'))
    const csp = res.headers.get('content-security-policy') ?? ''
    // Extract the script-src directive specifically.
    const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src'))
    expect(scriptSrc).toBeDefined()
    expect(scriptSrc).not.toContain('unsafe-inline')
  })

  it('includes a nonce in script-src', async () => {
    const res = await proxy(makeRequest('/'))
    const csp = res.headers.get('content-security-policy') ?? ''
    const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src'))
    expect(scriptSrc).toMatch(/'nonce-[A-Za-z0-9_-]+'/)
  })

  it('forwards the nonce in the x-nonce response header', async () => {
    const res = await proxy(makeRequest('/'))
    const nonce = res.headers.get('x-nonce')
    expect(nonce).toBeTruthy()
    // Nonce must be a non-empty base64url string.
    expect(nonce).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('nonce in x-nonce matches nonce in CSP script-src', async () => {
    const res = await proxy(makeRequest('/'))
    const nonce = res.headers.get('x-nonce') ?? ''
    const csp = res.headers.get('content-security-policy') ?? ''
    expect(csp).toContain(`'nonce-${nonce}'`)
  })

  it('generates a unique nonce per request', async () => {
    const [res1, res2] = await Promise.all([
      proxy(makeRequest('/')),
      proxy(makeRequest('/dashboard')),
    ])
    const nonce1 = res1.headers.get('x-nonce')
    const nonce2 = res2.headers.get('x-nonce')
    expect(nonce1).not.toBe(nonce2)
  })

  it('still sets other security headers', async () => {
    const res = await proxy(makeRequest('/'))
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('x-frame-options')).toBe('DENY')
    expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
  })

  it('allows same-origin camera access for the QR scanner (#636)', async () => {
    const res = await proxy(makeRequest('/'))
    const policy = res.headers.get('permissions-policy') ?? ''
    expect(policy).toContain('camera=(self)')
    expect(policy).not.toContain('camera=()')
  })
})
