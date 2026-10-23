import * as Sentry from '@sentry/nextjs'
import { captureError, log } from '../observability'

// See components/error/__tests__/ContextualError.test.tsx for why this is virtual.
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn(), addBreadcrumb: jest.fn() }), {
  virtual: true,
})

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('captureError', () => {
  it('reports to Sentry with context as extra data', () => {
    const error = new Error('boom')
    captureError(error, { where: 'contacts' })
    expect(Sentry.captureException).toHaveBeenCalledWith(error, { extra: { where: 'contacts' } })
  })

  it('reports without extra data when there is no context', () => {
    const error = new Error('boom')
    captureError(error)
    expect(Sentry.captureException).toHaveBeenCalledWith(error, undefined)
  })

  it('keeps a console trace outside production', () => {
    captureError(new Error('boom'))
    expect(console.error).toHaveBeenCalled()
  })
})

describe('log', () => {
  it('sends errors to Sentry', () => {
    log('error', 'payment failed', { id: 'p1' })
    expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(Error), {
      extra: { id: 'p1' },
    })
  })

  it('prints warnings to the console', () => {
    log('warning', 'slow response')
    expect(console.warn).toHaveBeenCalledWith('slow response', '')
    expect(Sentry.captureException).not.toHaveBeenCalled()
  })

  it('records info events as breadcrumbs', () => {
    log('info', 'opened settings', { tab: 'profile' })
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
      level: 'info',
      message: 'opened settings',
      data: { tab: 'profile' },
    })
  })
})
