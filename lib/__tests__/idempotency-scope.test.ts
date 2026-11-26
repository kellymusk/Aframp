import { ApiError, withIdempotencyKey } from '@/lib/api/shared'

/** Runs one attempt and returns the key it was sent with; `failure` makes the attempt fail. */
async function attempt(scope: string, token: string, body: unknown, failure?: unknown) {
  let key = ''
  try {
    await withIdempotencyKey(scope, token, body, async (idempotencyKey) => {
      key = idempotencyKey
      if (failure) throw failure
      return 'ok'
    })
  } catch {
    // The failure is the point of the test; only the key matters here.
  }
  return key
}

const unknownOutcome = () => new ApiError('Something went wrong', 503)

describe('withIdempotencyKey intents', () => {
  it('keeps separate keys for different payloads, endpoints and accounts', async () => {
    const base = await attempt('/withdraw', 'tok-scope', { amount: 1n }, unknownOutcome())
    const otherBody = await attempt('/withdraw', 'tok-scope', { amount: 2n }, unknownOutcome())
    const otherScope = await attempt('/remittance', 'tok-scope', { amount: 1n }, unknownOutcome())
    const otherToken = await attempt('/withdraw', 'tok-other', { amount: 1n }, unknownOutcome())

    expect(new Set([base, otherBody, otherScope, otherToken]).size).toBe(4)
    // Each intent still gets its own key back on retry.
    expect(await attempt('/withdraw', 'tok-scope', { amount: 1n })).toBe(base)
    expect(await attempt('/withdraw', 'tok-scope', { amount: 2n })).toBe(otherBody)
  })

  it('reuses the key after a network error, a 5xx or an unexpected error', async () => {
    for (const [index, failure] of [
      new ApiError('offline', 0),
      new ApiError('boom', 500),
      new Error('unexpected'),
    ].entries()) {
      const token = `tok-unknown-${index}`
      const first = await attempt('/withdraw', token, { amount: 3n }, failure)
      expect(await attempt('/withdraw', token, { amount: 3n })).toBe(first)
    }
  })

  it('drops the key after a definite 4xx rejection', async () => {
    for (const status of [400, 401, 409, 422]) {
      const token = `tok-rejected-${status}`
      const first = await attempt('/withdraw', token, { amount: 4n }, new ApiError('no', status))
      expect(await attempt('/withdraw', token, { amount: 4n })).not.toBe(first)
    }
  })
})
