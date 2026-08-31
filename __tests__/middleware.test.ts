import { NextRequest } from 'next/server'
import { middleware } from '../middleware'

const ORIGINAL_ENV = process.env

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

afterAll(() => {
  process.env = ORIGINAL_ENV
})

describe('middleware Content-Security-Policy (#480)', () => {
  it('sets a script-src nonce that differs on every request', () => {
    const cspA = middleware(new NextRequest('https://aframp.example/')).headers.get(
      'Content-Security-Policy'
    )
    const cspB = middleware(new NextRequest('https://aframp.example/')).headers.get(
      'Content-Security-Policy'
    )

    const nonceA = cspA?.match(/'nonce-([^']+)'/)?.[1]
    const nonceB = cspB?.match(/'nonce-([^']+)'/)?.[1]

    expect(nonceA).toBeTruthy()
    expect(nonceB).toBeTruthy()
    expect(nonceA).not.toBe(nonceB)
  })

  it('does not use unsafe-inline for script-src', () => {
    const csp = middleware(new NextRequest('https://aframp.example/')).headers.get(
      'Content-Security-Policy'
    )
    const scriptSrc = csp?.split(';').find((d) => d.trim().startsWith('script-src'))

    expect(scriptSrc).toBeDefined()
    expect(scriptSrc).not.toContain('unsafe-inline')
    expect(scriptSrc).toContain("'strict-dynamic'")
  })

  it('forwards the nonce as a request header for Server Components to read', () => {
    const response = middleware(new NextRequest('https://aframp.example/'))
    const forwardedNonce = response.headers.get('x-middleware-request-x-nonce')
    const cspNonce = response.headers
      .get('Content-Security-Policy')
      ?.match(/'nonce-([^']+)'/)?.[1]

    expect(forwardedNonce).toBe(cspNonce)
  })

  it('points report-uri at the Sentry security endpoint when a DSN is configured', () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://publickey123@o12345.ingest.us.sentry.io/67890'

    const csp = middleware(new NextRequest('https://aframp.example/')).headers.get(
      'Content-Security-Policy'
    )

    expect(csp).toContain(
      'report-uri https://o12345.ingest.us.sentry.io/api/67890/security/?sentry_key=publickey123'
    )
  })

  it('omits report-uri when no Sentry DSN is configured', () => {
    delete process.env.NEXT_PUBLIC_SENTRY_DSN

    const csp = middleware(new NextRequest('https://aframp.example/')).headers.get(
      'Content-Security-Policy'
    )

    expect(csp).not.toContain('report-uri')
  })

  it('does not allow unsafe-eval outside development', () => {
    const csp = middleware(new NextRequest('https://aframp.example/')).headers.get(
      'Content-Security-Policy'
    )

    expect(process.env.NODE_ENV).not.toBe('development')
    expect(csp).not.toContain('unsafe-eval')
  })

  it('allows unsafe-eval in development only, for Fast Refresh', () => {
    process.env.NODE_ENV = 'development'

    const csp = middleware(new NextRequest('https://aframp.example/')).headers.get(
      'Content-Security-Policy'
    )
    const scriptSrc = csp?.split(';').find((d) => d.trim().startsWith('script-src'))

    expect(scriptSrc).toContain('unsafe-eval')
  })

  it('keeps the rest of the policy intact', () => {
    const csp = middleware(new NextRequest('https://aframp.example/')).headers.get(
      'Content-Security-Policy'
    )

    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("form-action 'self'")
  })
})
