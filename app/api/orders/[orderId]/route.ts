/**
 * /api/orders/[orderId] — read or update a single ramp order.
 *
 * Both handlers are ownership-scoped: the caller must pass the wallet address
 * the order was created with.  A mismatch returns 404 rather than 403 so the
 * endpoint cannot be used to probe which order ids exist.
 *
 * GET    Query: ?walletAddress=<address>
 *        200:   { order: StoredOrder }
 *        404:   unknown order, or not owned by that wallet
 *
 * PATCH  Body:  { walletAddress, status?, payload? }  — payload is merged
 *        200:   { order: StoredOrder }
 *        400:   invalid body
 *        404:   unknown order, or not owned by that wallet
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getOrder, toStoredOrder, updateOrder } from '@/lib/orders/order-store'
import { MAX_PAYLOAD_BYTES } from '@/lib/orders/types'

// Loose bound rather than isValidStellarAddress() — see app/api/orders/route.ts.
const WalletAddressSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/, 'Wallet address contains unsupported characters')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params

  const parsed = WalletAddressSchema.safeParse(request.nextUrl.searchParams.get('walletAddress'))
  if (!parsed.success) {
    return NextResponse.json({ error: 'walletAddress is required' }, { status: 400 })
  }

  const record = getOrder(orderId, parsed.data)
  if (!record) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  return NextResponse.json({ order: toStoredOrder(record) }, { status: 200 })
}

const PatchOrderSchema = z
  .object({
    walletAddress: WalletAddressSchema,
    status: z.string().trim().min(1).max(64).optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((value) => value.status !== undefined || value.payload !== undefined, {
    message: 'Provide status, payload, or both',
  })

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = PatchOrderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { walletAddress, status, payload } = parsed.data

  if (payload && JSON.stringify(payload).length > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: 'Order payload too large' }, { status: 400 })
  }

  const record = updateOrder(orderId, walletAddress, { status, payload })
  if (!record) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  return NextResponse.json({ order: toStoredOrder(record) }, { status: 200 })
}
