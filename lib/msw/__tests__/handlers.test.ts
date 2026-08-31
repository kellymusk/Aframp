/**
 * Exercises every `api.*` call against the MSW handlers (#486's acceptance
 * criteria: "MSW handlers for all api.* calls"). Runs the handlers through
 * `msw/node` rather than the browser worker, but it's the same handler set
 * `lib/msw/browser.ts` uses — this is what actually proves each `api.*`
 * method has a matching handler instead of falling through to a real
 * network call (which `onUnhandledRequest: 'error'` would fail on).
 */
import { setupServer } from 'msw/node'
import { handlers } from '@/lib/msw/handlers'
import { api } from '@/lib/api'

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers(...handlers))
afterAll(() => server.close())

const TOKEN = 'demo-token'

describe('MSW handlers cover every api.* call', () => {
  it('auth: signup, login, getSession, logout', async () => {
    await expect(api.signup('demo@aframp.dev', 'password', 'Demo')).resolves.toMatchObject({
      token: expect.any(String),
    })
    await expect(api.login('demo@aframp.dev', 'password')).resolves.toMatchObject({
      token: expect.any(String),
    })
    await expect(api.getSession()).resolves.toMatchObject({ session: expect.any(Object) })
    await expect(api.logout()).resolves.toEqual({ success: true })
  })

  it('auth: password reset', async () => {
    await expect(api.resetPasswordRequest('demo@aframp.dev')).resolves.toMatchObject({
      message: expect.any(String),
    })
    await expect(api.resetPassword('reset-token', 'newpassword')).resolves.toMatchObject({
      message: expect.any(String),
    })
  })

  it('auth: Stellar / SEP-0010 challenge and verify', async () => {
    await expect(
      api.getStellarChallenge('GDEMOADDRESSXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')
    ).resolves.toMatchObject({
      transaction: expect.any(String),
      network_passphrase: expect.any(String),
    })
    await expect(api.verifyStellarChallenge('signed-xdr')).resolves.toMatchObject({
      token: expect.any(String),
    })
  })

  it('merchant: getMe', async () => {
    await expect(api.getMe(TOKEN)).resolves.toMatchObject({ merchant_id: expect.any(String) })
  })

  it('wallet: createWallet, getWallet, getBalances', async () => {
    await expect(api.createWallet(TOKEN)).resolves.toMatchObject({ address: expect.any(String) })
    await expect(api.getWallet(TOKEN)).resolves.toMatchObject({ address: expect.any(String) })
    await expect(api.getBalances(TOKEN)).resolves.toEqual(expect.any(Array))
  })

  it('payments: listTransactions', async () => {
    const payments = await api.listTransactions(TOKEN, 50, 0)
    expect(payments.length).toBeGreaterThan(0)
    expect(typeof payments[0].amount_stroops).toBe('bigint')
  })

  it('payment requests: create, list, get by id', async () => {
    const created = await api.createPaymentRequest(TOKEN, 100_000_000n, 'XLM', 3600, 'Test memo')
    expect(created.id).toEqual(expect.any(String))

    const list = await api.listPaymentRequests(TOKEN, 20)
    expect(list.length).toBeGreaterThan(0)

    await expect(api.getPaymentRequest('demo-request-0001')).resolves.toMatchObject({
      id: 'demo-request-0001',
    })
    await expect(api.getPaymentRequest('does-not-exist')).rejects.toThrow()
  })

  it('withdrawals: resolveAccount, createWithdrawal, listWithdrawals', async () => {
    await expect(api.resolveAccount(TOKEN, '058', '0123456789')).resolves.toMatchObject({
      account_name: expect.any(String),
    })
    await expect(
      api.createWithdrawal(TOKEN, 500_000_000n, '058', '0123456789')
    ).resolves.toMatchObject({ id: expect.any(String) })
    await expect(api.listWithdrawals(TOKEN)).resolves.toEqual(expect.any(Array))
  })

  it('kyc: getKycStatus, initiateKyc', async () => {
    await expect(api.getKycStatus(TOKEN)).resolves.toMatchObject({ status: expect.any(String) })
    await expect(
      api.initiateKyc(TOKEN, {
        idFront: 'base64',
        idBack: 'base64',
        selfie: 'base64',
        documentType: 'nin',
        documentNumber: '12345678901',
      })
    ).resolves.toMatchObject({ submissionId: expect.any(String) })
  })

  it('offramp: rate, fees, order lifecycle', async () => {
    await expect(api.getOfframpRate(TOKEN, 'cNGN', 'NGN')).resolves.toMatchObject({
      rate: expect.any(Number),
    })
    await expect(api.getOfframpFees(TOKEN, 'cNGN', 'NGN', 100)).resolves.toMatchObject({
      totalFees: expect.any(Number),
    })

    const order = await api.createOfframpOrder(TOKEN, 'demo-cngn', 100, 'NGN')
    expect(order.id).toEqual(expect.any(String))

    await expect(api.getOfframpOrder(TOKEN, order.id)).resolves.toMatchObject({ id: order.id })
    await expect(
      api.submitOfframpBankDetails(TOKEN, order.id, {
        bankCode: '058',
        accountNumber: '0123456789',
      })
    ).resolves.toMatchObject({ id: order.id })
    await expect(api.retryOfframpOrder(TOKEN, order.id)).resolves.toMatchObject({ id: order.id })
  })

  it('sep24: startSep24Deposit, startSep24Withdrawal', async () => {
    await expect(api.startSep24Deposit(TOKEN)).resolves.toMatchObject({ url: expect.any(String) })
    await expect(api.startSep24Withdrawal(TOKEN)).resolves.toMatchObject({
      url: expect.any(String),
    })
  })
})
