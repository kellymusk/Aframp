import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/lib/security/csrf'

/** Reads the CSRF token cookie set by middleware (readable, non-httpOnly by design). */
export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE_NAME}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

/** Header object to spread into fetch() calls for state-changing requests. */
export function csrfHeaders(): Record<string, string> {
  const token = getCsrfToken()
  return token ? { [CSRF_HEADER_NAME]: token } : {}
}
