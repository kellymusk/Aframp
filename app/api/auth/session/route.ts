import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '')

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session_token')?.value

    if (!token) {
      return NextResponse.json({ session: null })
    }

    // Validate token by calling /me endpoint
    const response = await fetch(`${BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) {
      // Token is invalid or expired
      if (response.status === 401) {
        cookieStore.delete('session_token')
      }
      return NextResponse.json({ session: null })
    }

    const meData = await response.json()
    return NextResponse.json({
      session: {
        token,
        userId: meData.user_id,
        merchantId: meData.merchant_id,
      },
    })
  } catch (error) {
    return NextResponse.json({ session: null })
  }
}
