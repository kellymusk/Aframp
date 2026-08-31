/**
 * Mock Service Worker handlers for every `api.*` call in `lib/api.ts` (#486).
 *
 * Enabled via `NEXT_PUBLIC_DEMO_MODE=true` (see `lib/msw/browser.ts` and
 * `components/demo-mode-provider.tsx`), so new contributors can run the
 * frontend and click through the whole app without a running Rust backend.
 *
 * `BASE_URL` mirrors `lib/api.ts`'s own derivation exactly, since that's
 * where `request()` sends direct-to-backend calls. The `/api/auth/*` routes
 * are relative — those go through this app's own Next.js API routes
 * (`requestWithCookie` in `lib/api.ts`), which MSW intercepts the same way.
 */

import { http, HttpResponse } from 'msw'

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '')

const DEMO_TOKEN = 'demo-token'
const DEMO_USER_ID = 'demo-user-0001'
const DEMO_MERCHANT_ID = 'demo-merchant-0001'

const DEMO_SESSION = {
  session: { token: DEMO_TOKEN, userId: DEMO_USER_ID, merchantId: DEMO_MERCHANT_ID },
}

const DEMO_AUTH_RESPONSE = {
  token: DEMO_TOKEN,
  user_id: DEMO_USER_ID,
  merchant_id: DEMO_MERCHANT_ID,
}

function isoDaysAgo(days: number, hours = 0): string {
  return new Date(Date.now() - days * 86_400_000 - hours * 3_600_000).toISOString()
}

let nextPaymentId = 3

/** Seed data: enough variety (statuses, assets, days) to make the dashboard and revenue chart look real. */
const payments = [
  {
    id: 'demo-payment-0001',
    merchant_id: DEMO_MERCHANT_ID,
    wallet_id: 'demo-wallet-0001',
    wallet_address: 'GDEMOWALLETADDRESSXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    tx_hash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    amount_stroops: 250_000_000,
    asset: 'XLM',
    network: 'testnet',
    status: 'confirmed',
    confirmations: 12,
    created_at: isoDaysAgo(0, 2),
    updated_at: isoDaysAgo(0, 2),
  },
  {
    id: 'demo-payment-0002',
    merchant_id: DEMO_MERCHANT_ID,
    wallet_id: 'demo-wallet-0001',
    wallet_address: 'GDEMOWALLETADDRESSXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    tx_hash: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
    amount_stroops: 1_500_000_000,
    asset: 'cNGN',
    network: 'testnet',
    status: 'confirmed',
    confirmations: 12,
    created_at: isoDaysAgo(1, 5),
    updated_at: isoDaysAgo(1, 5),
  },
  {
    id: 'demo-payment-0003',
    merchant_id: DEMO_MERCHANT_ID,
    wallet_id: 'demo-wallet-0001',
    wallet_address: 'GDEMOWALLETADDRESSXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    tx_hash: 'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
    amount_stroops: 90_000_000,
    asset: 'XLM',
    network: 'testnet',
    status: 'confirmed',
    confirmations: 12,
    created_at: isoDaysAgo(3, 1),
    updated_at: isoDaysAgo(3, 1),
  },
  {
    id: 'demo-payment-0004',
    merchant_id: DEMO_MERCHANT_ID,
    wallet_id: 'demo-wallet-0001',
    wallet_address: 'GDEMOWALLETADDRESSXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    tx_hash: 'd4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5',
    amount_stroops: 40_000_000,
    asset: 'XLM',
    network: 'testnet',
    status: 'detected',
    confirmations: 1,
    created_at: isoDaysAgo(0, 0.2),
    updated_at: isoDaysAgo(0, 0.2),
  },
  {
    id: 'demo-payment-0005',
    merchant_id: DEMO_MERCHANT_ID,
    wallet_id: 'demo-wallet-0001',
    wallet_address: 'GDEMOWALLETADDRESSXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    tx_hash: 'e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6',
    amount_stroops: 15_000_000,
    asset: 'XLM',
    network: 'testnet',
    status: 'failed',
    confirmations: 0,
    created_at: isoDaysAgo(5, 0),
    updated_at: isoDaysAgo(5, 0),
  },
]

const paymentRequests = [
  {
    id: 'demo-request-0001',
    merchant_id: DEMO_MERCHANT_ID,
    address: 'GDEMOWALLETADDRESSXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    network: 'testnet',
    amount_stroops: 300_000_000,
    asset: 'XLM',
    memo: 'Invoice #DEMO-001',
    status: 'pending',
    expires_at: new Date(Date.now() + 3_600_000).toISOString(),
    created_at: isoDaysAgo(0, 0.5),
    sep7_uri:
      'web+stellar:pay?destination=GDEMOWALLETADDRESSXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX&amount=30',
  },
  {
    id: 'demo-request-0002',
    merchant_id: DEMO_MERCHANT_ID,
    address: 'GDEMOWALLETADDRESSXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    network: 'testnet',
    amount_stroops: 1_500_000_000,
    asset: 'cNGN',
    memo: 'Invoice #DEMO-002',
    status: 'paid',
    expires_at: isoDaysAgo(1, 4),
    created_at: isoDaysAgo(1, 5),
    sep7_uri: null,
  },
]

const withdrawals = [
  {
    id: 'demo-withdrawal-0001',
    merchant_id: DEMO_MERCHANT_ID,
    amount_stroops: 1_000_000_000,
    asset: 'cNGN',
    status: 'completed',
    provider: 'paystack',
    provider_reference: 'demo-ref-0001',
    bank_code: '058',
    account_number: '0123456789',
    failure_reason: null,
    created_at: isoDaysAgo(2, 0),
    updated_at: isoDaysAgo(1, 20),
  },
]

export const handlers = [
  // ── Auth ──────────────────────────────────────────────────────────────
  http.post('/api/auth/signup', () => HttpResponse.json(DEMO_AUTH_RESPONSE)),
  http.post('/api/auth/login', () => HttpResponse.json(DEMO_AUTH_RESPONSE)),
  http.get('/api/auth/session', () => HttpResponse.json(DEMO_SESSION)),
  http.post('/api/auth/logout', () => HttpResponse.json({ success: true })),

  http.post(`${BASE_URL}/password-reset/request`, () =>
    HttpResponse.json({ message: 'If that email exists, a reset link has been sent.' })
  ),
  http.post(`${BASE_URL}/password-reset/confirm`, () =>
    HttpResponse.json({ message: 'Password updated. You can now sign in.' })
  ),

  http.get(`${BASE_URL}/auth/stellar/challenge`, () =>
    HttpResponse.json({
      transaction: 'AAAAAgAAAAA...demo-challenge-transaction-envelope-xdr',
      network_passphrase: 'Test SDF Network ; September 2015',
    })
  ),
  http.post(`${BASE_URL}/auth/stellar/verify`, () => HttpResponse.json(DEMO_AUTH_RESPONSE)),

  // ── Merchant / wallet ────────────────────────────────────────────────
  http.get(`${BASE_URL}/me`, () =>
    HttpResponse.json({
      user_id: DEMO_USER_ID,
      email: 'demo@aframp.dev',
      name: 'Demo Merchant',
      created_at: isoDaysAgo(30),
      merchant_id: DEMO_MERCHANT_ID,
      merchant_name: 'Demo Storefront',
    })
  ),

  http.post(`${BASE_URL}/wallet/create`, () =>
    HttpResponse.json({
      id: 'demo-wallet-0001',
      merchant_id: DEMO_MERCHANT_ID,
      address: 'GDEMOWALLETADDRESSXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      network: 'testnet',
      created_at: isoDaysAgo(30),
    })
  ),
  http.get(`${BASE_URL}/wallet`, () =>
    HttpResponse.json({
      id: 'demo-wallet-0001',
      merchant_id: DEMO_MERCHANT_ID,
      address: 'GDEMOWALLETADDRESSXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      network: 'testnet',
      created_at: isoDaysAgo(30),
    })
  ),

  http.get(`${BASE_URL}/balance`, () =>
    HttpResponse.json([
      {
        merchant_id: DEMO_MERCHANT_ID,
        asset: 'XLM',
        available: 2_345_000_000,
        pending: 40_000_000,
        updated_at: isoDaysAgo(0),
      },
      {
        merchant_id: DEMO_MERCHANT_ID,
        asset: 'cNGN',
        available: 8_500_000_000,
        pending: 0,
        updated_at: isoDaysAgo(0),
      },
    ])
  ),

  // ── Payments ─────────────────────────────────────────────────────────
  http.get(`${BASE_URL}/transactions`, ({ request }) => {
    const url = new URL(request.url)
    const limit = Number(url.searchParams.get('limit') ?? 50)
    const offset = Number(url.searchParams.get('offset') ?? 0)
    return HttpResponse.json(payments.slice(offset, offset + limit))
  }),

  http.post(`${BASE_URL}/payment-requests`, async ({ request }) => {
    const body = (await request.json()) as {
      amount_stroops: number
      asset?: string
      expires_in_secs?: number
      memo?: string
    }
    const created = {
      id: `demo-request-${String(nextPaymentId++).padStart(4, '0')}`,
      merchant_id: DEMO_MERCHANT_ID,
      address: 'GDEMOWALLETADDRESSXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      network: 'testnet',
      amount_stroops: body.amount_stroops,
      asset: body.asset ?? 'XLM',
      memo: body.memo ?? '',
      status: 'pending',
      expires_at: new Date(Date.now() + (body.expires_in_secs ?? 3600) * 1000).toISOString(),
      created_at: new Date().toISOString(),
      sep7_uri: `web+stellar:pay?destination=GDEMOWALLETADDRESSXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX&amount=${body.amount_stroops / 1e7}`,
    }
    paymentRequests.unshift(created)
    return HttpResponse.json(created)
  }),

  http.get(`${BASE_URL}/payment-requests`, ({ request }) => {
    const limit = Number(new URL(request.url).searchParams.get('limit') ?? 50)
    return HttpResponse.json(paymentRequests.slice(0, limit))
  }),

  http.get(`${BASE_URL}/payment-requests/:id`, ({ params }) => {
    const found = paymentRequests.find((r) => r.id === params.id)
    if (!found) return HttpResponse.json({ error: 'Payment request not found' }, { status: 404 })
    return HttpResponse.json(found)
  }),

  // ── Withdrawals ──────────────────────────────────────────────────────
  http.post(`${BASE_URL}/accounts/resolve`, async ({ request }) => {
    const body = (await request.json()) as { bank_code: string; account_number: string }
    return HttpResponse.json({
      account_number: body.account_number,
      account_name: 'Demo Merchant Account',
      bank_code: body.bank_code,
    })
  }),

  http.post(`${BASE_URL}/withdraw`, async ({ request }) => {
    const body = (await request.json()) as {
      amount_stroops: number
      asset: string
      currency: string
      bank_code?: string
      account_number: string
    }
    const created = {
      id: `demo-withdrawal-${String(withdrawals.length + 1).padStart(4, '0')}`,
      merchant_id: DEMO_MERCHANT_ID,
      amount_stroops: body.amount_stroops,
      asset: body.asset,
      status: 'pending',
      provider: 'paystack',
      provider_reference: null,
      bank_code: body.bank_code ?? null,
      account_number: body.account_number,
      failure_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    withdrawals.unshift(created)
    return HttpResponse.json(created)
  }),

  http.get(`${BASE_URL}/withdrawals`, ({ request }) => {
    const limit = Number(new URL(request.url).searchParams.get('limit') ?? 50)
    return HttpResponse.json(withdrawals.slice(0, limit))
  }),

  // ── KYC ──────────────────────────────────────────────────────────────
  http.get(`${BASE_URL}/kyc-status`, () =>
    HttpResponse.json({
      submissionId: 'demo-kyc-0001',
      status: 'approved',
      step: 'submitted',
      expiresAt: Date.now() + 180 * 86_400_000,
    })
  ),
  http.post(`${BASE_URL}/kyc/initiate`, () =>
    HttpResponse.json({
      submissionId: 'demo-kyc-0001',
      status: 'pending',
      expiresAt: Date.now() + 180 * 86_400_000,
    })
  ),

  // ── Offramp ──────────────────────────────────────────────────────────
  http.get(`${BASE_URL}/offramp/rate`, () =>
    HttpResponse.json({ rate: 1650.42, lastUpdated: Date.now() })
  ),
  http.get(`${BASE_URL}/offramp/fees`, ({ request }) => {
    const amount = Number(new URL(request.url).searchParams.get('amount') ?? 0)
    const offrampFee = amount * 0.01
    const networkFee = 0.5
    const bankFee = 50
    return HttpResponse.json({
      offrampFee,
      networkFee,
      bankFee,
      totalFees: offrampFee + networkFee + bankFee,
      receiveAmount: Math.max(0, amount - offrampFee - networkFee - bankFee),
    })
  }),

  http.post(`${BASE_URL}/offramp/orders`, async ({ request }) => {
    const body = (await request.json()) as {
      asset_id: string
      amount: number
      fiat_currency: string
    }
    return HttpResponse.json({
      id: 'demo-offramp-0001',
      createdAt: Date.now(),
      walletAddress: 'GDEMOWALLETADDRESSXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      lockExpiresAt: Date.now() + 15 * 60_000,
      assetId: body.asset_id,
      asset: 'cNGN',
      chain: 'Stellar',
      amount: body.amount,
      fiatCurrency: body.fiat_currency,
      rate: 1650.42,
      fiatAmount: body.amount * 1650.42,
      fees: {
        offrampFee: body.amount * 0.01,
        networkFee: 0.5,
        bankFee: 50,
        totalFees: body.amount * 0.01 + 50.5,
        receiveAmount: body.amount * 1650.42 * 0.99 - 50.5,
      },
      status: 'pending_bank_details',
    })
  }),
  http.get(`${BASE_URL}/offramp/orders/:id`, ({ params }) =>
    HttpResponse.json({
      id: params.id,
      createdAt: Date.now() - 5 * 60_000,
      walletAddress: 'GDEMOWALLETADDRESSXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      lockExpiresAt: Date.now() + 10 * 60_000,
      assetId: 'demo-cngn',
      asset: 'cNGN',
      chain: 'Stellar',
      amount: 100,
      fiatCurrency: 'NGN',
      rate: 1650.42,
      fiatAmount: 165_042,
      fees: {
        offrampFee: 1,
        networkFee: 0.5,
        bankFee: 50,
        totalFees: 51.5,
        receiveAmount: 163_990.5,
      },
      status: 'processing',
    })
  ),
  http.post(`${BASE_URL}/offramp/orders/:id/bank-details`, ({ params }) =>
    HttpResponse.json({
      id: params.id,
      createdAt: Date.now() - 5 * 60_000,
      walletAddress: 'GDEMOWALLETADDRESSXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      lockExpiresAt: Date.now() + 10 * 60_000,
      assetId: 'demo-cngn',
      asset: 'cNGN',
      chain: 'Stellar',
      amount: 100,
      fiatCurrency: 'NGN',
      rate: 1650.42,
      fiatAmount: 165_042,
      fees: {
        offrampFee: 1,
        networkFee: 0.5,
        bankFee: 50,
        totalFees: 51.5,
        receiveAmount: 163_990.5,
      },
      status: 'processing',
    })
  ),
  http.post(`${BASE_URL}/offramp/orders/:id/retry`, ({ params }) =>
    HttpResponse.json({
      id: params.id,
      createdAt: Date.now() - 30 * 60_000,
      walletAddress: 'GDEMOWALLETADDRESSXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      lockExpiresAt: Date.now() + 10 * 60_000,
      assetId: 'demo-cngn',
      asset: 'cNGN',
      chain: 'Stellar',
      amount: 100,
      fiatCurrency: 'NGN',
      rate: 1650.42,
      fiatAmount: 165_042,
      fees: {
        offrampFee: 1,
        networkFee: 0.5,
        bankFee: 50,
        totalFees: 51.5,
        receiveAmount: 163_990.5,
      },
      status: 'pending',
    })
  ),

  // ── SEP-24 ───────────────────────────────────────────────────────────
  http.post(`${BASE_URL}/sep24/deposit`, () =>
    HttpResponse.json({
      type: 'interactive_customer_info_needed',
      url: 'https://anchor.example/sep24/interactive?token=demo',
      id: 'demo-sep24-deposit-0001',
    })
  ),
  http.post(`${BASE_URL}/sep24/withdraw`, () =>
    HttpResponse.json({
      type: 'interactive_customer_info_needed',
      url: 'https://anchor.example/sep24/interactive?token=demo',
      id: 'demo-sep24-withdraw-0001',
    })
  ),
]
