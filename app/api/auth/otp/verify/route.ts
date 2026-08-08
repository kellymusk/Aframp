import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getOrCreateUser, normalizePhoneNumber, verifyOtp } from '@/lib/auth/otp'
import { createSessionToken, SESSION_COOKIE, SESSION_TTL_SECONDS } from '@/lib/auth/session'

const bodySchema = z.object({
  phoneNumber: z.string().min(10, 'A valid phone number is required'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
})

const ERROR_MESSAGES: Record<string, string> = {
  invalid: 'Incorrect verification code',
  expired: 'Verification code has expired. Please request a new one.',
  too_many_attempts: 'Too many incorrect attempts. Please request a new code.',
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const phoneNumber = normalizePhoneNumber(parsed.data.phoneNumber)
  const result = verifyOtp(phoneNumber, parsed.data.otp)

  if (result !== 'valid') {
    return NextResponse.json({ error: ERROR_MESSAGES[result] }, { status: 401 })
  }

  const user = getOrCreateUser(phoneNumber)
  const token = createSessionToken({ userId: user.id, phoneNumber })

  const response = NextResponse.json({ success: true, userId: user.id })
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
  return response
}
