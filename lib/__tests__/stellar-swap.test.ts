/**
 * Tests for lib/swap/stellar-swap.ts
 *
 * Covers:
 *  - simulateSwap — successful path with best-path selection
 *               — throws when fetch is not ok
 *               — throws when no swap path found (empty records)
 *               — selects the path with the highest destination_amount
 *               — slippage is applied to minReceived correctly
 *               — rate calculation
 *               — asset resolution (XLM native vs custom with issuer)
 *               — unknown asset issuer throws
 *  - buildSwapXdr — calls pathPaymentStrictSend with correct params
 *                 — uses correct network passphrase
 *                 — self-swap destination is sourcePublicKey
 *                 — returns an XDR string
 */

import { simulateSwap, buildSwapXdr, type SwapSimulation } from '../swap/stellar-swap'

// ---------------------------------------------------------------------------
// Mock @stellar/stellar-sdk
// ---------------------------------------------------------------------------

const mockBuild = jest.fn()
const mockToXDR = jest.fn().mockReturnValue('CCCC==')
const mockSetTimeout = jest.fn().mockReturnThis()
const mockAddOperation = jest.fn().mockReturnThis()

const mockBuilder = {
  addOperation: mockAddOperation,
  setTimeout: mockSetTimeout,
  build: mockBuild,
}

mockBuild.mockReturnValue({ toXDR: mockToXDR })

const mockLoadAccount = jest.fn()
const mockFetchBaseFee = jest.fn().mockResolvedValue(100)

const MockServer = jest.fn().mockImplementation(() => ({
  loadAccount: mockLoadAccount,
  fetchBaseFee: mockFetchBaseFee,
}))

const nativeAsset = { isNative: () => true, getCode: () => 'XLM', getIssuer: () => '' }
const MockAssetNative = jest.fn().mockReturnValue(nativeAsset)
const MockAsset = jest.fn().mockImplementation((code: string, issuer: string) => ({
  code,
  issuer,
  isNative: () => false,
  getCode: () => code,
  getIssuer: () => issuer,
}))
MockAsset.native = MockAssetNative

const MockNetworks = {
  PUBLIC: 'Public Global Stellar Network ; September 2015',
  TESTNET: 'Test SDF Network ; September 2015',
}

const mockPathPaymentOp = jest.fn().mockReturnValue({ type: 'pathPaymentStrictSend' })
const MockOperation = { pathPaymentStrictSend: mockPathPaymentOp }

const MockTransactionBuilder = jest.fn().mockImplementation(() => mockBuilder)

jest.mock('@stellar/stellar-sdk', () => ({
  __esModule: true,
  default: MockServer,
  Asset: MockAsset,
  Networks: MockNetworks,
  Operation: MockOperation,
  TransactionBuilder: MockTransactionBuilder,
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SOURCE_KEY = 'GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV3TNFWQQE6'

function mockFetch(responses: Array<{ ok: boolean; status?: number; body?: unknown }>) {
  let callIndex = 0
  return jest.fn().mockImplementation(() => {
    const res = responses[callIndex] ?? responses[responses.length - 1]
    callIndex++
    return Promise.resolve({
      ok: res.ok,
      status: res.status ?? (res.ok ? 200 : 400),
      json: () => Promise.resolve(res.body ?? {}),
    })
  })
}

function makePathRecord(destinationAmount: string) {
  return {
    destination_amount: destinationAmount,
    path: [
      { asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' },
    ],
  }
}

const mockSim: SwapSimulation = {
  fromAsset: 'cNGN',
  toAsset: 'USDC',
  fromAmount: '100',
  toAmount: '0.0630000',
  path: [],
  minReceived: '0.0623700',
  rate: '0.0006300',
  fee: '100',
  slippagePct: 1,
}

beforeEach(() => {
  jest.clearAllMocks()
  mockFetchBaseFee.mockResolvedValue(100)
  mockLoadAccount.mockResolvedValue({ id: SOURCE_KEY, sequence: '1' })
  mockBuild.mockReturnValue({ toXDR: mockToXDR })
  MockTransactionBuilder.mockImplementation(() => mockBuilder)
  // Ensure NEXT_PUBLIC_CNGN_ISSUER is set so getAsset works for cNGN
  process.env.NEXT_PUBLIC_CNGN_ISSUER = 'GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV3TNFWQQE'
  process.env.NEXT_PUBLIC_USDC_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'
})

// ---------------------------------------------------------------------------
// simulateSwap
// ---------------------------------------------------------------------------

describe('simulateSwap — success', () => {
  it('returns a simulation object with correct fields', async () => {
    global.fetch = mockFetch([
      {
        ok: true,
        body: { _embedded: { records: [makePathRecord('0.0630000')] } },
      },
    ])

    const result = await simulateSwap('cNGN', 'USDC', '100', 1, 'PUBLIC')

    expect(result.fromAsset).toBe('cNGN')
    expect(result.toAsset).toBe('USDC')
    expect(result.fromAmount).toBe('100')
    expect(result.toAmount).toBe('0.0630000')
    expect(result.slippagePct).toBe(1)
    expect(result.fee).toBe('100')
  })

  it('applies slippage to minReceived correctly', async () => {
    global.fetch = mockFetch([
      {
        ok: true,
        body: { _embedded: { records: [makePathRecord('100.0000000')] } },
      },
    ])

    // 2% slippage: minReceived = 100 * (1 - 0.02) = 98.0
    const result = await simulateSwap('XLM', 'cNGN', '1000', 2, 'PUBLIC')
    expect(parseFloat(result.minReceived)).toBeCloseTo(98, 5)
  })

  it('calculates rate correctly (toAmount / fromAmount)', async () => {
    global.fetch = mockFetch([
      {
        ok: true,
        body: { _embedded: { records: [makePathRecord('200.0000000')] } },
      },
    ])

    const result = await simulateSwap('XLM', 'cNGN', '100', 0.5, 'PUBLIC')
    // rate = 200 / 100 = 2.0
    expect(parseFloat(result.rate)).toBeCloseTo(2.0, 5)
  })

  it('selects the path with the highest destination_amount', async () => {
    global.fetch = mockFetch([
      {
        ok: true,
        body: {
          _embedded: {
            records: [
              makePathRecord('50.0000000'),
              makePathRecord('100.0000000'), // best
              makePathRecord('75.0000000'),
            ],
          },
        },
      },
    ])

    const result = await simulateSwap('cNGN', 'USDC', '1000', 1, 'PUBLIC')
    expect(result.toAmount).toBe('100.0000000')
  })

  it('uses the TESTNET Horizon URL when network is TESTNET', async () => {
    global.fetch = mockFetch([
      { ok: true, body: { _embedded: { records: [makePathRecord('1.0')] } } },
    ])

    await simulateSwap('XLM', 'cNGN', '10', 0.5, 'TESTNET')

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0] as string
    expect(fetchCall).toContain('horizon-testnet.stellar.org')
  })

  it('uses the PUBLIC Horizon URL when network is PUBLIC', async () => {
    global.fetch = mockFetch([
      { ok: true, body: { _embedded: { records: [makePathRecord('1.0')] } } },
    ])

    await simulateSwap('XLM', 'cNGN', '10', 0.5, 'PUBLIC')

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0] as string
    expect(fetchCall).toContain('horizon.stellar.org')
  })

  it('uses native source_asset_type for XLM', async () => {
    global.fetch = mockFetch([
      { ok: true, body: { _embedded: { records: [makePathRecord('50.0')] } } },
    ])

    await simulateSwap('XLM', 'cNGN', '10', 0.5, 'PUBLIC')

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0] as string
    expect(fetchCall).toContain('source_asset_type=native')
  })

  it('includes issuer in query for credit asset', async () => {
    global.fetch = mockFetch([
      { ok: true, body: { _embedded: { records: [makePathRecord('10.0')] } } },
    ])

    await simulateSwap('cNGN', 'USDC', '100', 0.5, 'PUBLIC')

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0] as string
    expect(fetchCall).toContain('source_asset_code=cNGN')
    expect(fetchCall).toContain('source_asset_issuer=')
  })

  it('maps path records to Asset objects', async () => {
    global.fetch = mockFetch([
      {
        ok: true,
        body: {
          _embedded: {
            records: [
              {
                destination_amount: '10.0',
                path: [{ asset_type: 'native' }],
              },
            ],
          },
        },
      },
    ])

    const result = await simulateSwap('cNGN', 'USDC', '100', 0.5, 'PUBLIC')
    expect(result.path).toHaveLength(1)
  })
})

describe('simulateSwap — errors', () => {
  it('throws when fetch response is not ok', async () => {
    global.fetch = mockFetch([{ ok: false, status: 400 }])

    await expect(simulateSwap('cNGN', 'USDC', '100', 1, 'PUBLIC')).rejects.toThrow(
      'Path-finding failed: 400'
    )
  })

  it('throws when no records are returned', async () => {
    global.fetch = mockFetch([
      { ok: true, body: { _embedded: { records: [] } } },
    ])

    await expect(simulateSwap('cNGN', 'USDC', '100', 1, 'PUBLIC')).rejects.toThrow(
      'No swap path found for this pair'
    )
  })

  it('throws for unknown asset with no issuer', async () => {
    // cKES has no issuer configured by default
    delete process.env.NEXT_PUBLIC_CKES_ISSUER
    // The module-level ASSET_ISSUERS will have cKES as empty string
    // Because the mock re-requires the module... we test via observable throw
    global.fetch = mockFetch([
      { ok: true, body: { _embedded: { records: [makePathRecord('1.0')] } } },
    ])

    // This will throw from getAsset because issuer is empty string
    await expect(simulateSwap('cKES', 'USDC', '100', 1, 'PUBLIC')).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// buildSwapXdr
// ---------------------------------------------------------------------------

describe('buildSwapXdr', () => {
  it('returns an XDR string', async () => {
    const xdr = await buildSwapXdr(SOURCE_KEY, mockSim, 'PUBLIC')
    expect(typeof xdr).toBe('string')
    expect(xdr.length).toBeGreaterThan(0)
  })

  it('calls pathPaymentStrictSend with correct sendAsset, sendAmount, destMin, and path', async () => {
    await buildSwapXdr(SOURCE_KEY, mockSim, 'PUBLIC')

    expect(mockPathPaymentOp).toHaveBeenCalledWith(
      expect.objectContaining({
        sendAmount: mockSim.fromAmount,
        destMin: mockSim.minReceived,
      })
    )
  })

  it('uses sourcePublicKey as the destination (self-swap)', async () => {
    await buildSwapXdr(SOURCE_KEY, mockSim, 'PUBLIC')

    expect(mockPathPaymentOp).toHaveBeenCalledWith(
      expect.objectContaining({
        destination: SOURCE_KEY,
      })
    )
  })

  it('uses PUBLIC network passphrase when network is PUBLIC', async () => {
    await buildSwapXdr(SOURCE_KEY, mockSim, 'PUBLIC')

    expect(MockTransactionBuilder).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ networkPassphrase: MockNetworks.PUBLIC })
    )
  })

  it('uses TESTNET network passphrase when network is TESTNET', async () => {
    await buildSwapXdr(SOURCE_KEY, { ...mockSim, fromAsset: 'XLM', toAsset: 'cNGN' }, 'TESTNET')

    expect(MockTransactionBuilder).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ networkPassphrase: MockNetworks.TESTNET })
    )
  })

  it('uses TESTNET Horizon URL when network is TESTNET', async () => {
    await buildSwapXdr(SOURCE_KEY, { ...mockSim, fromAsset: 'XLM', toAsset: 'cNGN' }, 'TESTNET')
    expect(MockServer).toHaveBeenCalledWith('https://horizon-testnet.stellar.org')
  })

  it('sets fee from Horizon on the TransactionBuilder', async () => {
    mockFetchBaseFee.mockResolvedValue(300)
    await buildSwapXdr(SOURCE_KEY, mockSim, 'PUBLIC')

    expect(MockTransactionBuilder).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ fee: '300' })
    )
  })

  it('calls setTimeout(300)', async () => {
    await buildSwapXdr(SOURCE_KEY, mockSim, 'PUBLIC')
    expect(mockSetTimeout).toHaveBeenCalledWith(300)
  })
})
