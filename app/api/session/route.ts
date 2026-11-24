import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { SESSION_COOKIE_NAME as COOKIE_NAME } from '@/lib/session-cookie'
const COOKIE_MAX_AGE = 60 * 60 * 24 // 24 hours, matching JWT expiry

/**
 * Presence check only. The bearer token lives in the httpOnly cookie and is
 * injected server-side by middleware.ts for `/backend/*` calls, so it must
 * never be echoed back to client JS (an XSS payload could exfiltrate it).
 */
export async function GET() {
  const cookieStore = await cookies()
  const value = cookieStore.get(COOKIE_NAME)?.value
  if (!value) return NextResponse.json({ authenticated: false })
  try {
    const parsed = JSON.parse(value) as { token?: string; userId?: string; merchantId?: string | null }
    if (!parsed.token || !parsed.userId) return NextResponse.json({ authenticated: false })
    return NextResponse.json({
      authenticated: true,
      userId: parsed.userId,
      merchantId: parsed.merchantId ?? null,
    })
  } catch {
    return NextResponse.json({ authenticated: false })
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    token?: string
    userId?: string
    merchantId?: string | null
  }

  if (!body.token || !body.userId) {
    return NextResponse.json({ error: 'token and userId are required' }, { status: 400 })
  }

  const payload = JSON.stringify({
    token: body.token,
    userId: body.userId,
    merchantId: body.merchantId ?? null,
  })

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, payload, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
  return NextResponse.json({ ok: true })
}
