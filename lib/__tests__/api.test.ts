/**
 * Regression test for `stringifyWithBigInts` (private to lib/api.ts, so
 * exercised through a real `api.*` call rather than imported directly).
 *
 * The marker-stripping regex used to search for a literal NUL byte in the
 * JSON.stringify output, but JSON.stringify always escapes a raw NUL in a
 * string value as a six-character text escape sequence -- so the regex
 * never matched anything, and every bigint field (e.g. amount_stroops on
 * createPaymentRequest/createWithdrawal) went out over the wire as a
 * quoted string wrapping that escape sequence around the digits, instead
 * of a bare JSON integer. The receiving side (this app's own
 * parseWithBigInts, and presumably the real Rust backend's i64
 * deserializer) would then fail to parse it.
 */
import { setupServer } from 'msw/node'
import { http } from 'msw'
import { api } from '@/lib/api'

const BASE_URL = 'http://127.0.0.1:3000'

let capturedBody: string | undefined
const server = setupServer(
  http.post(`${BASE_URL}/payment-requests`, async ({ request }) => {
    capturedBody = await request.text()
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
  })
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('stringifyWithBigInts (via api.createPaymentRequest)', () => {
  it('sends a bigint amount as a bare JSON integer, not a quoted string', async () => {
    await api.createPaymentRequest('demo-token', 250_000_000n, 'XLM')

    expect(capturedBody).toBeDefined()
    expect(capturedBody).toContain('"amount_stroops":250000000')
    expect(capturedBody).not.toMatch(/"amount_stroops":\s*"/)

    // Round-trips through plain JSON.parse (what a Rust i64 deserializer,
    // or MSW's own request.json(), would use) as a plain number.
    const parsed = JSON.parse(capturedBody as string) as { amount_stroops: unknown }
    expect(parsed.amount_stroops).toBe(250_000_000)
  })
})
