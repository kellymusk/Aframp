import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateAndStoreOtp, normalizePhoneNumber, sendOtpSms } from '@/lib/auth/otp'

const bodySchema = z.object({
  phoneNumber: z.string().min(10, 'A valid phone number is required'),
})

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
  const code = generateAndStoreOtp(phoneNumber)

  try {
    await sendOtpSms(phoneNumber, code)
  } catch (error) {
    console.error('Failed to send OTP SMS', error)
    return NextResponse.json({ error: 'Unable to send verification code' }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
