/**
 * POST /api/session
 *
 * Validates a bearer token against the backend /me endpoint, then writes an
 * httpOnly session cookie containing only the server-confirmed identity — no
 * client-supplied userId or merchantId is trusted (#1132).
 *
 * DELETE /api/session
 *
 * Expires the session cookie.
 */

import { NextResponse, type NextRequest } from 'next/server'

// No default: the backend origin is deployment configuration (set NEXT_API_URL).
const BACKEND_URL = process.env.NEXT_API_URL?.trim().replace(/\/+$/, '') || null

/** Name of the httpOnly session cookie. */
const SESSION_COOKIE = 'aframp_session'

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24, // 24 h, matches token TTL
}

export async function POST(request: NextRequest) {
  // --- 1. Parse body safely ---
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as Record<string, unknown>).token !== 'string' ||
    !(body as Record<string, unknown>).token
  ) {
    return NextResponse.json({ error: 'token is required.' }, { status: 400 })
  }

  const token = (body as Record<string, string>).token

  // --- 2. Validate the token server-side by calling the backend /me ---
  if (!BACKEND_URL) {
    return NextResponse.json({ error: 'The backend is not configured.' }, { status: 503 })
  }
  let meResponse: Response
  try {
    meResponse = await fetch(`${BACKEND_URL}/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Could not reach the authentication server.' },
      { status: 502 }
    )
  }

  if (!meResponse.ok) {
    const status = meResponse.status === 401 ? 401 : 400
    return NextResponse.json({ error: 'Token is invalid or expired.' }, { status })
  }

  let me: { user_id: string; merchant_id: string | null; is_admin: boolean }
  try {
    me = (await meResponse.json()) as {
      user_id: string
      merchant_id: string | null
      is_admin: boolean
    }
  } catch {
    return NextResponse.json(
      { error: 'Unexpected response from authentication server.' },
      { status: 502 }
    )
  }

  // --- 3. Write the cookie with server-confirmed identity only ---
  const payload = JSON.stringify({
    token,
    userId: me.user_id,
    merchantId: me.merchant_id ?? null,
    isAdmin: me.is_admin === true,
  })

  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, payload, COOKIE_OPTS)
  return response
}

export function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, '', { ...COOKIE_OPTS, maxAge: 0 })
  return response
}
