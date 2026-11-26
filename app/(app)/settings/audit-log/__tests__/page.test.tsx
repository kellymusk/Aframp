import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AuditLogPage from '../page'
import { api, ApiError, type AuditLogEvent } from '@/lib/api'

jest.mock('@/lib/api', () => {
  class ApiError extends Error {
    constructor(
      message: string,
      readonly status: number
    ) {
      super(message)
    }
  }
  return { api: { listAuditLogEvents: jest.fn() }, ApiError }
})

jest.mock('@/components/session-provider', () => ({
  useAuthenticatedSession: () => ({ token: 'tok' }),
}))

const mockList = api.listAuditLogEvents as jest.Mock

beforeEach(() => {
  mockList.mockReset()
})

describe('AuditLogPage', () => {
  it('lists events with their title, type, time and IP', async () => {
    const events: AuditLogEvent[] = [
      {
        id: 'e1',
        created_at: '2026-11-20T10:00:00Z',
        event_type: 'api_key_created',
        description: 'Created API key "POS"',
        ip_address: '203.0.113.7',
      },
      { id: 'e2', created_at: 'not-a-date', event_type: 'sign-in' },
      { id: 'e3', created_at: '' },
    ]
    mockList.mockResolvedValue(events)
    render(<AuditLogPage />)

    expect(await screen.findByText('Created API key "POS"')).toBeInTheDocument()
    expect(screen.getByText('api key created')).toBeInTheDocument()
    expect(screen.getByText(/IP 203\.0\.113\.7/)).toBeInTheDocument()
    // No description: the event type is the title, and an unparseable time is shown as-is.
    expect(screen.getAllByText('sign in')).toHaveLength(2)
    expect(screen.getByText('not-a-date')).toBeInTheDocument()
    // Neither: a generic title and an unknown time.
    expect(screen.getByText('Security event')).toBeInTheDocument()
    expect(screen.getByText('Unknown time')).toBeInTheDocument()
    expect(mockList).toHaveBeenCalledWith('tok', expect.any(AbortSignal))
  })

  it('shows an empty state when there are no events', async () => {
    mockList.mockResolvedValue([])
    render(<AuditLogPage />)
    expect(await screen.findByText(/No recent security events yet/)).toBeInTheDocument()
  })

  it.each([404, 501])('explains the endpoint is not available yet (%i)', async (status) => {
    mockList.mockRejectedValue(new ApiError('not found', status))
    render(<AuditLogPage />)
    expect(await screen.findByText('Audit log coming soon')).toBeInTheDocument()
    expect(screen.getByText(/until the audit log service is connected/)).toBeInTheDocument()
  })

  it('shows other errors with a retry', async () => {
    mockList.mockRejectedValueOnce(new ApiError('Server down', 500)).mockResolvedValue([])
    render(<AuditLogPage />)
    await userEvent.click(await screen.findByRole('button', { name: /try again/i }))
    expect(await screen.findByText(/No recent security events yet/)).toBeInTheDocument()
    expect(mockList).toHaveBeenCalledTimes(2)
  })

  it('treats a non-array response as no events', async () => {
    mockList.mockResolvedValue({ unexpected: true })
    render(<AuditLogPage />)
    expect(await screen.findByText(/No recent security events yet/)).toBeInTheDocument()
  })
})
