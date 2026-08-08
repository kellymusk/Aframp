/**
 * End-to-end screening tests.
 *
 * These cover the behaviours that make the difference between a control and a
 * decoration:
 *
 *   - a sanctions hit blocks, and blocks regardless of accumulated score
 *   - a provider outage does NOT silently approve
 *   - blocked attempts are still recorded, so probing behaviour stays visible
 *   - a case is opened for everything held or blocked, exactly once
 */

import { _clearCases, getCaseByTransaction } from '../case-store'
import { _clearLedger, _ledger } from '../ledger'
import { screenTransaction } from '../monitor'
import { _resetProviders } from '../providers'
import { _resetSanctionsList, _setSanctionsEntities } from '../sanctions/list'
import type { ScreeningSubject } from '../types'

const NOW = new Date('2026-03-15T12:00:00.000Z')
const USER = 'GTESTWALLET000000000000000000000000000000000000000000'
const SANCTIONED_ADDRESS = 'gsanctionedaddressfortestsonly0000000000000000000000'

function subject(overrides: Partial<ScreeningSubject> = {}): ScreeningSubject {
  return {
    transactionId: `tx_${Math.random().toString(36).slice(2)}`,
    userId: USER,
    kind: 'offramp',
    amountCents: 100_00,
    asset: 'USDC',
    chain: 'Stellar',
    jurisdiction: 'NG',
    ...overrides,
  }
}

beforeEach(() => {
  _clearLedger()
  _clearCases()
  _resetProviders()
  _resetSanctionsList()

  // Local providers by default — no network, deterministic.
  process.env.COMPLIANCE_WALLET_PROVIDER = 'local'
  process.env.COMPLIANCE_NAME_PROVIDER = 'local'
  process.env.COMPLIANCE_HASH_SALT = 'test-salt'

  _setSanctionsEntities([
    {
      id: 'TEST-001',
      source: 'DEV FIXTURE',
      name: 'Ibrahim Musa Danjuma',
      aliases: ['Ibraheem Moussa Danjouma'],
      entityType: 'INDIVIDUAL',
      matchTypes: ['SANCTION'],
      countries: ['NG'],
      cryptoAddresses: [SANCTIONED_ADDRESS],
    },
    {
      id: 'TEST-002',
      source: 'DEV FIXTURE',
      name: 'Nomvula Precious Sithole',
      aliases: [],
      entityType: 'INDIVIDUAL',
      matchTypes: ['PEP'],
      countries: ['ZA'],
      cryptoAddresses: [],
    },
  ])
})

afterAll(() => {
  delete process.env.COMPLIANCE_WALLET_PROVIDER
  delete process.env.COMPLIANCE_NAME_PROVIDER
  delete process.env.COMPLIANCE_HASH_SALT
})

// ---------------------------------------------------------------------------

describe('clean transactions', () => {
  it('allows an unremarkable transaction and opens no case', async () => {
    const result = await screenTransaction(
      subject({ accountName: 'Grace Achieng', amountCents: 50_00 }),
      { now: NOW }
    )

    expect(result.decision).toBe('ALLOW')
    expect(result.riskScore).toBe(0)
    expect(result.signals).toEqual([])
    expect(result.caseId).toBeUndefined()
  })

  it('records allowed transactions in the monitoring ledger', async () => {
    const input = subject({ amountCents: 50_00 })
    await screenTransaction(input, { now: NOW })

    expect(_ledger.get(USER)).toHaveLength(1)
    expect(_ledger.get(USER)?.[0]).toMatchObject({
      transactionId: input.transactionId,
      decision: 'ALLOW',
    })
  })
})

describe('sanctions screening', () => {
  it('blocks a designated wallet address', async () => {
    const result = await screenTransaction(
      subject({ walletAddress: SANCTIONED_ADDRESS, amountCents: 10_00 }),
      { now: NOW }
    )

    expect(result.decision).toBe('BLOCK')
    expect(result.signals.map((s) => s.code)).toContain('WALLET_SEVERE_RISK')
  })

  it('blocks a designated address on an otherwise trivial amount', async () => {
    // A designation is a legal prohibition, so it must not be outweighed by the
    // transaction looking harmless.
    const result = await screenTransaction(
      subject({ walletAddress: SANCTIONED_ADDRESS, amountCents: 1 }),
      { now: NOW }
    )
    expect(result.decision).toBe('BLOCK')
  })

  it('matches a designated address case-insensitively', async () => {
    const result = await screenTransaction(
      subject({ walletAddress: SANCTIONED_ADDRESS.toUpperCase() }),
      { now: NOW }
    )
    expect(result.decision).toBe('BLOCK')
  })

  it('blocks an exact sanctioned account name', async () => {
    const result = await screenTransaction(
      subject({ accountName: 'Ibrahim Musa Danjuma' }),
      { now: NOW }
    )

    expect(result.decision).toBe('BLOCK')
    expect(result.signals.map((s) => s.code)).toContain('SANCTIONS_MATCH')
  })

  it('catches a transliterated alias', async () => {
    const result = await screenTransaction(
      subject({ accountName: 'Ibraheem Moussa Danjouma' }),
      { now: NOW }
    )
    expect(result.signals.map((s) => s.code)).toContain('SANCTIONS_MATCH')
  })

  it('reviews rather than blocks a PEP match', async () => {
    // A PEP is not a criminal — the obligation is enhanced due diligence, not
    // refusal.  Blocking here would wrongly deny service.
    const result = await screenTransaction(
      subject({ accountName: 'Nomvula Precious Sithole' }),
      { now: NOW }
    )

    expect(result.signals.map((s) => s.code)).toContain('PEP_MATCH')
    expect(result.decision).not.toBe('BLOCK')
  })

  it('lets an unrelated name through', async () => {
    const result = await screenTransaction(
      subject({ accountName: 'Grace Achieng', walletAddress: 'gcleanaddress0001' }),
      { now: NOW }
    )
    expect(result.decision).toBe('ALLOW')
  })
})

describe('provider failure', () => {
  /** Forces the configured wallet provider to throw. */
  function breakWalletProvider() {
    process.env.COMPLIANCE_WALLET_PROVIDER = 'chainalysis'
    process.env.CHAINALYSIS_API_KEY = 'test-key'
    _resetProviders()
    global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as typeof fetch
  }

  afterEach(() => {
    jest.restoreAllMocks()
    delete process.env.CHAINALYSIS_API_KEY
  })

  it('does not silently approve when the provider is unreachable', async () => {
    breakWalletProvider()

    const result = await screenTransaction(
      subject({ walletAddress: 'gcleanaddress0001', amountCents: 10_00 }),
      { now: NOW }
    )

    // This is the single most important assertion in the suite: an outage at
    // the vendor must not become an unscreened payment path.
    expect(result.decision).toBe('REVIEW')
    expect(result.signals.map((s) => s.code)).toContain('PROVIDER_UNAVAILABLE')
  })

  it('still catches a designated address via the local list during an outage', async () => {
    breakWalletProvider()

    const result = await screenTransaction(
      subject({ walletAddress: SANCTIONED_ADDRESS }),
      { now: NOW }
    )

    expect(result.decision).toBe('BLOCK')
  })

  it('attributes the failed provider in the result', async () => {
    breakWalletProvider()

    const result = await screenTransaction(
      subject({ walletAddress: 'gcleanaddress0001' }),
      { now: NOW }
    )

    expect(result.providers).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'chainalysis', ok: false })])
    )
  })
})

describe('case creation', () => {
  it('opens a case for a blocked transaction', async () => {
    const input = subject({ walletAddress: SANCTIONED_ADDRESS })
    const result = await screenTransaction(input, { now: NOW })

    expect(result.caseId).toBeDefined()
    const record = getCaseByTransaction(input.transactionId)
    expect(record).toMatchObject({ status: 'OPEN', decision: 'BLOCK' })
  })

  it('records why the case was opened in its audit trail', async () => {
    const input = subject({ accountName: 'Ibrahim Musa Danjuma' })
    await screenTransaction(input, { now: NOW })

    const record = getCaseByTransaction(input.transactionId)
    expect(record?.events[0]).toMatchObject({ actor: 'system', action: 'CREATED' })
    expect(record?.events[0].detail).toContain('SANCTIONS_MATCH')
  })

  it('does not open a second case when a screening call is retried', async () => {
    // Clients retry on flaky networks; duplicate cases get worked and closed
    // inconsistently by different analysts.
    const input = subject({ walletAddress: SANCTIONED_ADDRESS })

    const first = await screenTransaction(input, { now: NOW })
    const second = await screenTransaction(input, { now: NOW })

    expect(second.caseId).toBe(first.caseId)
  })

  it('does not duplicate a ledger entry when a screening call is retried', async () => {
    const input = subject({ amountCents: 50_00 })

    await screenTransaction(input, { now: NOW })
    await screenTransaction(input, { now: NOW })

    expect(_ledger.get(USER)).toHaveLength(1)
  })
})

describe('blocked attempts remain visible', () => {
  it('records a blocked transaction in the ledger', async () => {
    // An attempt that was stopped is evidence of behaviour.  Dropping it would
    // make a probing account look quieter than a legitimate one.
    const input = subject({ walletAddress: SANCTIONED_ADDRESS })
    await screenTransaction(input, { now: NOW })

    expect(_ledger.get(USER)).toHaveLength(1)
    expect(_ledger.get(USER)?.[0].decision).toBe('BLOCK')
  })

  it('counts blocked attempts towards subsequent velocity rules', async () => {
    for (let i = 0; i < 3; i++) {
      await screenTransaction(
        subject({ walletAddress: SANCTIONED_ADDRESS, amountCents: 3_500_00 }),
        { now: NOW }
      )
    }

    // Three blocked $3,500 attempts have already been recorded, so a fourth
    // transaction breaches the daily volume ceiling on history alone.
    const result = await screenTransaction(subject({ amountCents: 100_00 }), { now: NOW })
    expect(result.signals.map((s) => s.code)).toContain('VELOCITY_VOLUME')
  })
})

describe('skipLedger', () => {
  it('re-screens without double-counting the transaction', async () => {
    const input = subject({ amountCents: 50_00 })
    await screenTransaction(input, { now: NOW })
    await screenTransaction(input, { now: NOW, skipLedger: true })

    expect(_ledger.get(USER)).toHaveLength(1)
  })
})

describe('counterparty privacy', () => {
  it('never writes a raw counterparty identifier to the ledger', async () => {
    const accountNumber = '0123456789'
    await screenTransaction(
      subject({ accountNumber, counterpartyId: accountNumber, amountCents: 50_00 }),
      { now: NOW }
    )

    const entry = _ledger.get(USER)?.[0]
    expect(entry?.counterpartyKey).toBeDefined()
    expect(entry?.counterpartyKey).not.toContain(accountNumber)
    expect(JSON.stringify(entry)).not.toContain(accountNumber)
  })

  it('produces a stable key for the same counterparty', async () => {
    // Fan-out detection depends on the same recipient hashing identically.
    await screenTransaction(
      subject({ counterpartyId: '0123456789', amountCents: 10_00 }),
      { now: NOW }
    )
    await screenTransaction(
      subject({ counterpartyId: '0123456789', amountCents: 10_00 }),
      { now: NOW }
    )

    const entries = _ledger.get(USER) ?? []
    expect(entries).toHaveLength(2)
    expect(entries[0].counterpartyKey).toBe(entries[1].counterpartyKey)
  })
})
