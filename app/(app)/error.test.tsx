import { render, screen, fireEvent } from '@testing-library/react'
import * as Sentry from '@sentry/nextjs'
import AppError from './error'
import { ApiError } from '@/lib/api'

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

const mockCaptureException = Sentry.captureException as jest.Mock

beforeEach(() => {
  mockCaptureException.mockReset()
})

describe('app/(app)/error.tsx', () => {
  it('reports the error to Sentry on mount', () => {
    const error = new Error('Boom')
    render(<AppError error={error} reset={jest.fn()} />)

    expect(mockCaptureException).toHaveBeenCalledTimes(1)
    expect(mockCaptureException).toHaveBeenCalledWith(error)
  })

  it('shows a generic message for a regular error, inside a dark scope', () => {
    const { container } = render(<AppError error={new Error('Boom')} reset={jest.fn()} />)

    expect(container.querySelector('.dark.bg-ink')).toBeInTheDocument()
    expect(screen.getByText('500')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(
      screen.getByText("The page couldn't load. Try again, and if it keeps happening let us know.")
    ).toBeInTheDocument()
  })

  it('shows a backend-down message when the error is a network ApiError', () => {
    render(<AppError error={new ApiError('Network error', 0)} reset={jest.fn()} />)

    expect(screen.getByText('Payment server unreachable')).toBeInTheDocument()
    expect(
      screen.getByText("We can't connect to the payment server right now. Please try again in a moment.")
    ).toBeInTheDocument()
  })

  it('does not treat a non-zero status ApiError as backend-down', () => {
    render(<AppError error={new ApiError('Not found', 404)} reset={jest.fn()} />)

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('calls reset when "Try again" is clicked', () => {
    const reset = jest.fn()
    render(<AppError error={new Error('Boom')} reset={reset} />)

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('links "Go home" to the dashboard, not the marketing root', () => {
    render(<AppError error={new Error('Boom')} reset={jest.fn()} />)

    expect(screen.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/home')
  })
})
