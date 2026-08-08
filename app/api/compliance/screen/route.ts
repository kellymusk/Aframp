/**
 * POST /api/compliance/screen
 *
 * Screens a transaction for AML risk and returns the decision.  This is the
 * server-side control — the frontend cannot bypass it, and no payment path may
 * form its own view of risk.
 *
 * Request body (JSON):
 *   {
 *     transactionId: string
 *     userId:        string    — wallet public key
 *     kind:          "onramp" | "offramp" | "billpay"
 *     amountCents:   number    — integer USD cents
 *     asset:         string
 *     chain:         string
 *     jurisdiction:  "NG" | "KE" | "GH" | "ZA" | "UG"
 *     walletAddress?: string   — counterparty address
 *     accountName?:   string   — bank / mobile-money account holder
 *     accountNumber?: string   — hashed before storage, never persisted raw
 *     kycTier?:       string
 *   }
 *
 * 200 { decision, riskScore, riskLevel, signals, caseId? }
 *     ALLOW  — caller proceeds
 *     REVIEW — caller must hold the transaction; a case is open
 *     BLOCK  — caller must reject
 * 400 invalid body
 * 503 screening could not be performed (see the note on fail-closed below)
 *
 * The response is intentionally verbose about *why* a transaction was flagged.
 * That detail is for the caller's audit log, not for the end user — surfacing
 * signal detail to a customer tells them which threshold to stay under next
 * time, and in most jurisdictions telling the subject of a SAR that they are
 * under review is itself an offence ("tipping off").  See the note in
 * app/api/withdrawals/route.ts for what the user-facing message should say.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { screenTransaction } from '@/lib/compliance/monitor'
import type { ScreeningSubject } from '@/lib/compliance/types'

const RequestSchema = z.object({
  transactionId: z.string().trim().min(1).max(128),
  userId: z.string().trim().min(1).max(128),
  kind: z.enum(['onramp', 'offramp', 'billpay']),
  amountCents: z.number().int().positive(),
  asset: z.string().trim().min(1).max(32),
  chain: z.string().trim().min(1).max(32),
  jurisdiction: z.enum(['NG', 'KE', 'GH', 'ZA', 'UG']),
  walletAddress: z.string().trim().min(1).max(128).optional(),
  accountName: z.string().trim().min(1).max(256).optional(),
  accountNumber: z.string().trim().min(1).max(64).optional(),
  counterpartyId: z.string().trim().min(1).max(256).optional(),
  kycTier: z.string().trim().max(32).optional(),
  accountCreatedAt: z.coerce.date().optional(),
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const subject: ScreeningSubject = {
    ...parsed.data,
    // Fall back to the counterparty identifiers the transaction already
    // carries, so fan-out detection works without every caller having to
    // construct a key itself.
    counterpartyId:
      parsed.data.counterpartyId ??
      parsed.data.accountNumber ??
      parsed.data.walletAddress,
  }

  try {
    const result = await screenTransaction(subject)

    return NextResponse.json(
      {
        transactionId: result.transactionId,
        decision: result.decision,
        riskScore: result.riskScore,
        riskLevel: result.riskLevel,
        signals: result.signals,
        caseId: result.caseId,
        screenedAt: result.screenedAt,
      },
      { status: 200 }
    )
  } catch (error) {
    // screenTransaction() does not throw for compliance outcomes — a BLOCK is a
    // return value.  Reaching here means the control itself is broken
    // (misconfigured provider, missing hash salt), and the only safe response
    // is to refuse the transaction rather than let it proceed unscreened.
    console.error('[compliance] screening failed', error)

    return NextResponse.json(
      {
        error: 'SCREENING_UNAVAILABLE',
        message: 'Transaction screening could not be completed. Please try again.',
      },
      { status: 503 }
    )
  }
}
