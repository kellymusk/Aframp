/**
 * /api/orders — server-side persistence for in-progress ramp orders.
 *
 * POST   Creates (or idempotently re-saves) an order.
 *
 *   Body: { id, walletAddress, kind, status, payload }
 *   200:  { order: StoredOrder }
 *   400:  invalid body
 *   409:  the id already exists under a different wallet
 *
 * GET    Lists a wallet's recent orders, newest first.
 *
 *   Query: ?walletAddress=<address>&kind=onramp|offramp&limit=<1-50>
 *   200:   { orders: StoredOrder[] }
 *   400:   missing/invalid walletAddress
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { listOrders, saveOrder, toStoredOrder } from '@/lib/orders/order-store'
import { MAX_PAYLOAD_BYTES } from '@/lib/orders/types'

/**
 * Wallet addresses are validated loosely rather than with
 * isValidStellarAddress(): the onramp demo flow assigns a placeholder address
 * that is not valid base32, and rejecting it here would make orders
 * unsaveable in that flow.  The address is only ever used as an opaque
 * ownership key, so a length/charset bound is the property that matters.
 */
const WalletAddressSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/, 'Wallet address contains unsupported characters')

const CreateOrderSchema = z.object({
  id: z.string().trim().min(1).max(128),
  walletAddress: WalletAddressSchema,
  kind: z.enum(['onramp', 'offramp']),
  status: z.string().trim().min(1).max(64),
  payload: z.record(z.string(), z.unknown()),
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = CreateOrderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  // Bound what a single order can occupy — the store lives in process memory.
  if (JSON.stringify(parsed.data.payload).length > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: 'Order payload too large' }, { status: 400 })
  }

  const record = saveOrder(parsed.data)
  if (!record) {
    return NextResponse.json(
      { error: 'An order with this id already exists for a different wallet' },
      { status: 409 }
    )
  }

  return NextResponse.json({ order: toStoredOrder(record) }, { status: 200 })
}

const ListQuerySchema = z.object({
  walletAddress: WalletAddressSchema,
  kind: z.enum(['onramp', 'offramp']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const parsed = ListQuerySchema.safeParse({
    walletAddress: searchParams.get('walletAddress') ?? undefined,
    kind: searchParams.get('kind') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { walletAddress, kind, limit } = parsed.data
  const orders = listOrders(walletAddress, { kind, limit }).map(toStoredOrder)

  return NextResponse.json({ orders }, { status: 200 })
}
