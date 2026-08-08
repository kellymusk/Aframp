/**
 * POST /api/bills/initiate
 *
 * Initiates a bill payment through the selected gateway.  Screens before
 * handing anything to the gateway — same control and same entry point as
 * /api/withdrawals and /api/payments/mobile-money/initiate.
 *
 * Bill payment is a genuine laundering channel, not an afterthought: paying a
 * third party's utility or airtime account settles value to someone other than
 * the payer, which is exactly what a mule network wants.  The biller account
 * number is therefore screened as the counterparty, so fan-out across many
 * distinct bill accounts registers the way fan-out across bank accounts does.
 *
 * Request body extends BillPaymentFormData with optional screening inputs:
 *   userId?   — wallet public key when connected; falls back to hashed email
 *   currency? — ISO 4217, defaults to NGN as the gateway call does
 *
 * 200 { success, authorization_url, reference }
 * 400 missing required fields
 * 403 held or blocked by screening   (COMPLIANCE_BLOCKED)
 * 422 unsupported market
 * 500 gateway failure
 * 503 screening could not be performed
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPaymentGatewayService } from '@/lib/bills/payment-gateway'
import { BillPaymentFormData } from '@/lib/bills/types'
import { captureError, log } from '@/lib/observability'

export async function POST(request: NextRequest) {
  try {
    const body: BillInitiateBody = await request.json()

    // Validate required fields
    if (!body.billerId || !body.accountNumber || !body.amount || !body.customerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Generate unique reference
    const reference = `BILL-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`

    const currency = (body.currency || 'NGN').toUpperCase()

    // -- AML screening --------------------------------------------------------
    let screening
    try {
      screening = await screenTransaction({
        transactionId: reference,
        // Email is the only payer identifier every bill payment carries.  See
        // lib/compliance/identity.ts for why a per-request id will not do.
        userId: body.userId ?? payerIdentity('email', body.customerEmail),
        kind: 'billpay',
        amountCents: toUsdCents(body.amount, currency),
        asset: currency,
        chain: 'fiat',
        jurisdiction: resolveMarket(currency),
        accountNumber: body.accountNumber,
        // The biller account is the counterparty — one payer settling to many
        // distinct bill accounts is the fan-out pattern the rule looks for.
        counterpartyId: `${body.billerId}:${body.accountNumber}`,
      })
    } catch (error) {
      if (error instanceof UnsupportedMarketError) {
        return NextResponse.json(
          {
            error: 'UNSUPPORTED_MARKET',
            message: `Bill payments in ${error.currency} are not available.`,
          },
          { status: 422 }
        )
      }

      console.error('[bills/initiate] screening failed', error)
      return NextResponse.json(
        {
          error: 'SCREENING_UNAVAILABLE',
          message: 'We could not complete required checks. Please try again shortly.',
        },
        { status: 503 }
      )
    }

    if (screening.decision === 'BLOCK' || screening.decision === 'REVIEW') {
      // Identical response for both — see the tipping-off note in
      // app/api/withdrawals/route.ts.
      return NextResponse.json(
        {
          error: 'COMPLIANCE_BLOCKED',
          message:
            'This payment is being reviewed by our compliance team. We will contact you if anything further is needed.',
          referenceId: screening.caseId,
        },
        { status: 403 }
      )
    }

    // Initialize payment with selected gateway
    const gateway = body.gateway || 'paystack'
    const paymentService = getPaymentGatewayService(gateway)

    const paymentData = {
      email: body.customerEmail,
      amount: body.amount,
      currency,
      reference,
      metadata: {
        billerId: body.billerId,
        billerName: body.billerName,
        accountNumber: body.accountNumber,
        customerPhone: body.customerPhone,
        paymentMethod: body.paymentMethod,
        ...body.metadata,
      },
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/bills/verify?reference=${reference}`,
    }

    const result = await paymentService.initiatePayment(paymentData)

    log.info('bills.payment.initiated', {
      billerId: body.billerId,
      gateway,
      reference,
    })

    return NextResponse.json({
      success: true,
      authorization_url: result.authorization_url,
      reference: result.reference,
    })
  } catch (error) {
    captureError(error, {
      tags: { domain: 'bills', operation: 'initiate-payment' },
      extra: { billerId: (error as Record<string, unknown>)?.billerId },
    })
    console.error('Payment initiation error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate payment' },
      { status: 500 }
    )
  }
}
