import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { KycSubmission } from '@/types/kyc'
import { kycStore } from '@/lib/kyc/store'

const bodySchema = z.object({
  idFront: z.string().min(100, 'ID front image is required'),
  idBack: z.string().min(100, 'ID back image is required'),
  selfie: z.string().min(100, 'Selfie image is required'),
})

function generateSubmissionId(): string {
  return `kyc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export async function POST(request: NextRequest): Promise<NextResponse> {
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

  const { idFront, idBack, selfie } = parsed.data

  // Extract userId from wallet address in request headers or body
  // In production, this would come from authenticated session
  const userId = request.headers.get('x-user-id') || 'user_' + Math.random().toString(36).substr(2, 9)

  const submissionId = generateSubmissionId()
  const now = Date.now()
  const expiresAt = now + 30 * 24 * 60 * 60 * 1000 // 30 days

  const submission: KycSubmission = {
    id: submissionId,
    userId,
    status: 'pending',
    step: 'submitted',
    documents: [
      {
        type: 'id_front',
        base64: idFront,
        mimeType: 'image/jpeg',
        uploadedAt: now,
      },
      {
        type: 'id_back',
        base64: idBack,
        mimeType: 'image/jpeg',
        uploadedAt: now,
      },
      {
        type: 'selfie',
        base64: selfie,
        mimeType: 'image/jpeg',
        uploadedAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
    expiresAt,
  }

  kycStore.set(submissionId, submission)

  // Simulate async verification process
  // In production, this would trigger a background job or webhook
  simulateVerification(submissionId)

  return NextResponse.json(
    {
      submissionId,
      status: 'pending',
      expiresAt,
    },
    { status: 202 }
  )
}

/**
 * Simulates KYC verification process
 * In production, this would be handled by a background job or third-party service
 */
function simulateVerification(submissionId: string): void {
  // Approve after 5-15 seconds with 85% success rate
  const delay = 5000 + Math.random() * 10000
  const shouldApprove = Math.random() > 0.15

  setTimeout(() => {
    const submission = kycStore.get(submissionId)
    if (!submission) return

    submission.status = shouldApprove ? 'approved' : 'rejected'
    submission.updatedAt = Date.now()
    submission.step = 'review'

    if (!shouldApprove) {
      submission.verificationNotes = 'Document quality insufficient. Please resubmit with clearer images.'
    }

    kycStore.set(submissionId, submission)
  }, delay)
}
