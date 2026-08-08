/**
 * POST /api/kyc/initiate
 *
 * Initiates a KYC verification submission.
 *
 * In production this calls the Smile Identity Enhanced Document Verification
 * (SmileID Enhanced DocV) API, which supports:
 *   - Nigerian NIN, BVN, Voter ID, Driver's Licence, Passport
 *   - Kenyan National ID, Passport
 *   - Ghanaian Voter ID, Driver's Licence, Passport
 *   - South African ID, Passport
 *   - + all other African ID types supported by Smile Identity
 *
 * Required environment variables:
 *   SMILE_IDENTITY_PARTNER_ID   – Your Smile Identity partner ID
 *   SMILE_IDENTITY_API_KEY      – Your Smile Identity API key (base64 encoded)
 *   SMILE_IDENTITY_CALLBACK_URL – Webhook URL for async result delivery
 *
 * When Smile Identity credentials are NOT configured the route falls back to
 * the legacy simulation (useful for local development / CI).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { KycSubmission } from '@/types/kyc'
import { kycStore } from '@/lib/kyc/store'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session'

const bodySchema = z.object({
  idFront: z.string().min(100, 'ID front image is required'),
  idBack: z.string().min(100, 'ID back image is required'),
  selfie: z.string().min(100, 'Selfie image is required'),
  /**
   * Optional ID metadata that improves match accuracy.
   * The client can pass these from a pre-fill form.
   */
  idType: z
    .enum([
      'NATIONAL_ID',
      'PASSPORT',
      'VOTER_ID',
      'DRIVERS_LICENSE',
      'BVN',
      'NIN',
      'NIN_SLIP',
      'SSNIT',
      'ALIEN_CARD',
      'REFUGEE_ID',
    ])
    .optional(),
  country: z.string().length(2).optional(), // ISO 3166-1 alpha-2, e.g. 'NG', 'KE', 'GH'
})

// ── Smile Identity ─────────────────────────────────────────────────────────────

/**
 * Smile Identity Enhanced DocV request payload.
 * See: https://docs.usesmileid.com/products/for-individuals-kyc/document-verification
 */
interface SmileDocVRequest {
  source_sdk: string
  source_sdk_version: string
  partner_id: string
  callback_url: string
  smile_client_id: string
  partner_params: {
    job_id: string
    user_id: string
    job_type: number // 6 = Document Verification
    country?: string
    id_type?: string
  }
  id_info: {
    country: string
    id_type: string
    entered: boolean
  }
  images: Array<{
    image_type_id: number // 0=selfie, 1=idFront, 5=idBack
    image: string // base64
  }>
  options: {
    return_job_status: boolean
    return_image_links: boolean
    return_history: boolean
    use_enrolled_image: boolean
  }
}

interface SmileDocVResponse {
  PartnerParams: {
    job_id: string
    user_id: string
    job_type: number
  }
  SmileJobID: string
  ResultCode: string
  ResultText: string
  Actions: {
    Return_Personal_Info: string
    Verify_ID_Number: string
    Human_Review_Liveness_Check: string
    Human_Review_Compare: string
    Human_Review_Update_Selfie: string
    Human_Review_Face_Mismatch: string
    Selfie_To_ID_Face_Match: string
    Document_Check: string
  }
  // HTTP-level errors
  code?: string
  error?: string
}

const SMILE_API_BASE = 'https://testapi.smileidentity.com/v1' // use 'https://api.smileidentity.com/v1' in production

function isSmileConfigured(): boolean {
  return !!(
    process.env.SMILE_IDENTITY_PARTNER_ID &&
    process.env.SMILE_IDENTITY_API_KEY &&
    process.env.SMILE_IDENTITY_CALLBACK_URL
  )
}

/**
 * Submit documents to Smile Identity Enhanced Document Verification.
 * Returns the SmileJobID and an immediate ResultCode when synchronous results
 * are available, otherwise returns status='pending' for async webhook delivery.
 */
async function submitToSmileIdentity(
  submissionId: string,
  userId: string,
  images: { idFront: string; idBack: string; selfie: string },
  meta: { idType?: string; country?: string }
): Promise<{ smileJobId: string; status: 'approved' | 'rejected' | 'pending'; notes?: string }> {
  const partnerId = process.env.SMILE_IDENTITY_PARTNER_ID!
  const apiKey = process.env.SMILE_IDENTITY_API_KEY!
  const callbackUrl = process.env.SMILE_IDENTITY_CALLBACK_URL!

  const country = meta.country ?? 'NG'
  const idType = meta.idType ?? 'NATIONAL_ID'

  const payload: SmileDocVRequest = {
    source_sdk: 'rest_api',
    source_sdk_version: '1.0.0',
    partner_id: partnerId,
    callback_url: callbackUrl,
    smile_client_id: userId,
    partner_params: {
      job_id: submissionId,
      user_id: userId,
      job_type: 6, // Enhanced Document Verification
      country,
      id_type: idType,
    },
    id_info: {
      country,
      id_type: idType,
      entered: false,
    },
    images: [
      { image_type_id: 0, image: images.selfie },   // Selfie
      { image_type_id: 1, image: images.idFront },  // ID front
      { image_type_id: 5, image: images.idBack },   // ID back
    ],
    options: {
      return_job_status: true,
      return_image_links: false,
      return_history: false,
      use_enrolled_image: false,
    },
  }

  // HMAC-SHA256 signature required by Smile Identity
  const timestamp = new Date().toISOString()
  const signaturePayload = `${partnerId}:${timestamp}`
  const signature = await buildSmileSignature(signaturePayload, apiKey)

  const response = await fetch(`${SMILE_API_BASE}/smile_identity_services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'smile-client-id': partnerId,
      timestamp,
      signature,
    },
    body: JSON.stringify(payload),
  })

  const json = (await response.json()) as SmileDocVResponse

  if (!response.ok) {
    throw new Error(`Smile Identity API error ${response.status}: ${json.error ?? JSON.stringify(json)}`)
  }

  // Map Smile result codes to our KYC status
  // 0810 = Approved, 0811 = Approved (human review), 0812 = Approved (re-run)
  // 0820 = Rejected, 0821 = Rejected (human review)
  // 2220 = Pending (async)
  const resultCode = json.ResultCode ?? ''

  if (['0810', '0811', '0812'].includes(resultCode)) {
    return { smileJobId: json.SmileJobID, status: 'approved' }
  }

  if (['0820', '0821'].includes(resultCode)) {
    return {
      smileJobId: json.SmileJobID,
      status: 'rejected',
      notes: json.ResultText ?? 'Document verification failed',
    }
  }

  // Pending — result will arrive via callback webhook
  return { smileJobId: json.SmileJobID, status: 'pending' }
}

/**
 * Build HMAC-SHA256 signature for Smile Identity requests.
 * apiKey is base64-encoded; we decode it to raw bytes before signing.
 */
async function buildSmileSignature(payload: string, apiKeyBase64: string): Promise<string> {
  const keyBytes = Buffer.from(apiKeyBase64, 'base64')
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sigBits = await crypto.subtle.sign('HMAC', key, Buffer.from(payload, 'utf8'))
  return Buffer.from(sigBits).toString('base64')
}

// ── Fallback simulation ───────────────────────────────────────────────────────

/**
 * Fallback: simulate KYC verification when Smile Identity is not configured.
 * Approve after 5-15 seconds with an 85% success rate.
 * NOT suitable for production.
 */
function simulateVerification(submissionId: string): void {
  const delay = 5000 + Math.random() * 10000
  const shouldApprove = Math.random() > 0.15

  setTimeout(() => {
    const submission = kycStore.get(submissionId)
    if (!submission) return

    submission.status = shouldApprove ? 'approved' : 'rejected'
    submission.updatedAt = Date.now()
    submission.step = 'review'

    if (!shouldApprove) {
      submission.verificationNotes =
        'Document quality insufficient. Please resubmit with clearer images.'
    }

    kycStore.set(submissionId, submission)
  }, delay)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateSubmissionId(): string {
  return `kyc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

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

  const { idFront, idBack, selfie, idType, country } = parsed.data

  const userId = session.userId

  const submissionId = generateSubmissionId()
  const now = Date.now()
  const expiresAt = now + 30 * 24 * 60 * 60 * 1000 // 30 days

  const submission: KycSubmission = {
    id: submissionId,
    userId,
    status: 'pending',
    step: 'submitted',
    documents: [
      { type: 'id_front', base64: idFront, mimeType: 'image/jpeg', uploadedAt: now },
      { type: 'id_back', base64: idBack, mimeType: 'image/jpeg', uploadedAt: now },
      { type: 'selfie', base64: selfie, mimeType: 'image/jpeg', uploadedAt: now },
    ],
    createdAt: now,
    updatedAt: now,
    expiresAt,
  }

  await setKycSubmission(submissionId, submission)

  log.info('kyc.submission.created', {
    submissionId,
    userId,
    documentCount: submission.documents.length,
  })

  // Simulate async verification process
  // In production, this would trigger a background job or webhook
  simulateVerification(submissionId)

      const stored = kycStore.get(submissionId)!
      stored.updatedAt = Date.now()
      stored.step = 'review'

      if (result.status !== 'pending') {
        stored.status = result.status
        if (result.notes) stored.verificationNotes = result.notes
      }

  setTimeout(async () => {
    const submission = await getKycSubmission(submissionId)
    if (!submission) return

      kycStore.set(submissionId, stored)
    } catch (err) {
      // Log and fall through — submission stays 'pending' so the webhook can still resolve it
      console.error('[kyc/initiate] Smile Identity submission failed', err)
    }
  } else {
    // ── Fallback simulation (dev / CI only) ───────────────────────────────────
    console.warn(
      '[kyc/initiate] Smile Identity credentials not configured — using simulation. ' +
        'Set SMILE_IDENTITY_PARTNER_ID, SMILE_IDENTITY_API_KEY, and SMILE_IDENTITY_CALLBACK_URL.'
    )
    simulateVerification(submissionId)
  }

    await setKycSubmission(submissionId, submission)
  }, delay)
}
