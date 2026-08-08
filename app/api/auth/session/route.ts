/**
 * POST /api/auth/session
 *
 * Issues a session cookie after verifying the caller controls the Stellar
 * keypair for `publicKey` — they sign a server-defined challenge message
 * (over the public key + timestamp) with their wallet, and we verify that
 * signature with the Stellar SDK. The timestamp window limits replay.
 *
 * Request body:
 *   { publicKey: string, signature: string (base64), timestamp: number (ms) }
 *
 * Success 200: { userId: string }
 * Error 400: invalid request body
 * Error 401: signature verification failed
 *
 * DELETE /api/auth/session — clears the session cookie (logout).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Keypair, StrKey } from '@stellar/stellar-sdk'
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session'

const RequestSchema = z.object({
  publicKey: z.string().refine(StrKey.isValidEd25519PublicKey, { message: 'Invalid Stellar public key' }),
  signature: z.string().min(1),
  timestamp: z.number().int().positive(),
})

const CHALLENGE_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

function challengeMessage(publicKey: string, timestamp: number): string {
  return `Sign in to Aframp\naddress: ${publicKey}\ntimestamp: ${timestamp}`
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  const { publicKey, signature, timestamp } = parsed.data

  if (Math.abs(Date.now() - timestamp) > CHALLENGE_WINDOW_MS) {
    return NextResponse.json({ error: 'Challenge expired' }, { status: 401 })
  }

  const message = challengeMessage(publicKey, timestamp)

  let verified = false
  try {
    const keypair = Keypair.fromPublicKey(publicKey)
    verified = keypair.verify(Buffer.from(message), Buffer.from(signature, 'base64'))
  } catch {
    verified = false
  }

  if (!verified) {
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 })
  }

  const token = await createSessionToken(publicKey)

  const response = NextResponse.json({ userId: publicKey })
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24,
  })
  return response
}

export function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete(SESSION_COOKIE_NAME)
  return response
}
