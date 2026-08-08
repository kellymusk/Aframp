/**
 * POST /api/kyc/webhook
 *
 * Receives asynchronous KYC result callbacks from Smile Identity.
 *
 * Smile Identity posts a signed JSON payload to this URL when a job completes.
 * The signature is verified using the partner API key before processing.
 *
 * Set SMILE_IDENTITY_CALLBACK_URL=https://yourapp.com/api/kyc/webhook
 * in your Smile Identity dashboard and environment variables.
 */

import { NextRequest, NextResponse } from 'next/server'
import { kycStore } from '@/lib/kyc/store'

// ── Smile Identity result codes ───────────────────────────────────────────────

/** Result codes that indicate a passing verification. */
const APPROVED_CODES = new Set(['0810', '0811', '0812'])
/** Result codes that indicate a failing verification. */
const REJECTED_CODES = new Set(['0820', '0821'])

// ── Signature verification ────────────────────────────────────────────────────

/**
 * Verify the HMAC-SHA256 signature sent by Smile Identity.
 * The signature is computed over: `partner_id:timestamp`
 */
async function verifySmileSignature(
  partnerId: string,
  timestamp: string,
  receivedSignature: string,
  apiKeyBase64: string
): Promise<boolean> {
  try {
    const keyBytes = Buffer.from(apiKeyBase64, 'base64')
    const key = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
    const sigBytes = Buffer.from(receivedSignature, 'base64')
    const payload = Buffer.from(`${partnerId}:${timestamp}`, 'utf8')
    return await crypto.subtle.verify('HMAC', key, sigBytes, payload)
  } catch {
    return false
  }
}

// ── Webhook handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const partnerId = process.env.SMILE_IDENTITY_PARTNER_ID
  const apiKey = process.env.SMILE_IDENTITY_API_KEY

  if (!partnerId || !apiKey) {
    console.error('[kyc/webhook] Smile Identity credentials not configured')
    return NextResponse.json({ error: 'KYC provider not configured' }, { status: 503 })
  }

  // Verify signature to ensure the callback is genuinely from Smile Identity
  const signature = request.headers.get('signature') ?? (body.signature as string)
  const timestamp = request.headers.get('timestamp') ?? (body.timestamp as string)

  if (signature && timestamp) {
    const isValid = await verifySmileSignature(partnerId, timestamp, signature, apiKey)
    if (!isValid) {
      console.warn('[kyc/webhook] Invalid Smile Identity signature — rejecting webhook')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  // Extract fields from the Smile Identity callback payload
  const partnerParams = body.PartnerParams as Record<string, string> | undefined
  const resultCode = body.ResultCode as string | undefined
  const resultText = body.ResultText as string | undefined

  const jobId = partnerParams?.job_id // This is our submissionId
  if (!jobId) {
    return NextResponse.json({ error: 'Missing job_id in PartnerParams' }, { status: 400 })
  }

  // Find the submission in our store
  const submission = kycStore.get(jobId)
  if (!submission) {
    // Could be a replay — acknowledge without error so Smile stops retrying
    console.warn('[kyc/webhook] Unknown job_id:', jobId)
    return NextResponse.json({ received: true }, { status: 200 })
  }

  // Map result code to status
  let newStatus: 'approved' | 'rejected' | 'pending' = 'pending'
  let verificationNotes: string | undefined

  if (resultCode && APPROVED_CODES.has(resultCode)) {
    newStatus = 'approved'
  } else if (resultCode && REJECTED_CODES.has(resultCode)) {
    newStatus = 'rejected'
    verificationNotes = resultText ?? 'Verification failed. Please resubmit with clearer images.'
  } else {
    // Unknown or in-progress code — leave as pending
    console.warn('[kyc/webhook] Unrecognised result code', resultCode, 'for job', jobId)
  }

  // Update the submission
  submission.status = newStatus
  submission.step = 'review'
  submission.updatedAt = Date.now()
  if (verificationNotes) submission.verificationNotes = verificationNotes
  kycStore.set(jobId, submission)

  console.info(`[kyc/webhook] Job ${jobId} → ${newStatus} (code: ${resultCode})`)

  return NextResponse.json({ received: true, status: newStatus }, { status: 200 })
}
