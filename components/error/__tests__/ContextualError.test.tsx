import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as Sentry from '@sentry/nextjs'
import ContextualError, { classifyError } from '../ContextualError'
import { ApiError } from '@/lib/api/shared'

const replace = jest.fn()
const back = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace, back }),
}))

// Jest's resolver can't match @sentry/nextjs's export conditions under this
// repo's config, so register the mock without resolving the real package.
jest.mock(
  '@sentry/nextjs',
  () => ({
    captureException: jest.fn(),
  }),
  { virtual: true }
)

beforeEach(() => {
  jest.clearAllMocks()
})

function renderError(error: Error) {
  const reset = jest.fn()
  render(<ContextualError error={error} reset={reset} homeHref="/home" />)
  return reset
}

describe('classifyError', () => {
  it.each([
    [new ApiError('offline', 0), 'network'],
    [new TypeError('Failed to fetch'), 'network'],
    [new ApiError('expired', 401), 'unauthorized'],
    [new ApiError('missing', 404), 'not-found'],
    [new ApiError('boom', 500), 'server'],
    [new ApiError('bad gateway', 503), 'server'],
    [new ApiError('invalid', 400), 'unknown'],
    [new Error('render crash'), 'unknown'],
  ])('classifies %p as %s', (error, kind) => {
    expect(classifyError(error)).toBe(kind)
  })
})

describe('ContextualError', () => {
  it('says the payment server is unreachable when the device is online', async () => {
    const reset = renderError(new ApiError('offline', 0))
    expect(screen.getByText('Payment server unreachable')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(reset).toHaveBeenCalled()
  })

  it('asks the user to check their connection when the device is offline', () => {
    const onLine = jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    renderError(new ApiError('offline', 0))
    expect(screen.getByText("You're offline")).toBeInTheDocument()
    expect(screen.getByText('Check your connection and retry.')).toBeInTheDocument()
    onLine.mockRestore()
  })

  it('classifies any error as network while the browser is offline', () => {
    const onLine = jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    expect(classifyError(new Error('render crash'))).toBe('network')
    onLine.mockRestore()
  })

  it('shows the generic message with retry for unknown errors', async () => {
    const reset = renderError(new Error('render crash'))
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(reset).toHaveBeenCalled()
  })

  it('shows the session-expired message with a login link on 401', () => {
    renderError(new ApiError('expired', 401))
    expect(screen.getByText('Session expired')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login')
  })

  it('redirects to login on 401', () => {
    renderError(new ApiError('expired', 401))
    expect(replace).toHaveBeenCalledWith('/login')
  })

  it('offers a Go back button on 404', async () => {
    renderError(new ApiError('missing', 404))
    await userEvent.click(screen.getByRole('button', { name: 'Go back' }))
    expect(back).toHaveBeenCalled()
  })

  it('shows the server trouble message on 5xx', () => {
    renderError(new ApiError('boom', 502))
    expect(
      screen.getByText('Our servers are having trouble — try again in a moment.')
    ).toBeInTheDocument()
  })

  it.each([0, 401, 404, 500])('reports status %i errors to Sentry', (status) => {
    const error = new ApiError('x', status)
    renderError(error)
    expect(Sentry.captureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({ tags: { error_kind: classifyError(error) } })
    )
  })
})
