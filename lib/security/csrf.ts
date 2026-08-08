import { NextRequest } from 'next/server'

export const CSRF_COOKIE_NAME = 'aframp_csrf'
export const CSRF_HEADER_NAME = 'x-csrf-token'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/** Generates a cryptographically random CSRF token. */
export function generateCsrfToken(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

/**
 * Verifies a request against the double-submit cookie pattern: the token
 * sent in the `x-csrf-token` header must match the `aframp_csrf` cookie.
 * Safe methods are always allowed since they must not mutate state.
 */
export function verifyCsrfToken(request: NextRequest): boolean {
  if (SAFE_METHODS.has(request.method)) return true

  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value
  const headerToken = request.headers.get(CSRF_HEADER_NAME)

  return Boolean(cookieToken && headerToken && cookieToken === headerToken)
}
