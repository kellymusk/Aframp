/**
 * POST /api/push/subscribe
 *
 * Saves a Web Push subscription for the authenticated user.
 *
 * Body: { userId: string, subscription: PushSubscriptionJSON }
 *
 * In production, extract userId from a verified session / JWT instead of
 * accepting it in the request body.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { saveSubscription } from '@/lib/notifications/push-subscriptions-store'

// PushSubscriptionJSON shape
const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})

const bodySchema = z.object({
  /** Authenticated user ID. In production, derive from session. */
  userId: z.string().min(1),
  subscription: subscriptionSchema,
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

  const { userId, subscription } = parsed.data

  try {
    const stored = await saveSubscription(userId, subscription)
    return NextResponse.json(
      { message: 'Subscription saved', endpoint: stored.subscription.endpoint },
      { status: 200 }
    )
  } catch (err) {
    console.error('[push/subscribe] Failed to save subscription', err)
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
  }
}
