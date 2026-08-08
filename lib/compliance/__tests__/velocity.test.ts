/**
 * Velocity rule tests.
 *
 * Each rule is tested for three things:
 *   - it fires when it should
 *   - it does NOT fire just below its threshold (the boundary is where tuning
 *     arguments happen, so it is pinned)
 *   - the evidence it records is the evidence an analyst needs
 *
 * `now` is injected everywhere rather than mocking the clock, so histories can
 * be built relative to a fixed instant and the tests stay readable.
 */

import { DAY_MS, HOUR_MS, JURISDICTIONS, UNLICENSED_MARKET_POLICY, VELOCITY_RULES } from '../config'
import { _clearLedger, recordTransaction } from '../ledger'
import type { ScreeningSubject, SignalCode } from '../types'
import { evaluateVelocityRules } from '../velocity'

const NOW = new Date('2026-03-15T12:00:00.000Z')
const USER = 'GTESTWALLET000000000000000000000000000000000000000000'

let sequence = 0

/** Adds a ledger entry `agoMs` before NOW. */
function seed(
  agoMs: number,
  amountCents: number,
  kind: 'onramp' | 'offramp' | 'billpay' = 'offramp',
  counterpartyKey?: string
) {
  recordTransaction({
    transactionId: `tx_${sequence++}`,
    userId: USER,
    kind,
    amountCents,
    asset: 'USDC',
    chain: 'Stellar',
    counterpartyKey,
    decision: 'ALLOW',
    riskScore: 0,
    occurredAt: new Date(NOW.getTime() - agoMs),
  })
}

function subject(overrides: Partial<ScreeningSubject> = {}): ScreeningSubject {
  return {
    transactionId: 'tx_subject',
    userId: USER,
    kind: 'offramp',
    amountCents: 100_00,
    asset: 'USDC',
    chain: 'Stellar',
    jurisdiction: 'NG',
    ...overrides,
  }
}

function codes(signals: ReturnType<typeof evaluateVelocityRules>): SignalCode[] {
  return signals.map((s) => s.code)
}

function run(overrides: Partial<ScreeningSubject> = {}) {
  return evaluateVelocityRules(subject(overrides), { now: NOW })
}

beforeEach(() => {
  _clearLedger()
  sequence = 0
})

// ---------------------------------------------------------------------------

describe('VELOCITY_TX_COUNT', () => {
  const { maxCount } = VELOCITY_RULES.txCount

  it('fires once the count including the current transaction exceeds the cap', () => {
    for (let i = 0; i < maxCount; i++) seed(HOUR_MS, 10_00)
    expect(codes(run())).toContain('VELOCITY_TX_COUNT')
  })

  it('does not fire exactly at the cap', () => {
    for (let i = 0; i < maxCount - 1; i++) seed(HOUR_MS, 10_00)
    expect(codes(run())).not.toContain('VELOCITY_TX_COUNT')
  })

  it('ignores transactions outside the window', () => {
    for (let i = 0; i < maxCount + 5; i++) seed(2 * DAY_MS, 10_00)
    expect(codes(run())).not.toContain('VELOCITY_TX_COUNT')
  })

  it('records the observed count and threshold', () => {
    for (let i = 0; i < maxCount; i++) seed(HOUR_MS, 10_00)
    const signal = run().find((s) => s.code === 'VELOCITY_TX_COUNT')
    expect(signal?.metadata).toMatchObject({
      observedCount: maxCount + 1,
      threshold: maxCount,
    })
  })
})

describe('VELOCITY_VOLUME', () => {
  const { maxVolumeCents } = VELOCITY_RULES.volume

  it('counts the transaction being screened, not just history', () => {
    // History alone is under the ceiling; the subject pushes it over.  A rule
    // that only looked at history would let the breaching transaction through.
    seed(HOUR_MS, maxVolumeCents - 50_00)
    expect(codes(run({ amountCents: 100_00 }))).toContain('VELOCITY_VOLUME')
  })

  it('does not fire when the total lands exactly on the ceiling', () => {
    seed(HOUR_MS, maxVolumeCents - 100_00)
    expect(codes(run({ amountCents: 100_00 }))).not.toContain('VELOCITY_VOLUME')
  })
})

describe('VELOCITY_SPIKE', () => {
  it('fires when today far exceeds the account trailing average', () => {
    // 30 days of ~$20/day, then a $2,000 day.
    for (let day = 2; day <= 30; day++) seed(day * DAY_MS, 20_00)
    expect(codes(run({ amountCents: 2_000_00 }))).toContain('VELOCITY_SPIKE')
  })

  it('stays silent on a new account with no baseline', () => {
    // The rule must not fire on a first real transaction — every new user would
    // trivially clear any multiple of ~zero.
    seed(HOUR_MS, 10_00)
    expect(codes(run({ amountCents: 5_000_00 }))).not.toContain('VELOCITY_SPIKE')
  })

  it('stays silent when the trailing baseline is negligible', () => {
    // Long history, but almost no value in it — a $2 baseline should not make
    // a $100 transaction a "50× spike".
    for (let day = 2; day <= 30; day++) seed(day * DAY_MS, 1)
    expect(codes(run({ amountCents: 100_00 }))).not.toContain('VELOCITY_SPIKE')
  })

  it('does not compare the spike against itself', () => {
    // Today's own volume is excluded from the baseline; if it were included,
    // a large day would inflate its own mean and hide the ratio.
    for (let day = 2; day <= 30; day++) seed(day * DAY_MS, 20_00)
    seed(HOUR_MS, 1_500_00) // earlier today
    const signal = run({ amountCents: 500_00 }).find((s) => s.code === 'VELOCITY_SPIKE')
    expect(signal).toBeDefined()
    expect(signal?.metadata?.todayCents).toBe(2_000_00)
  })
})

describe('STRUCTURING', () => {
  const threshold = JURISDICTIONS.NG.reportingThresholdCents
  const inBand = Math.round(threshold * 0.9) // comfortably inside the 20% band

  it('fires on repeated sub-threshold transactions that sum past the threshold', () => {
    seed(DAY_MS, inBand)
    seed(2 * DAY_MS, inBand)
    expect(codes(run({ amountCents: inBand }))).toContain('STRUCTURING')
  })

  it('does not fire when the current transaction is not in the band', () => {
    seed(DAY_MS, inBand)
    seed(2 * DAY_MS, inBand)
    // Well below the band — this is not a structured piece.
    expect(codes(run({ amountCents: 10_00 }))).not.toContain('STRUCTURING')
  })

  it('does not fire below the minimum count', () => {
    seed(DAY_MS, inBand)
    expect(codes(run({ amountCents: inBand }))).not.toContain('STRUCTURING')
  })

  it('is jurisdiction-aware', () => {
    // The same amounts against a market with a higher threshold are no longer
    // "just below" anything.
    seed(DAY_MS, inBand)
    seed(2 * DAY_MS, inBand)
    expect(codes(run({ amountCents: inBand, jurisdiction: 'KE' }))).not.toContain(
      'STRUCTURING'
    )
  })

  it('records the threshold it measured against', () => {
    seed(DAY_MS, inBand)
    seed(2 * DAY_MS, inBand)
    const signal = run({ amountCents: inBand }).find((s) => s.code === 'STRUCTURING')
    expect(signal?.metadata).toMatchObject({
      bandedCount: 3,
      reportingThresholdCents: threshold,
      jurisdiction: 'NG',
    })
  })

  it('still runs in a market with no local AML registration', () => {
    // Structuring detection must not switch off just because there is nowhere
    // to file the result — the transaction is still held and reviewed.
    const unlicensedBand = Math.round(
      UNLICENSED_MARKET_POLICY.reportingThresholdCents * 0.9
    )
    seed(DAY_MS, unlicensedBand)
    seed(2 * DAY_MS, unlicensedBand)

    const signal = run({ amountCents: unlicensedBand, jurisdiction: 'TZ' }).find(
      (s) => s.code === 'STRUCTURING'
    )

    expect(signal).toBeDefined()
    expect(signal?.metadata).toMatchObject({
      jurisdiction: 'TZ',
      reportingThresholdCents: UNLICENSED_MARKET_POLICY.reportingThresholdCents,
    })
  })
})

describe('RAPID_RAMP_REVERSAL', () => {
  it('fires when an offramp reverses a recent onramp of similar size', () => {
    seed(2 * HOUR_MS, 1_000_00, 'onramp')
    expect(codes(run({ kind: 'offramp', amountCents: 1_000_00 }))).toContain(
      'RAPID_RAMP_REVERSAL'
    )
  })

  it('ignores a counterpart of materially different value', () => {
    seed(2 * HOUR_MS, 1_000_00, 'onramp')
    expect(codes(run({ kind: 'offramp', amountCents: 5_000_00 }))).not.toContain(
      'RAPID_RAMP_REVERSAL'
    )
  })

  it('ignores a counterpart outside the window', () => {
    seed(2 * DAY_MS, 1_000_00, 'onramp')
    expect(codes(run({ kind: 'offramp', amountCents: 1_000_00 }))).not.toContain(
      'RAPID_RAMP_REVERSAL'
    )
  })

  it('ignores same-direction transactions', () => {
    seed(2 * HOUR_MS, 1_000_00, 'offramp')
    expect(codes(run({ kind: 'offramp', amountCents: 1_000_00 }))).not.toContain(
      'RAPID_RAMP_REVERSAL'
    )
  })

  it('ignores small round-trips, which are usually genuine mistakes', () => {
    seed(HOUR_MS, 50_00, 'onramp')
    expect(codes(run({ kind: 'offramp', amountCents: 50_00 }))).not.toContain(
      'RAPID_RAMP_REVERSAL'
    )
  })
})

describe('COUNTERPARTY_FANOUT', () => {
  const { maxCounterparties } = VELOCITY_RULES.counterpartyFanout

  it('fires past the distinct-recipient cap', () => {
    for (let i = 0; i <= maxCounterparties; i++) {
      seed(HOUR_MS, 10_00, 'offramp', `cp_${i}`)
    }
    expect(codes(run())).toContain('COUNTERPARTY_FANOUT')
  })

  it('counts distinct recipients, not transaction volume', () => {
    // Many transactions to one recipient is not fan-out.
    for (let i = 0; i < maxCounterparties * 3; i++) {
      seed(HOUR_MS, 10_00, 'offramp', 'cp_same')
    }
    expect(codes(run())).not.toContain('COUNTERPARTY_FANOUT')
  })
})

describe('NEW_ACCOUNT_HIGH_VALUE', () => {
  it('fires on a large first transaction', () => {
    expect(codes(run({ amountCents: 5_000_00 }))).toContain('NEW_ACCOUNT_HIGH_VALUE')
  })

  it('does not fire on a small first transaction', () => {
    expect(codes(run({ amountCents: 10_00 }))).not.toContain('NEW_ACCOUNT_HIGH_VALUE')
  })

  it('does not fire on an established account', () => {
    expect(
      codes(
        run({
          amountCents: 5_000_00,
          accountCreatedAt: new Date(NOW.getTime() - 60 * DAY_MS),
        })
      )
    ).not.toContain('NEW_ACCOUNT_HIGH_VALUE')
  })
})

describe('DORMANT_REACTIVATION', () => {
  it('fires on a large transaction after a long silence', () => {
    seed(120 * DAY_MS, 50_00)
    expect(codes(run({ amountCents: 2_000_00 }))).toContain('DORMANT_REACTIVATION')
  })

  it('does not fire on a recently active account', () => {
    seed(2 * DAY_MS, 50_00)
    expect(codes(run({ amountCents: 2_000_00 }))).not.toContain('DORMANT_REACTIVATION')
  })

  it('does not fire on an account with no history — that is newness, not dormancy', () => {
    expect(codes(run({ amountCents: 2_000_00 }))).not.toContain('DORMANT_REACTIVATION')
  })
})

describe('evaluateVelocityRules', () => {
  it('returns nothing for an unremarkable transaction', () => {
    seed(2 * DAY_MS, 100_00)
    seed(3 * DAY_MS, 120_00)
    expect(run({ amountCents: 110_00 })).toEqual([])
  })

  it('accumulates independent signals', () => {
    // A large first transaction that also round-trips a recent onramp.
    seed(HOUR_MS, 3_000_00, 'onramp')
    const fired = codes(run({ kind: 'offramp', amountCents: 3_000_00 }))
    expect(fired).toContain('RAPID_RAMP_REVERSAL')
    expect(fired).toContain('NEW_ACCOUNT_HIGH_VALUE')
  })

  it('does not read another account history', () => {
    for (let i = 0; i < 50; i++) seed(HOUR_MS, 100_00)
    expect(run({ userId: 'GOTHERWALLET', amountCents: 100_00 })).toEqual([])
  })
})
