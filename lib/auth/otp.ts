// In-memory OTP + user stores. Replace with a database in production.
import { randomInt } from 'crypto'

interface OtpEntry {
  code: string
  expiresAt: number
  attempts: number
}

interface AuthUser {
  id: string
  phoneNumber: string
  createdAt: number
}

const OTP_TTL_MS = 5 * 60 * 1000
const MAX_OTP_ATTEMPTS = 5

const otpStore = new Map<string, OtpEntry>()
const userStore = new Map<string, AuthUser>()

export function normalizePhoneNumber(phoneNumber: string): string {
  return phoneNumber.replace(/[^\d+]/g, '')
}

export function generateAndStoreOtp(phoneNumber: string): string {
  const code = randomInt(100000, 999999).toString()
  otpStore.set(phoneNumber, { code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 })
  return code
}

export type OtpVerificationResult = 'valid' | 'invalid' | 'expired' | 'too_many_attempts'

export function verifyOtp(phoneNumber: string, submittedCode: string): OtpVerificationResult {
  const entry = otpStore.get(phoneNumber)
  if (!entry) return 'invalid'

  if (entry.expiresAt < Date.now()) {
    otpStore.delete(phoneNumber)
    return 'expired'
  }

  if (entry.attempts >= MAX_OTP_ATTEMPTS) {
    otpStore.delete(phoneNumber)
    return 'too_many_attempts'
  }

  if (entry.code !== submittedCode) {
    entry.attempts += 1
    return 'invalid'
  }

  otpStore.delete(phoneNumber)
  return 'valid'
}

export function getOrCreateUser(phoneNumber: string): AuthUser {
  const existing = userStore.get(phoneNumber)
  if (existing) return existing

  const user: AuthUser = {
    id: `user_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    phoneNumber,
    createdAt: Date.now(),
  }
  userStore.set(phoneNumber, user)
  return user
}

export async function sendOtpSms(phoneNumber: string, code: string): Promise<void> {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    // No SMS provider configured — log so local/dev flows remain usable.
    console.warn(`[auth] SMS provider not configured. OTP for ${phoneNumber}: ${code}`)
    return
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: phoneNumber,
        From: TWILIO_FROM_NUMBER,
        Body: `Your Aframp verification code is ${code}. It expires in 5 minutes.`,
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to send OTP SMS: ${response.status}`)
  }
}
