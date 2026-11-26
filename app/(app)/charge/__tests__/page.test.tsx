import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { api, ApiError } from '@/lib/api'
import ChargePage from '../page'

jest.mock('@/lib/api', () => {
  class ApiError extends Error {
    constructor(
      message: string,
      readonly status: number
    ) {
      super(message)
      this.name = 'ApiError'
    }
  }
  return {
    api: { createPaymentRequest: jest.fn() },
    ApiError,
  }
})

jest.mock('@/components/session-provider', () => ({
  useAuthenticatedSession: () => ({ token: 'test-token' }),
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

const mockCreatePaymentRequest = api.createPaymentRequest as jest.Mock

describe('ChargePage', () => {
  const push = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push })
    mockCreatePaymentRequest.mockResolvedValue({ id: 'req-1' })
  })

  async function enterAmount(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: '2' }))
    await user.click(screen.getByRole('button', { name: '5' }))
  }

  it('offers XLM and cNGN and defaults to XLM', () => {
    render(<ChargePage />)
    const assetGroup = screen.getByRole('group', { name: 'Asset' })

    expect(assetGroup).toHaveTextContent('XLM')
    expect(assetGroup).toHaveTextContent('cNGN')
    expect(screen.getByRole('button', { name: 'XLM' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'cNGN' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('creates an XLM charge by default', async () => {
    const user = userEvent.setup()
    render(<ChargePage />)

    await enterAmount(user)
    await user.click(screen.getByRole('button', { name: 'Show payment code' }))

    await waitFor(() =>
      expect(mockCreatePaymentRequest).toHaveBeenCalledWith(
        'test-token',
        250_000_000n,
        'XLM',
        undefined,
        false
      )
    )
    expect(push).toHaveBeenCalledWith('/request/req-1')
  })

  it('creates a cNGN charge when the merchant selects cNGN', async () => {
    const user = userEvent.setup()
    render(<ChargePage />)

    await user.click(screen.getByRole('button', { name: 'cNGN' }))
    await enterAmount(user)

    expect(screen.getByText('25').parentElement).toHaveTextContent('cNGN')
    expect(screen.getByRole('button', { name: 'cNGN' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Show payment code' }))

    await waitFor(() =>
      expect(mockCreatePaymentRequest).toHaveBeenCalledWith(
        'test-token',
        250_000_000n,
        'cNGN',
        undefined,
        false
      )
    )
  })

  it('forwards allow partial payment with the chosen asset', async () => {
    const user = userEvent.setup()
    render(<ChargePage />)

    await user.click(screen.getByRole('button', { name: 'cNGN' }))
    await user.click(screen.getByRole('checkbox', { name: 'Allow partial payment' }))
    await enterAmount(user)
    await user.click(screen.getByRole('button', { name: 'Show payment code' }))

    await waitFor(() =>
      expect(mockCreatePaymentRequest).toHaveBeenCalledWith(
        'test-token',
        250_000_000n,
        'cNGN',
        undefined,
        true
      )
    )
  })

  it('shows a backend error without navigating away', async () => {
    const user = userEvent.setup()
    mockCreatePaymentRequest.mockRejectedValue(new ApiError('Issuer not configured', 400))
    render(<ChargePage />)

    await user.click(screen.getByRole('button', { name: 'cNGN' }))
    await enterAmount(user)
    await user.click(screen.getByRole('button', { name: 'Show payment code' }))

    expect(await screen.findByText('Issuer not configured')).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Show payment code' })).toBeEnabled()
  })

  it('clears an error when the merchant switches asset', async () => {
    const user = userEvent.setup()
    mockCreatePaymentRequest.mockRejectedValueOnce(new ApiError('Try again', 500))
    render(<ChargePage />)

    await enterAmount(user)
    await user.click(screen.getByRole('button', { name: 'Show payment code' }))
    expect(await screen.findByText('Try again')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'cNGN' }))
    expect(screen.queryByText('Try again')).not.toBeInTheDocument()
  })
})
