import { render, screen } from '@testing-library/react'
import KycPage from '../page'

let mockSession: { me: { kyc_status?: string | null } | null; meLoading: boolean; meError: unknown }

jest.mock('@/components/session-provider', () => ({
  useSession: () => mockSession,
}))

beforeEach(() => {
  mockSession = { me: null, meLoading: false, meError: null }
})

describe('KycPage', () => {
  it('shows a spinner while /me loads', () => {
    mockSession.meLoading = true
    render(<KycPage />)
    expect(screen.queryByRole('heading', { name: 'Identity verification' })).not.toBeInTheDocument()
  })

  it('links an approved merchant to Cash out', () => {
    mockSession.me = { kyc_status: 'approved' }
    render(<KycPage />)
    expect(screen.getByText('Your identity is verified. You can cash out.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to Cash out' })).toHaveAttribute(
      'href',
      '/withdraw'
    )
  })

  it.each([
    ['pending', /being reviewed/],
    ['rejected', /could not verify your identity/],
    [null, /not verified your identity yet/],
  ])('explains the %p status and links back home', (status, message) => {
    mockSession.me = { kyc_status: status }
    render(<KycPage />)
    expect(screen.getByText(message)).toBeInTheDocument()
    expect(screen.getByText(status ?? 'not started')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/home')
  })

  it('says so when the status could not be loaded', () => {
    mockSession.meError = new Error('offline')
    render(<KycPage />)
    expect(screen.getByText(/could not load your verification status/)).toBeInTheDocument()
  })
})
