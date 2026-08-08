import { NextRequest } from 'next/server'
import { POST } from '@/app/api/kyc/initiate/route'
import { kycStore } from '@/lib/kyc/store'

// ---------------------------------------------------------------------------
// Mock the kycStore with a real Map so we can inspect `.set()` calls
// ---------------------------------------------------------------------------

const mockMap = new Map<string, unknown>()

jest.mock('@/lib/kyc/store', () => ({
  kycStore: {
    set: jest.fn((key: string, val: unknown) => mockMap.set(key, val)),
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

/** Build a NextRequest with an arbitrary JSON body */
function makeRequest(body: unknown, options: { invalidJson?: boolean } = {}): NextRequest {
  if (options.invalidJson) {
    return new NextRequest('http://localhost/api/kyc/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Passing a raw string that is not valid JSON
      body: 'NOT_VALID_JSON{{{',
    })
  }

  return new NextRequest('http://localhost/api/kyc/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/** A base64 string that satisfies the `string.min(100)` schema constraint */
const VALID_BASE64 = 'A'.repeat(200)

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockMap.clear()
  jest.clearAllMocks()
  // Suppress setTimeout-based simulation noise by replacing it with a no-op
  jest.spyOn(global, 'setTimeout').mockImplementation((() => 0) as typeof setTimeout)
})

afterEach(() => {
  jest.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/kyc/initiate', () => {
  describe('invalid JSON', () => {
    it('returns 400 when the request body is not valid JSON', async () => {
      const req = makeRequest(null, { invalidJson: true })
      const response = await POST(req)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toMatch(/invalid json/i)
    })
  })

  describe('validation failures (422)', () => {
    it('returns 422 when idFront is missing', async () => {
      const req = makeRequest({
        idBack: VALID_BASE64,
        selfie: VALID_BASE64,
      })
      const response = await POST(req)

      expect(response.status).toBe(422)
      const body = await response.json()
      expect(body.error).toBe('Validation failed')
    })

    it('returns 422 when idFront is shorter than 100 characters', async () => {
      const req = makeRequest({
        idFront: 'tooshort',
        idBack: VALID_BASE64,
        selfie: VALID_BASE64,
      })
      const response = await POST(req)

      expect(response.status).toBe(422)
      const body = await response.json()
      expect(body.error).toBe('Validation failed')
      expect(body.details).toBeDefined()
    })

    it('returns 422 when idBack is missing', async () => {
      const req = makeRequest({
        idFront: VALID_BASE64,
        selfie: VALID_BASE64,
      })
      const response = await POST(req)

      expect(response.status).toBe(422)
    })

    it('returns 422 when idBack is shorter than 100 characters', async () => {
      const req = makeRequest({
        idFront: VALID_BASE64,
        idBack: 'x'.repeat(50),
        selfie: VALID_BASE64,
      })
      const response = await POST(req)

      expect(response.status).toBe(422)
    })

    it('returns 422 when selfie is missing', async () => {
      const req = makeRequest({
        idFront: VALID_BASE64,
        idBack: VALID_BASE64,
      })
      const response = await POST(req)

      expect(response.status).toBe(422)
    })

    it('returns 422 when selfie is shorter than 100 characters', async () => {
      const req = makeRequest({
        idFront: VALID_BASE64,
        idBack: VALID_BASE64,
        selfie: 'short',
      })
      const response = await POST(req)

      expect(response.status).toBe(422)
    })

    it('returns 422 when all fields are empty strings', async () => {
      const req = makeRequest({ idFront: '', idBack: '', selfie: '' })
      const response = await POST(req)

      expect(response.status).toBe(422)
    })
  })

  describe('successful submission (202)', () => {
    it('returns 202 with a submissionId on a valid request', async () => {
      const req = makeRequest({
        idFront: VALID_BASE64,
        idBack: VALID_BASE64,
        selfie: VALID_BASE64,
      })
      const response = await POST(req)

      expect(response.status).toBe(202)
      const body = await response.json()
      expect(body.submissionId).toBeDefined()
      expect(typeof body.submissionId).toBe('string')
      expect(body.submissionId).toMatch(/^kyc_/)
    })

    it('returns status "pending" and an expiresAt timestamp on success', async () => {
      const req = makeRequest({
        idFront: VALID_BASE64,
        idBack: VALID_BASE64,
        selfie: VALID_BASE64,
      })
      const before = Date.now()
      const response = await POST(req)
      const body = await response.json()

      expect(body.status).toBe('pending')
      expect(typeof body.expiresAt).toBe('number')
      // expiresAt should be roughly 30 days in the future
      const thirtyDays = 30 * 24 * 60 * 60 * 1000
      expect(body.expiresAt).toBeGreaterThan(before + thirtyDays - 1000)
    })

    it('stores the submission in kycStore under the returned submissionId', async () => {
      const req = makeRequest({
        idFront: VALID_BASE64,
        idBack: VALID_BASE64,
        selfie: VALID_BASE64,
      })
      const response = await POST(req)
      const body = await response.json()

      expect(kycStore.set).toHaveBeenCalledTimes(1)
      const [storedId, storedValue] = (kycStore.set as jest.Mock).mock.calls[0] as [string, Record<string, unknown>]
      expect(storedId).toBe(body.submissionId)
      expect(storedValue.id).toBe(body.submissionId)
      expect(storedValue.status).toBe('pending')
      expect(storedValue.step).toBe('submitted')
    })

    it('includes documents for idFront, idBack, and selfie in the stored submission', async () => {
      const req = makeRequest({
        idFront: VALID_BASE64,
        idBack: VALID_BASE64,
        selfie: VALID_BASE64,
      })
      await POST(req)

      const [, storedValue] = (kycStore.set as jest.Mock).mock.calls[0] as [string, { documents: Array<{ type: string }> }]
      const docTypes = storedValue.documents.map((d) => d.type)
      expect(docTypes).toContain('id_front')
      expect(docTypes).toContain('id_back')
      expect(docTypes).toContain('selfie')
    })
  })
})
