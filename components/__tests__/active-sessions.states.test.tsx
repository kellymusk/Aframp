import { render, screen } from '@testing-library/react'
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

describe('ActiveSessions states', () => {
  beforeEach(() => {
    mockList.mockReset()
  })

  it('shows no sessions and no sign-out buttons for an empty list', async () => {
    mockList.mockResolvedValue([])
    render(<ActiveSessions />)

    expect(await screen.findByRole('heading', { name: /active sessions/i })).toBeInTheDocument()
    await screen.findByRole('list')
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument()
  })

  it('names a device without a description and omits a missing IP address', async () => {
    mockList.mockResolvedValue([
      {
        id: 's-anon',
        device: null,
        ip: null,
        created_at: '2026-11-10T08:00:00Z',
        last_seen_at: '2026-11-22T09:00:00Z',
      },
    ])
    render(<ActiveSessions />)

    expect(await screen.findByText('Unknown device')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign out unknown device' })).toBeInTheDocument()
    expect(screen.getByText(/^Last active/)).not.toHaveTextContent('·')
  })

  it('does not offer sign out for the current device, even when it is the only one', async () => {
    mockList.mockResolvedValue([
      {
        id: 's-current',
        device: 'Chrome on Windows',
        ip: '102.89.1.1',
        created_at: '2026-11-20T08:00:00Z',
        last_seen_at: '2026-11-24T09:00:00Z',
        current: true,
      },
    ])
    render(<ActiveSessions />)

    expect(await screen.findByText('This device')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument()
  })
})
