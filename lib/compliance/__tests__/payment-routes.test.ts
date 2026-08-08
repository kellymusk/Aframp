/**
 * @jest-environment node
 */

/**
 * Screening in the payment path.
 *
 * The engine is tested thoroughly elsewhere.  What these tests protect is
 * cheaper to break and worse to get wrong: that the payment routes actually
 * call it, before they move anything, and that they act on what it returns.
 *
 * A wiring regression here is invisible from the inside — every unit test still
 * passes, the console still works, and money simply stops being screened.  So
 * these exercise the exported route handlers rather than the module.
 *
 * They run against the local list provider (the default when no vendor is
 * configured) and the DEV_FIXTURE_ENTITIES corpus.
 */

process.env.COMPLIANCE_HASH_SALT = 'payment-routes-test-salt'

import { NextRequest } from 'next/server'
import { POST as initiateMobileMoney } from '@/app/api/payments/mobile-money/initiate/route'
import { POST as initiateBillPayment } from '@/app/api/bills/initiate/route'
import { _clearCases, listCases } from '../case-store'
import { _clearLedger } from '../ledger'

const MOMO_URL = 'http://localhost/api/payments/mobile-money/initiate'
const BILLS_URL = 'http://localhost/api/bills/initiate'

/** A name on the fixture sanctions list — see DEV_FIXTURE_ENTITIES. */
const SANCTIONED_NAME = 'Ibrahim Musa Danjuma'

function post(url: string, body: unknown) {
  return new NextRequest(new URL(url), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function momoBody(overrides: Record<string, unknown> = {}) {
  return {
    provider: 'mpesa',
    phoneNumber: '+254712345678',
    amount: 5000,
    currency: 'KES',
    accountReference: 'ref',
    transactionDesc: 'test',
    externalId: `tx_${Math.random().toString(36).slice(2)}`,
    ...overrides,
  }
}

function billBody(overrides: Record<string, unknown> = {}) {
  return {
    billerId: 'ikeja-electric',
    accountNumber: '12345678901',
    amount: 5000,
    customerEmail: 'ada@example.com',
    ...overrides,
  }
}

beforeEach(() => {
  _clearCases()
  _clearLedger()
})

// ---------------------------------------------------------------------------

describe('POST /api/payments/mobile-money/initiate', () => {
  it('blocks a sanctioned payer before the collection is initiated', async () => {
    const response = await initiateMobileMoney(
      post(MOMO_URL, momoBody({ accountName: SANCTIONED_NAME }))
    )

    expect(response.status).toBe(403)
    expect((await response.json()).error).toBe('COMPLIANCE_BLOCKED')
  })

  it('opens a case an analyst can find', async () => {
    await initiateMobileMoney(post(MOMO_URL, momoBody({ accountName: SANCTIONED_NAME })))

    const { cases, total } = listCases()
    expect(total).toBe(1)
    expect(cases[0]).toMatchObject({ decision: 'BLOCK', jurisdiction: 'KE', kind: 'onramp' })
  })

  it('returns a reference the customer can quote to support', async () => {
    const response = await initiateMobileMoney(
      post(MOMO_URL, momoBody({ accountName: SANCTIONED_NAME }))
    )
    const body = await response.json()

    expect(body.referenceId).toBe(listCases().cases[0].id)
  })

  it('does not tell the customer why', async () => {
    // Tipping off is a criminal offence in all five markets, and the message
    // is identical for BLOCK and REVIEW.  See app/api/withdrawals/route.ts.
    const response = await initiateMobileMoney(
      post(MOMO_URL, momoBody({ accountName: SANCTIONED_NAME }))
    )
    const body = JSON.stringify(await response.json())

    expect(body).not.toMatch(/sanction/i)
    expect(body).not.toMatch(/danjuma/i)
  })

  it('derives the market from the payment currency', async () => {
    await initiateMobileMoney(
      post(MOMO_URL, momoBody({ currency: 'UGX', amount: 20_000_000, accountName: SANCTIONED_NAME }))
    )

    expect(listCases().cases[0].jurisdiction).toBe('UG')
  })

  it('screens a market with no local registration rather than skipping it', async () => {
    // Rwanda is outside the licensed five.  A designated person is designated
    // there too, so the control must still fire — it simply cannot be filed.
    const response = await initiateMobileMoney(
      post(
        MOMO_URL,
        momoBody({
          provider: 'mtn_momo',
          phoneNumber: '+250781234567',
          currency: 'RWF',
          amount: 500_000,
          accountName: SANCTIONED_NAME,
        })
      )
    )

    expect(response.status).toBe(403)
    expect(listCases().cases[0].jurisdiction).toBe('RW')
  })

  it('refuses a currency it holds no policy for', async () => {
    // Not an outage — there is no threshold to measure this against, so it
    // cannot be screened and must not be collected.
    const response = await initiateMobileMoney(post(MOMO_URL, momoBody({ currency: 'EUR' })))

    expect(response.status).toBe(422)
    expect((await response.json()).error).toBe('UNSUPPORTED_MARKET')
  })

  it('keys an anonymous payer to a hashed handset, not a raw number', async () => {
    await initiateMobileMoney(post(MOMO_URL, momoBody({ accountName: SANCTIONED_NAME })))

    const { userId } = listCases().cases[0]
    expect(userId).toMatch(/^msisdn:[0-9a-f]{64}$/)
    expect(userId).not.toContain('254712345678')
  })

  it('prefers the wallet key when the client sends one', async () => {
    // So a customer's ramp and bill activity accumulate under one identity.
    const wallet = 'GTESTWALLET000000000000000000000000000000000000000000'
    await initiateMobileMoney(
      post(MOMO_URL, momoBody({ accountName: SANCTIONED_NAME, userId: wallet }))
    )

    expect(listCases().cases[0].userId).toBe(wallet)
  })

  it('records the payer identity consistently across payments', async () => {
    // The premise of every velocity rule: two payments from one handset are
    // one account.  If this breaks, the rules silently never fire.
    await initiateMobileMoney(post(MOMO_URL, momoBody({ accountName: SANCTIONED_NAME })))
    await initiateMobileMoney(post(MOMO_URL, momoBody({ accountName: SANCTIONED_NAME })))

    const userIds = new Set(listCases().cases.map((c) => c.userId))
    expect(listCases().total).toBe(2)
    expect(userIds.size).toBe(1)
  })
})

// ---------------------------------------------------------------------------

describe('POST /api/bills/initiate', () => {
  it('refuses a currency it holds no policy for', async () => {
    const response = await initiateBillPayment(post(BILLS_URL, billBody({ currency: 'EUR' })))

    expect(response.status).toBe(422)
    expect((await response.json()).error).toBe('UNSUPPORTED_MARKET')
  })

  it('screens before handing anything to the gateway', async () => {
    // No gateway credentials are configured here, so reaching the gateway at
    // all is what proves screening ran first and allowed it: a held payment
    // would have returned 403 without ever calling out.
    const response = await initiateBillPayment(post(BILLS_URL, billBody()))

    expect(response.status).not.toBe(403)
    expect(listCases().total).toBe(0)
  })

  it('keys an anonymous payer to a hashed email', async () => {
    // Forced into a case via a volume the fixture ledger will flag, so the
    // recorded identity can be inspected.
    await initiateBillPayment(post(BILLS_URL, billBody({ amount: 500_000_000 })))

    const [record] = listCases().cases
    expect(record?.userId).toMatch(/^email:[0-9a-f]{64}$/)
    expect(record?.userId).not.toContain('ada@example.com')
  })
})
