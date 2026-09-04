import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const response = await fetch(`${BASE_URL}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const text = await response.text()

    if (!response.ok) {
      let message = `Request failed (${response.status})`
      try {
        const parsed = JSON.parse(text) as { error?: string }
        if (parsed.error) message = parsed.error
      } catch {}
      return NextResponse.json({ error: message }, { status: response.status })
    }

    const data = JSON.parse(text) as { token: string; user_id: string; merchant_id: string | null }

    const cookieStore = await cookies()
    cookieStore.set('session_token', data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400, // 24 hours
      path: '/',
    })

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
