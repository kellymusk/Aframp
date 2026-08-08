import { NextRequest, NextResponse } from 'next/server'
import { FlutterwaveGateway } from '@/lib/bills/payment-gateway'

export async function POST(request: NextRequest) {
  const secretHash = process.env.FLUTTERWAVE_SECRET_HASH

  if (!secretHash) {
    console.error('[webhooks/flutterwave] FLUTTERWAVE_SECRET_HASH is not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const rawBody = await request.text()

  const isValid = FlutterwaveGateway.verifyWebhookSignature(
    rawBody,
    {
      verifHash: request.headers.get('verif-hash'),
      signature: request.headers.get('flw-secret-hash') ?? request.headers.get('flutterwave-signature'),
    },
    secretHash
  )

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
  }

  let event: { event?: string; data?: { tx_ref?: string; status?: string } }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Here you would typically:
  // 1. Look up the transaction by event.data.tx_ref
  // 2. Update its status in the database based on event.data.status
  // 3. Trigger the actual bill payment / notify the customer on success
  console.warn('[webhooks/flutterwave] received event', event.event, event.data?.tx_ref)

  return NextResponse.json({ received: true })
}
