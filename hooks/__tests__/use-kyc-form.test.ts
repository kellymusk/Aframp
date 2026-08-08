import { renderHook, act } from '@testing-library/react'
import { useKycForm } from '@/hooks/use-kyc-form'

// ─── FileReader mock ──────────────────────────────────────────────────────────
class MockFileReader {
  onload: ((e: { target: { result: string } }) => void) | null = null
  onerror: (() => void) | null = null
  result: string | null = null

  readAsDataURL(file: File) {
    // Simulate async read
    Promise.resolve().then(() => {
      this.result = `data:${file.type};base64,FAKEB64DATA`
      this.onload?.({ target: { result: this.result } })
    })
  }
}

Object.defineProperty(window, 'FileReader', { value: MockFileReader, writable: true })

// ─── fetch mock ───────────────────────────────────────────────────────────────
const mockFetch = jest.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeFile(name: string, type: string, sizeBytes: number): File {
  const content = 'x'.repeat(sizeBytes)
  return new File([content], name, { type })
}

describe('useKycForm — file validation', () => {
  it('sets error for files larger than 5 MB', async () => {
    const { result } = renderHook(() => useKycForm())
    const bigFile = makeFile('big.jpg', 'image/jpeg', 6 * 1024 * 1024)

    await act(async () => {
      await result.current.handleFileUpload('idFront', bigFile)
    })

    expect(result.current.state.error).toBe('File size must be less than 5MB')
    expect(result.current.state.idFront).toBeNull()
  })

  it('sets error for unsupported MIME types', async () => {
    const { result } = renderHook(() => useKycForm())
    const pdfFile = makeFile('doc.pdf', 'application/pdf', 100 * 1024)

    await act(async () => {
      await result.current.handleFileUpload('idFront', pdfFile)
    })

    expect(result.current.state.error).toBe('Only JPEG, PNG, and WebP images are allowed')
  })

  it('accepts image/jpeg files', async () => {
    const { result } = renderHook(() => useKycForm())
    const jpegFile = makeFile('id.jpg', 'image/jpeg', 100 * 1024)

    await act(async () => {
      await result.current.handleFileUpload('idFront', jpegFile)
    })

    expect(result.current.state.error).toBeNull()
    expect(result.current.state.idFront).not.toBeNull()
  })

  it('accepts image/png files', async () => {
    const { result } = renderHook(() => useKycForm())
    const pngFile = makeFile('id.png', 'image/png', 100 * 1024)

    await act(async () => {
      await result.current.handleFileUpload('idFront', pngFile)
    })

    expect(result.current.state.idFront).not.toBeNull()
  })

  it('accepts image/webp files', async () => {
    const { result } = renderHook(() => useKycForm())
    const webpFile = makeFile('id.webp', 'image/webp', 100 * 1024)

    await act(async () => {
      await result.current.handleFileUpload('selfie', webpFile)
    })

    expect(result.current.state.selfie).not.toBeNull()
  })

  it('sets idBack field when uploading id back', async () => {
    const { result } = renderHook(() => useKycForm())
    const file = makeFile('back.jpg', 'image/jpeg', 100 * 1024)

    await act(async () => {
      await result.current.handleFileUpload('idBack', file)
    })

    expect(result.current.state.idBack).not.toBeNull()
  })
})

describe('useKycForm — submit', () => {
  it('sets error when any document is missing', async () => {
    const { result } = renderHook(() => useKycForm())

    await act(async () => {
      await result.current.submit()
    })

    expect(result.current.state.error).toBe('All documents are required')
  })

  it('calls POST /api/kyc/initiate with correct body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ submissionId: 'kyc_123', status: 'pending', expiresAt: Date.now() + 86400000 }),
    })

    const { result } = renderHook(() => useKycForm())
    const file = makeFile('id.jpg', 'image/jpeg', 100 * 1024)

    // Upload all three documents
    await act(async () => { await result.current.handleFileUpload('idFront', file) })
    await act(async () => { await result.current.handleFileUpload('idBack', file) })
    await act(async () => { await result.current.handleFileUpload('selfie', file) })

    await act(async () => {
      await result.current.submit()
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/kyc/initiate', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }))
  })

  it('sets submissionId on successful response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ submissionId: 'kyc_abc123', status: 'pending', expiresAt: 999 }),
    })

    const { result } = renderHook(() => useKycForm())
    const file = makeFile('id.jpg', 'image/jpeg', 100 * 1024)

    await act(async () => { await result.current.handleFileUpload('idFront', file) })
    await act(async () => { await result.current.handleFileUpload('idBack', file) })
    await act(async () => { await result.current.handleFileUpload('selfie', file) })

    await act(async () => {
      await result.current.submit()
    })

    expect(result.current.state.submissionId).toBe('kyc_abc123')
    expect(result.current.state.isSubmitting).toBe(false)
  })

  it('sets error on API failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Server error' }),
    })

    const { result } = renderHook(() => useKycForm())
    const file = makeFile('id.jpg', 'image/jpeg', 100 * 1024)

    await act(async () => { await result.current.handleFileUpload('idFront', file) })
    await act(async () => { await result.current.handleFileUpload('idBack', file) })
    await act(async () => { await result.current.handleFileUpload('selfie', file) })

    await act(async () => {
      await result.current.submit()
    })

    expect(result.current.state.error).toBe('Server error')
    expect(result.current.state.isSubmitting).toBe(false)
  })
})

describe('useKycForm — reset', () => {
  it('clears all state back to defaults', async () => {
    const { result } = renderHook(() => useKycForm())
    const file = makeFile('id.jpg', 'image/jpeg', 100 * 1024)

    await act(async () => { await result.current.handleFileUpload('idFront', file) })

    act(() => { result.current.reset() })

    expect(result.current.state.idFront).toBeNull()
    expect(result.current.state.idBack).toBeNull()
    expect(result.current.state.selfie).toBeNull()
    expect(result.current.state.error).toBeNull()
    expect(result.current.state.submissionId).toBeNull()
    expect(result.current.state.isSubmitting).toBe(false)
  })
})
