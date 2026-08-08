import { POST } from '@/app/api/kyc/initiate/route'
import { GET } from '@/app/api/kyc/status/[submissionId]/route'
import { NextRequest } from 'next/server'

// ─── Mock kycStore ────────────────────────────────────────────────────────────
const mockStore = new Map()

jest.mock('@/lib/kyc/store', () => ({
  kycStore: {
    set: jest.fn((k: string, v: unknown) => mockStore.set(k, v)),
    get: jest.fn((k: string) => mockStore.get(k)),
    has: jest.fn((k: string) => mockStore.has(k)),
  },
}))

// ─── Mock next/server ─────────────────────────────────────────────────────────
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server')
  return {
    ...actual,
    NextResponse: {
      json: jest.fn((body: unknown, init?: { status?: number }) => ({
        status: init?.status ?? 200,
        json: async () => body,
      })),
    },
  }
})

beforeEach(() => {
  mockStore.clear()
  jest.clearAllMocks()
})

// ─── Helper: generate a base64 string of >= 100 chars ────────────────────────
const validBase64 = 'A'.repeat(100)

function makePostRequest(body: unknown): NextRequest {
  return {
    json: jest.fn().mockResolvedValue(body),
    headers: { get: jest.fn().mockReturnValue(null) },
  } as unknown as NextRequest
}

function makeInvalidPostRequest(): NextRequest {
  return {
    json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
    headers: { get: jest.fn().mockReturnValue(null) },
  } as unknown as NextRequest
}

// ─── POST /api/kyc/initiate ───────────────────────────────────────────────────
describe('POST /api/kyc/initiate', () => {
  it('returns 400 on invalid JSON', async () => {
    const req = makeInvalidPostRequest()
    const response = await POST(req)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Invalid JSON body')
  })

  it('returns 422 when idFront is missing', async () => {
    const req = makePostRequest({ idBack: validBase64, selfie: validBase64 })
    const response = await POST(req)
    expect(response.status).toBe(422)
    const body = await response.json()
    expect(body.error).toBe('Validation failed')
  })

  it('returns 422 when idFront is too short (< 100 chars)', async () => {
    const req = makePostRequest({ idFront: 'short', idBack: validBase64, selfie: validBase64 })
    const response = await POST(req)
    expect(response.status).toBe(422)
  })

  it('returns 422 when idBack is missing', async () => {
    const req = makePostRequest({ idFront: validBase64, selfie: validBase64 })
    const response = await POST(req)
    expect(response.status).toBe(422)
  })

  it('returns 422 when selfie is missing', async () => {
    const req = makePostRequest({ idFront: validBase64, idBack: validBase64 })
    const response = await POST(req)
    expect(response.status).toBe(422)
  })

  it('returns 422 when selfie is too short', async () => {
    const req = makePostRequest({ idFront: validBase64, idBack: validBase64, selfie: 'tiny' })
    const response = await POST(req)
    expect(response.status).toBe(422)
  })

  it('returns 202 with submissionId on valid request', async () => {
    const req = makePostRequest({ idFront: validBase64, idBack: validBase64, selfie: validBase64 })
    const response = await POST(req)
    expect(response.status).toBe(202)
    const body = await response.json()
    expect(body.submissionId).toBeDefined()
    expect(body.status).toBe('pending')
    expect(body.expiresAt).toBeDefined()
  })

  it('submissionId starts with kyc_', async () => {
    const req = makePostRequest({ idFront: validBase64, idBack: validBase64, selfie: validBase64 })
    const response = await POST(req)
    const body = await response.json()
    expect(body.submissionId).toMatch(/^kyc_/)
  })

  it('stores the submission in kycStore', async () => {
    const { kycStore } = require('@/lib/kyc/store')
    const req = makePostRequest({ idFront: validBase64, idBack: validBase64, selfie: validBase64 })
    await POST(req)
    expect(kycStore.set).toHaveBeenCalled()
  })
})

// ─── GET /api/kyc/status/[submissionId] ──────────────────────────────────────
function makeGetRequest(): NextRequest {
  return {} as unknown as NextRequest
}

describe('GET /api/kyc/status/[submissionId]', () => {
  it('returns 404 when submissionId is not in store', async () => {
    const req = makeGetRequest()
    const context = { params: Promise.resolve({ submissionId: 'nonexistent' }) }
    const response = await GET(req, context)
    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toBe('Submission not found')
  })

  it('returns 200 with pending status for known submission', async () => {
    const now = Date.now()
    const submissionId = 'kyc_test_001'
    mockStore.set(submissionId, {
      id: submissionId,
      userId: 'user_1',
      status: 'pending',
      step: 'submitted',
      documents: [],
      createdAt: now,
      updatedAt: now,
      expiresAt: now + 86400000, // 24 hours in future
    })

    const req = makeGetRequest()
    const context = { params: Promise.resolve({ submissionId }) }
    const response = await GET(req, context)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.submissionId).toBe(submissionId)
    expect(body.status).toBe('pending')
  })

  it('returns expired status when expiresAt is in the past', async () => {
    const submissionId = 'kyc_expired_001'
    mockStore.set(submissionId, {
      id: submissionId,
      userId: 'user_2',
      status: 'pending',
      step: 'submitted',
      documents: [],
      createdAt: Date.now() - 86400001,
      updatedAt: Date.now() - 86400001,
      expiresAt: Date.now() - 1, // already expired
    })

    const req = makeGetRequest()
    const context = { params: Promise.resolve({ submissionId }) }
    const response = await GET(req, context)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.status).toBe('expired')
  })

  it('returns approved status for approved submissions', async () => {
    const submissionId = 'kyc_approved_001'
    mockStore.set(submissionId, {
      id: submissionId,
      userId: 'user_3',
      status: 'approved',
      step: 'review',
      documents: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt: Date.now() + 86400000,
    })

    const req = makeGetRequest()
    const context = { params: Promise.resolve({ submissionId }) }
    const response = await GET(req, context)

    const body = await response.json()
    expect(body.status).toBe('approved')
  })

  it('includes step and expiresAt in the response', async () => {
    const submissionId = 'kyc_full_001'
    const expiresAt = Date.now() + 86400000
    mockStore.set(submissionId, {
      id: submissionId,
      userId: 'user_4',
      status: 'pending',
      step: 'submitted',
      documents: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt,
    })

    const req = makeGetRequest()
    const context = { params: Promise.resolve({ submissionId }) }
    const response = await GET(req, context)

    const body = await response.json()
    expect(body.step).toBe('submitted')
    expect(body.expiresAt).toBe(expiresAt)
  })
})
