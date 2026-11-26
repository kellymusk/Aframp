import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActiveSessions } from '../active-sessions'
import { api } from '@/lib/api'

jest.mock('@/components/session-provider', () => ({
  useAuthenticatedSession: () => ({ token: 'tok', userId: 'u1', merchantId: 'm1' }),
}))

jest.mock('@/lib/api', () => ({
  api: {
    listSessions: jest.fn(),
    revokeSession: jest.fn(),
  },
}))

const mockList = api.listSessions as jest.Mock
const mockRevoke = api.revokeSession as jest.Mock

const sessions = [
  {
    id: 's-current',
    device: 'Chrome on Windows',
    ip: '102.89.1.1',
    created_at: '2026-11-20T08:00:00Z',
    last_seen_at: '2026-11-24T09:00:00Z',
    current: true,
  },
  {
    id: 's-phone',
    device: 'Aframp on Android',
    ip: '102.89.2.2',
    created_at: '2026-11-10T08:00:00Z',
    last_seen_at: '2026-11-22T09:00:00Z',
  },
]

describe('ActiveSessions', () => {
  beforeEach(() => {
    mockList.mockReset()
    mockRevoke.mockReset()
  })

  it('lists sessions and marks the current device', async () => {
    mockList.mockResolvedValue(sessions)
    render(<ActiveSessions />)

    expect(await screen.findByText('Chrome on Windows')).toBeInTheDocument()
    expect(screen.getByText('Aframp on Android')).toBeInTheDocument()
    expect(screen.getByText('This device')).toBeInTheDocument()
    expect(mockList).toHaveBeenCalledWith('tok', expect.any(AbortSignal))
    // Only the other device can be signed out from here.
    expect(screen.getAllByRole('button', { name: /sign out/i })).toHaveLength(1)
  })

  it('revokes another device and removes it from the list', async () => {
    const user = userEvent.setup()
    mockList.mockResolvedValue(sessions)
    mockRevoke.mockResolvedValue(undefined)
    render(<ActiveSessions />)

    await user.click(await screen.findByRole('button', { name: /sign out aframp on android/i }))

    expect(mockRevoke).toHaveBeenCalledWith('tok', 's-phone')
    await waitFor(() => expect(screen.queryByText('Aframp on Android')).not.toBeInTheDocument())
    expect(screen.getByText('Chrome on Windows')).toBeInTheDocument()
  })

  it('keeps the device listed and shows an error when revoking fails', async () => {
    const user = userEvent.setup()
    mockList.mockResolvedValue(sessions)
    mockRevoke.mockRejectedValue(new Error('Session not found'))
    render(<ActiveSessions />)

    await user.click(await screen.findByRole('button', { name: /sign out aframp on android/i }))

    expect(await screen.findByText('Session not found')).toBeInTheDocument()
    expect(screen.getByText('Aframp on Android')).toBeInTheDocument()
  })

  it('shows an error when the sessions cannot be loaded', async () => {
    mockList.mockRejectedValue(new Error('Could not reach the server'))
    render(<ActiveSessions />)

    expect(await screen.findByText('Could not reach the server')).toBeInTheDocument()
  })
})
