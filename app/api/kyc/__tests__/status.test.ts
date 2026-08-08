import { NextRequest } from 'next/server'
import { GET } from '@/app/api/kyc/status/[submissionId]/route'
import { kycStore } from '@/lib/kyc/store'
import type { KycSubmission } from '@/types/kyc'

// ---------------------------------------------------------------------------
// Mock kycStore with a real Map so we can seed it per-test
// ---------------------------------------------------------------------------

const mockMap = new Map<string, KycSubmission>()

jest.mock('@/lib/kyc/store', () => ({
  kycStore: {
    set: jest.fn((key: string, val: KycSubmission) => mockMap.set(key, val)),
    get: jest.fn((key: string) => mockMap.get(key)),
    has: jest.fn((key: string) => mockMap.has(key)),
    delete: jest.fn((key: string) => mockMap.delete(key)),
    clear: jest.fn(() => mockMap.clear()),
    get size() {
      return mockMap.size
    },
  },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal, valid KycSubmission for seeding the store */
function makeSubmission(overrides: Partial<KycSubmission> = {}): KycSubmission {
  const now = Date.now()
  return {
    id: 'kyc_test_001',
    userId: 'user_test_001',
    status: 'pending',
    step: 'submitted',
    documents: [],
    createdAt: now,
    updatedAt: now,
    expiresAt: now + 30 * 24 * 60 * 60 * 1000, // 30 days from now
    verificationNotes: undefined,
    ...overrides,
  }
}

/**
 * Call the GET handler as Next.js App Router does:
 * context.params is a Promise<{ submissionId: string }>
 */
async function callGet(submissionId: string) {
  const request = new NextRequest(
    `http://localhost/api/kyc/status/${submissionId}`
  )
  const context = {
    params: Promise.resolve({ submissionId }),
  }
  return GET(request, context)
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockMap.clear()
  jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/kyc/status/[submissionId]', () => {
  describe('submission not found', () => {
    it('returns 404 when the submissionId is not in kycStore', async () => {
      // Store is empty
      const response = await callGet('kyc_unknown_id')

      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.error).toMatch(/not found/i)
    })

    it('returns 404 for a different submissionId that does not match what is stored', async () => {
      mockMap.set('kyc_other_id', makeSubmission({ id: 'kyc_other_id' }))

      const response = await callGet('kyc_different_id')

      expect(response.status).toBe(404)
    })
  })

  describe('submission found – active (non-expired)', () => {
    it('returns 200 with the expected fields', async () => {
      const submission = makeSubmission()
      mockMap.set(submission.id, submission)

      const response = await callGet(submission.id)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.submissionId).toBe(submission.id)
      expect(body.status).toBeDefined()
      expect(body.step).toBeDefined()
      expect(body.expiresAt).toBeDefined()
    })

    it('returns status "pending" and step "submitted" for a freshly stored submission', async () => {
      const submission = makeSubmission({ status: 'pending', step: 'submitted' })
      mockMap.set(submission.id, submission)

      const response = await callGet(submission.id)
      const body = await response.json()

      expect(body.status).toBe('pending')
      expect(body.step).toBe('submitted')
    })

    it('returns status "approved" for an approved submission', async () => {
      const submission = makeSubmission({ status: 'approved', step: 'review' })
      mockMap.set(submission.id, submission)

      const response = await callGet(submission.id)
      const body = await response.json()

      expect(body.status).toBe('approved')
    })

    it('returns verificationNotes when present', async () => {
      const submission = makeSubmission({
        status: 'rejected',
        step: 'review',
        verificationNotes: 'Document quality insufficient.',
      })
      mockMap.set(submission.id, submission)

      const response = await callGet(submission.id)
      const body = await response.json()

      expect(body.verificationNotes).toBe('Document quality insufficient.')
    })

    it('returns verificationNotes as undefined when not set', async () => {
      const submission = makeSubmission({ verificationNotes: undefined })
      mockMap.set(submission.id, submission)

      const response = await callGet(submission.id)
      const body = await response.json()

      // JSON.stringify omits undefined — the key should be absent or null
      expect(body.verificationNotes == null).toBe(true)
    })

    it('returns the correct expiresAt timestamp', async () => {
      const future = Date.now() + 30 * 24 * 60 * 60 * 1000
      const submission = makeSubmission({ expiresAt: future })
      mockMap.set(submission.id, submission)

      const response = await callGet(submission.id)
      const body = await response.json()

      expect(body.expiresAt).toBe(future)
    })
  })

  describe('submission found – expired', () => {
    it('returns status "expired" when expiresAt is in the past', async () => {
      const pastExpiry = Date.now() - 1000 // 1 second ago
      const submission = makeSubmission({ expiresAt: pastExpiry, status: 'pending' })
      mockMap.set(submission.id, submission)

      const response = await callGet(submission.id)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.status).toBe('expired')
    })

    it('persists the "expired" status back to kycStore', async () => {
      const pastExpiry = Date.now() - 5000
      const submission = makeSubmission({ expiresAt: pastExpiry, status: 'pending' })
      mockMap.set(submission.id, submission)

      await callGet(submission.id)

      // The handler calls kycStore.set to persist the updated status
      expect(kycStore.set).toHaveBeenCalled()
      const updated = mockMap.get(submission.id)
      expect(updated?.status).toBe('expired')
    })

    it('returns 200 (not 404 or 410) for an expired submission', async () => {
      const pastExpiry = Date.now() - 100
      const submission = makeSubmission({ expiresAt: pastExpiry })
      mockMap.set(submission.id, submission)

      const response = await callGet(submission.id)
      expect(response.status).toBe(200)
    })
  })
})
