import { render, screen } from '@testing-library/react'
import RootError from '../error'
import AppError from '../(app)/error'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), back: jest.fn() }),
}))

// See components/error/__tests__/ContextualError.test.tsx for why this is virtual.
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }), { virtual: true })

describe('error boundaries', () => {
  it('sends the public site home to /', () => {
    render(<RootError error={new Error('boom')} reset={jest.fn()} />)
    expect(screen.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/')
  })

  it('sends the dashboard home to /home inside the dark theme', () => {
    const { container } = render(<AppError error={new Error('boom')} reset={jest.fn()} />)
    expect(screen.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/home')
    expect(container.firstChild).toHaveClass('dark')
  })
})
