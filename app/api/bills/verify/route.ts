import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getPaymentGatewayService } from '@/lib/bills/payment-gateway'

/**
 * POST /api/bills/verify — Paystack webhook receiver.
 *
 * Paystack signs every webhook body with HMAC-SHA512 using the account's
 * secret key, sent in the `x-paystack-signature` header. Without verifying
 * this signature, anyone who knows a payment reference could POST a forged
 * "charge.success" event and trigger payment confirmation without paying.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-paystack-signature')
  const secret = process.env.PAYSTACK_SECRET_KEY

  if (!signature || !secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Hash the raw body — hashing a re-serialized/parsed body can produce a
  // different byte sequence than what Paystack signed.
  const rawBody = await request.text()
  const expectedHash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex')

  const expectedBuffer = Buffer.from(expectedHash, 'utf8')
  const signatureBuffer = Buffer.from(signature, 'utf8')
  const isValid =
    expectedBuffer.length === signatureBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, signatureBuffer)

  if (!isValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const event = JSON.parse(rawBody)

  if (event.event === 'charge.success') {
    // Here you would typically:
    // 1. Update your database with the confirmed transaction
    // 2. Trigger the actual bill payment to the biller
    // 3. Send confirmation email/SMS to customer
  }

  return NextResponse.json({ received: true })
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const reference = searchParams.get('reference')
    const gateway = (searchParams.get('gateway') || 'paystack') as 'paystack' | 'flutterwave'

    if (!reference) {
      return NextResponse.json(
        { error: 'Payment reference is required' },
        { status: 400 }
      )
    }

    const paymentService = getPaymentGatewayService(gateway)
    const verification = await paymentService.verifyPayment(reference)

    if (verification.success) {
      // Here you would typically:
      // 1. Update your database with the transaction
      // 2. Trigger the actual bill payment to the biller
      // 3. Send confirmation email/SMS to customer
      
      return NextResponse.json({
        success: true,
        status: verification.status,
        reference: verification.reference,
        amount: verification.amount,
        currency: verification.currency,
        paidAt: verification.paidAt,
        gatewayReference: verification.gatewayReference,
      })
    }

    return NextResponse.json({
      success: false,
      status: verification.status,
      reference: verification.reference,
    })
  } catch (error) {
    console.error('Payment verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    )
  }
}
