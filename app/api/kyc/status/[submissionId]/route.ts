import { NextRequest, NextResponse } from 'next/server'
import { kycStore } from '@/lib/kyc/store'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ submissionId: string }> }
): Promise<NextResponse> {
  const { submissionId } = await context.params

  if (!submissionId) {
    return NextResponse.json(
      { error: 'submissionId is required' },
      { status: 400 }
    )
  }

  const submission = kycStore.get(submissionId)

  if (!submission) {
    return NextResponse.json(
      { error: 'Submission not found' },
      { status: 404 }
    )
  }

  // Check if submission has expired
  if (Date.now() > submission.expiresAt) {
    submission.status = 'expired'
    submission.updatedAt = Date.now()
    kycStore.set(submissionId, submission)
  }

  return NextResponse.json(
    {
      submissionId: submission.id,
      status: submission.status,
      step: submission.step,
      verificationNotes: submission.verificationNotes,
      expiresAt: submission.expiresAt,
    },
    { status: 200 }
  )
}
