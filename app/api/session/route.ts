import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'aframp.session'
const COOKIE_MAX_AGE = 60 * 60 * 24 // 24 hours, matching JWT expiry

export async function GET() {
  const cookieStore = await cookies()
  const value = cookieStore.get(COOKIE_NAME)?.value
  if (!value) return NextResponse.json(null)
  try {
    return NextResponse.json(JSON.parse(value))
  } catch {
    return NextResponse.json(null)
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
    // #867: lets the client warn before the 24h token expires.
    expiresAt: Date.now() + COOKIE_MAX_AGE * 1000,
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
