import { render, screen } from '@testing-library/react'

import { TopAssets } from '../top-assets'
import { ActivityHighlights } from '../activity-highlights'
import { QuickConvert } from '../quick-convert'
import type { Balance, Payment, PaymentRequest } from '@/lib/api'

const REACT_MEMO_TYPE = Symbol.for('react.memo')

const BALANCES: Balance[] = [
  { merchant_id: 'm-1', asset: 'XLM', available: 100n, pending: 0n } as Balance,
]

const PAYMENTS: Payment[] = []

const OPEN_REQUESTS: PaymentRequest[] = []

// `React.memo` skips re-rendering a component whenever its props are shallowly
// equal to the previous render — that bail-out is React's own guarantee, not
// something a re-render count can usefully re-prove in a jsdom test (the
// Profiler's onRender fires once per *commit* that reaches a subtree, even
// when the memoized child inside it bails out, so counting calls doesn't
// distinguish "skipped" from "rendered"). What a test *can* pin down is that
// the component is actually wrapped in memo() in the first place, and that
// wrapping it didn't change what it renders.
describe('TopAssets, ActivityHighlights, and QuickConvert are memoized', () => {
  it('TopAssets is wrapped with React.memo and still renders balances', () => {
    expect(TopAssets.$$typeof).toBe(REACT_MEMO_TYPE)

    render(<TopAssets balances={BALANCES} />)
    expect(screen.getByText('XLM')).toBeInTheDocument()
  })

  it('ActivityHighlights is wrapped with React.memo and still renders', () => {
    expect(ActivityHighlights.$$typeof).toBe(REACT_MEMO_TYPE)

    render(<ActivityHighlights payments={PAYMENTS} openRequestCount={3} />)
    expect(screen.getByText('Activity highlights')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('QuickConvert is wrapped with React.memo and still renders', () => {
    expect(QuickConvert.$$typeof).toBe(REACT_MEMO_TYPE)

    render(<QuickConvert openRequests={OPEN_REQUESTS} />)
    expect(screen.getByText('No open charges right now.')).toBeInTheDocument()
  })
})
