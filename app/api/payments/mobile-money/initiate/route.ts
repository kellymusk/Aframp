/**
 * POST /api/payments/mobile-money/initiate
 *
 * Initiates an M-Pesa / MTN MoMo collection.  This is a money-movement path, so
 * it screens before it debits — same control and same entry point as
 * /api/withdrawals, and for the same reason: a payment route may act on a
 * screening decision but must never form its own view of risk.
 *
 * Screening runs *before* the provider call, not after.  An STK push that has
 * already prompted the customer's handset has moved money as far as they are
 * concerned; holding it afterwards means reversing a settled collection rather
 * than declining an attempt.
 *
 * Request body (JSON):
 *   {
 *     provider:         "mpesa" | "mtn_momo"
 *     phoneNumber:      string  — E.164, e.g. +254712345678
 *     amount:           number  — major units of `currency`
 *     currency:         string  — ISO 4217; determines which market's AML
 *                                 policy applies (see resolveMarket())
 *     accountReference: string
 *     transactionDesc:  string
 *     externalId:       string  — caller's idempotency key; also the id the
 *                                 case file and the ledger reference
 *     kind?:            "onramp" | "billpay"   — defaults to "onramp"
 *     userId?:          string  — wallet public key when one is connected;
 *                                 falls back to the hashed payer MSISDN
 *     accountName?:     string  — payer name where the caller knows it;
 *                                 screened against sanctions and PEP lists
 *     kycTier?:         string
 *   }
 *
 * 202 { transactionId, status, provider }
 * 400 invalid JSON
 * 403 held or blocked by screening   (COMPLIANCE_BLOCKED)
 * 422 validation failed, unsupported market, or provider rejection
 * 503 screening could not be performed
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getProvider, MobileMoneyError } from '@/lib/payments'
import type { MobileMoneyProviderName } from '@/lib/payments'
import { captureError, log } from '@/lib/observability'

const bodySchema = z.object({
  provider: z.enum(['mpesa', 'mtn_momo', 'flutterwave']),
  phoneNumber: z
    .string()
    .regex(/^\+\d{7,15}$/, 'phoneNumber must be in E.164 format, e.g. +254712345678'),
  amount: z.number().positive('amount must be a positive number'),
  currency: z.string().length(3, 'currency must be an ISO 4217 code, e.g. KES'),
  accountReference: z.string().min(1).max(12),
  transactionDesc: z.string().min(1).max(13),
  externalId: z.string().min(1),
  // Screening inputs.  Optional so existing callers keep working; the route
  // degrades to a hashed-MSISDN identity rather than skipping the control.
  kind: z.enum(['onramp', 'billpay']).default('onramp'),
  userId: z.string().trim().min(1).max(128).optional(),
  accountName: z.string().trim().min(1).max(256).optional(),
  kycTier: z.string().trim().max(32).optional(),
})

export async function POST(request: NextRequest) {
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

  const { provider: providerName, kind, userId, accountName, kycTier, ...params } = parsed.data

  // -- 1. AML screening -------------------------------------------------------
  let screening
  try {
    screening = await screenTransaction({
      transactionId: params.externalId,
      // Velocity and fan-out rules only mean anything if the same human keys to
      // the same id across legs.  A connected wallet is that id; without one,
      // the MSISDN is the most stable payer identifier this route has, hashed
      // so the ledger never holds a raw phone number.
      userId: userId ?? payerIdentity('msisdn', params.phoneNumber),
      kind,
      amountCents: toUsdCents(params.amount, params.currency),
      asset: params.currency.toUpperCase(),
      chain: 'fiat',
      jurisdiction: resolveMarket(params.currency),
      accountName,
      accountNumber: params.phoneNumber,
      counterpartyId: params.phoneNumber,
      kycTier,
    })
  } catch (error) {
    // A currency we hold no policy for is a client error, not an outage: there
    // is no threshold to measure the payment against, so it cannot be screened
    // and must not be collected.
    if (error instanceof UnsupportedMarketError) {
      return NextResponse.json(
        {
          error: 'UNSUPPORTED_MARKET',
          message: `Payments in ${error.currency} are not available.`,
        },
        { status: 422 }
      )
    }

    console.error('[mobile-money/initiate] screening failed', error)
    return NextResponse.json(
      {
        error: 'SCREENING_UNAVAILABLE',
        message: 'We could not complete required checks. Please try again shortly.',
      },
      { status: 503 }
    )
  }

  if (screening.decision === 'BLOCK' || screening.decision === 'REVIEW') {
    // Identical response for both, deliberately — see the tipping-off note in
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

  // -- 2. Collect -------------------------------------------------------------
  try {
    const provider = getProvider(providerName as MobileMoneyProviderName)
    const result = await provider.initiatePayment(params)

    log.info('payment.mobile_money.initiated', {
      provider: providerName,
      currency: params.currency,
      transactionId: result.transactionId,
      status: result.status,
    })

    return NextResponse.json(
      {
        transactionId: result.transactionId,
        status: result.status,
        provider: result.provider,
      },
      { status: 202 }
    )
  } catch (err) {
    if (err instanceof MobileMoneyError) {
      log.warn('payment.mobile_money.validation_error', {
        provider: providerName,
        code: err.code,
        message: err.message,
      })
      return NextResponse.json({ error: err.message, code: err.code }, { status: 422 })
    }

    captureError(err, {
      tags: { domain: 'payments', provider: providerName },
      extra: { currency: params.currency, accountReference: params.accountReference },
    })
    console.error('[mobile-money/initiate]', err)
    return NextResponse.json({ error: 'Payment initiation failed' }, { status: 500 })
  }
}
