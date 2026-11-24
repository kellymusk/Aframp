export const SESSION_COOKIE_NAME = 'aframp.session'

/** Extracts the bearer token from the raw httpOnly session cookie value. Server-side only. */
export function readSessionToken(raw: string | undefined): string | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { token?: unknown }
    return typeof parsed.token === 'string' && parsed.token ? parsed.token : null
  } catch {
    return null
  }
}
