import { render, screen, waitFor } from '@testing-library/react'
import { DemoModeProvider } from '@/components/demo-mode-provider'

// `setupWorker()` (called at module scope in lib/msw/browser.ts) refuses to
// run outside a real browser, so it can't be constructed for real under
// jsdom -- mock the whole module instead of dynamically importing it.
const start = jest.fn().mockResolvedValue(undefined)
jest.mock('@/lib/msw/browser', () => ({
  worker: { start: (...args: unknown[]) => start(...args) },
}))

const ORIGINAL_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE

afterEach(() => {
  process.env.NEXT_PUBLIC_DEMO_MODE = ORIGINAL_DEMO_MODE
  start.mockClear()
  start.mockResolvedValue(undefined)
  jest.restoreAllMocks()
})

describe('DemoModeProvider when NEXT_PUBLIC_DEMO_MODE is not "true"', () => {
  it('renders children immediately, without starting the mock worker', () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'false'

    render(
      <DemoModeProvider>
        <p>real app</p>
      </DemoModeProvider>
    )

    expect(screen.getByText('real app')).toBeInTheDocument()
    expect(screen.queryByText(/starting demo mode/i)).not.toBeInTheDocument()
    expect(start).not.toHaveBeenCalled()
  })
})

describe('DemoModeProvider when NEXT_PUBLIC_DEMO_MODE is "true"', () => {
  it('shows a loading state, starts the mock worker, then renders children', async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true'

    render(
      <DemoModeProvider>
        <p>real app</p>
      </DemoModeProvider>
    )

    expect(screen.getByText(/starting demo mode/i)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('real app')).toBeInTheDocument())
    expect(start).toHaveBeenCalledWith({ onUnhandledRequest: 'bypass' })
  })

  it('still renders children if the worker fails to start', async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true'
    start.mockRejectedValueOnce(new Error('demo worker failed'))
    jest.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <DemoModeProvider>
        <p>real app</p>
      </DemoModeProvider>
    )

    await waitFor(() => expect(screen.getByText('real app')).toBeInTheDocument())
  })
})
