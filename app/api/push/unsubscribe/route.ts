/**
 * DELETE /api/push/unsubscribe
 *
 * Removes a Web Push subscription for the authenticated user.
 *
 * Body: { userId: string, endpoint: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { removeSubscription } from '@/lib/notifications/push-subscriptions-store'

const bodySchema = z.object({
  userId: z.string().min(1),
  endpoint: z.string().url(),
})

export async function DELETE(request: NextRequest): Promise<NextResponse> {
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

  const { userId, endpoint } = parsed.data

  try {
    const removed = await removeSubscription(userId, endpoint)
    if (!removed) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }
    return NextResponse.json({ message: 'Subscription removed' }, { status: 200 })
  } catch (err) {
    console.error('[push/unsubscribe] Failed to remove subscription', err)
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 })
  }
}
