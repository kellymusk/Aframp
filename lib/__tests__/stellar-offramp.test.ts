/**
 * Tests for lib/offramp/stellar-offramp.ts — buildOfframpPaymentXdr
 *
 * Covers:
 *  - XDR builds correctly for XLM native asset
 *  - XDR builds correctly for cNGN with a configured issuer
 *  - Falls back to native asset for unknown asset codes
 *  - Correct destination, amount, and fee are passed to the operation
 *  - Memo is added when provided and truncated at 28 chars
 *  - No memo is added when memo is not provided
 *  - TESTNET vs PUBLIC Horizon URL selection
 *  - TESTNET vs PUBLIC network passphrase selection
 *  - setTimeout(300) is called
 *  - Returns the XDR string from the built transaction
 */

import { buildOfframpPaymentXdr } from '../offramp/stellar-offramp'

// ---------------------------------------------------------------------------
// Mock @stellar/stellar-sdk
// ---------------------------------------------------------------------------

const mockBuild = jest.fn()
const mockToXDR = jest.fn().mockReturnValue('OFFRAMP_XDR==')
const mockSetTimeout = jest.fn().mockReturnThis()
const mockAddMemo = jest.fn().mockReturnThis()
const mockAddOperation = jest.fn().mockReturnThis()

const mockBuilder = {
  addOperation: mockAddOperation,
  addMemo: mockAddMemo,
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

const nativeAsset = { isNative: () => true }
const MockAssetNative = jest.fn().mockReturnValue(nativeAsset)
const MockAsset = jest.fn().mockImplementation((code: string, issuer: string) => ({
  code,
  issuer,
  isNative: () => false,
}))
MockAsset.native = MockAssetNative

const MockMemoText = jest.fn().mockImplementation((text: string) => ({ type: 'text', text }))
const MockMemo = { text: MockMemoText }

const MockNetworks = {
  PUBLIC: 'Public Global Stellar Network ; September 2015',
  TESTNET: 'Test SDF Network ; September 2015',
}

const mockPaymentOp = jest.fn().mockReturnValue({ type: 'payment' })
const MockOperation = { payment: mockPaymentOp }

const MockTransactionBuilder = jest.fn().mockImplementation(() => mockBuilder)

jest.mock('@stellar/stellar-sdk', () => ({
  __esModule: true,
  default: MockServer,
  Asset: MockAsset,
  Memo: MockMemo,
  Networks: MockNetworks,
  Operation: MockOperation,
  TransactionBuilder: MockTransactionBuilder,
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SOURCE_KEY = 'GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV3TNFWQQE6'
const DEST_KEY   = 'GBPXEZPKDQMTQPXHDKVMPJF5GGMEXNWRDANL7HZNFMLFK2AEY5MLJK2'
const CNGN_ISSUER = 'GCNGN_ISSUER_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

beforeEach(() => {
  jest.clearAllMocks()
  mockFetchBaseFee.mockResolvedValue(100)
  mockLoadAccount.mockResolvedValue({ id: SOURCE_KEY, sequence: '1' })
  mockBuild.mockReturnValue({ toXDR: mockToXDR })
  MockTransactionBuilder.mockImplementation(() => mockBuilder)
  process.env.NEXT_PUBLIC_CNGN_ISSUER = CNGN_ISSUER
})

// ---------------------------------------------------------------------------
// XDR build
// ---------------------------------------------------------------------------

describe('buildOfframpPaymentXdr — XDR build', () => {
  it('returns the XDR string from the built transaction', async () => {
    const xdr = await buildOfframpPaymentXdr({
      sourcePublicKey: SOURCE_KEY,
      destination: DEST_KEY,
      amount: 100,
      assetCode: 'XLM',
      network: 'PUBLIC',
    })

    expect(xdr).toBe('OFFRAMP_XDR==')
  })

  it('calls setTimeout(300) on the builder', async () => {
    await buildOfframpPaymentXdr({
      sourcePublicKey: SOURCE_KEY,
      destination: DEST_KEY,
      amount: 50,
      assetCode: 'XLM',
      network: 'PUBLIC',
    })

    expect(mockSetTimeout).toHaveBeenCalledWith(300)
  })
})

// ---------------------------------------------------------------------------
// Asset selection
// ---------------------------------------------------------------------------

describe('buildOfframpPaymentXdr — asset selection', () => {
  it('uses Asset.native() for XLM', async () => {
    await buildOfframpPaymentXdr({
      sourcePublicKey: SOURCE_KEY,
      destination: DEST_KEY,
      amount: 10,
      assetCode: 'XLM',
      network: 'PUBLIC',
    })

    expect(MockAssetNative).toHaveBeenCalled()
    expect(MockAsset).not.toHaveBeenCalled()
  })

  it('creates cNGN Asset with correct issuer when NEXT_PUBLIC_CNGN_ISSUER is set', async () => {
    await buildOfframpPaymentXdr({
      sourcePublicKey: SOURCE_KEY,
      destination: DEST_KEY,
      amount: 1000,
      assetCode: 'cNGN',
      network: 'PUBLIC',
    })

    expect(MockAsset).toHaveBeenCalledWith('cNGN', CNGN_ISSUER)
  })

  it('falls back to native asset when assetCode is cNGN but CNGN_ISSUER is not set', async () => {
    process.env.NEXT_PUBLIC_CNGN_ISSUER = ''

    await buildOfframpPaymentXdr({
      sourcePublicKey: SOURCE_KEY,
      destination: DEST_KEY,
      amount: 500,
      assetCode: 'cNGN',
      network: 'PUBLIC',
    })

    // When issuer is empty, it falls back to native
    expect(MockAssetNative).toHaveBeenCalled()
  })

  it('falls back to native asset for unknown asset codes (e.g. USDC without configured issuer)', async () => {
    await buildOfframpPaymentXdr({
      sourcePublicKey: SOURCE_KEY,
      destination: DEST_KEY,
      amount: 200,
      assetCode: 'USDC',
      network: 'PUBLIC',
    })

    expect(MockAssetNative).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Payment operation parameters
// ---------------------------------------------------------------------------

describe('buildOfframpPaymentXdr — payment operation params', () => {
  it('passes the correct destination to the payment operation', async () => {
    await buildOfframpPaymentXdr({
      sourcePublicKey: SOURCE_KEY,
      destination: DEST_KEY,
      amount: 100,
      assetCode: 'XLM',
      network: 'PUBLIC',
    })

    expect(mockPaymentOp).toHaveBeenCalledWith(
      expect.objectContaining({ destination: DEST_KEY })
    )
  })

  it('converts numeric amount to string for the payment operation', async () => {
    await buildOfframpPaymentXdr({
      sourcePublicKey: SOURCE_KEY,
      destination: DEST_KEY,
      amount: 750,
      assetCode: 'XLM',
      network: 'PUBLIC',
    })

    expect(mockPaymentOp).toHaveBeenCalledWith(
      expect.objectContaining({ amount: '750' })
    )
  })

  it('sets fee from Horizon fetchBaseFee on the TransactionBuilder', async () => {
    mockFetchBaseFee.mockResolvedValue(500)

    await buildOfframpPaymentXdr({
      sourcePublicKey: SOURCE_KEY,
      destination: DEST_KEY,
      amount: 10,
      assetCode: 'XLM',
      network: 'PUBLIC',
    })

    expect(MockTransactionBuilder).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ fee: '500' })
    )
  })
})

// ---------------------------------------------------------------------------
// Memo handling
// ---------------------------------------------------------------------------

describe('buildOfframpPaymentXdr — memo', () => {
  it('adds a text memo when memo is provided', async () => {
    await buildOfframpPaymentXdr({
      sourcePublicKey: SOURCE_KEY,
      destination: DEST_KEY,
      amount: 100,
      assetCode: 'XLM',
      network: 'PUBLIC',
      memo: 'Offramp order 123',
    })

    expect(MockMemoText).toHaveBeenCalledWith('Offramp order 123')
    expect(mockAddMemo).toHaveBeenCalled()
  })

  it('truncates memo to 28 characters', async () => {
    const longMemo = 'This is a memo that is longer than twenty-eight characters'
    await buildOfframpPaymentXdr({
      sourcePublicKey: SOURCE_KEY,
      destination: DEST_KEY,
      amount: 100,
      assetCode: 'XLM',
      network: 'PUBLIC',
      memo: longMemo,
    })

    expect(MockMemoText).toHaveBeenCalledWith(longMemo.slice(0, 28))
  })

  it('does not add memo when memo is undefined', async () => {
    await buildOfframpPaymentXdr({
      sourcePublicKey: SOURCE_KEY,
      destination: DEST_KEY,
      amount: 100,
      assetCode: 'XLM',
      network: 'PUBLIC',
    })

    expect(mockAddMemo).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Network / Horizon URL selection
// ---------------------------------------------------------------------------

describe('buildOfframpPaymentXdr — network selection', () => {
  it('uses TESTNET Horizon URL when network is TESTNET', async () => {
    await buildOfframpPaymentXdr({
      sourcePublicKey: SOURCE_KEY,
      destination: DEST_KEY,
      amount: 10,
      assetCode: 'XLM',
      network: 'TESTNET',
    })

    expect(MockServer).toHaveBeenCalledWith('https://horizon-testnet.stellar.org')
  })

  it('uses PUBLIC Horizon URL when network is PUBLIC', async () => {
    await buildOfframpPaymentXdr({
      sourcePublicKey: SOURCE_KEY,
      destination: DEST_KEY,
      amount: 10,
      assetCode: 'XLM',
      network: 'PUBLIC',
    })

    expect(MockServer).toHaveBeenCalledWith('https://horizon.stellar.org')
  })

  it('uses PUBLIC Horizon URL when network is null', async () => {
    await buildOfframpPaymentXdr({
      sourcePublicKey: SOURCE_KEY,
      destination: DEST_KEY,
      amount: 10,
      assetCode: 'XLM',
      network: null,
    })

    expect(MockServer).toHaveBeenCalledWith('https://horizon.stellar.org')
  })

  it('uses TESTNET network passphrase when network is TESTNET', async () => {
    await buildOfframpPaymentXdr({
      sourcePublicKey: SOURCE_KEY,
      destination: DEST_KEY,
      amount: 10,
      assetCode: 'XLM',
      network: 'TESTNET',
    })

    expect(MockTransactionBuilder).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ networkPassphrase: MockNetworks.TESTNET })
    )
  })

  it('uses PUBLIC network passphrase when network is PUBLIC', async () => {
    await buildOfframpPaymentXdr({
      sourcePublicKey: SOURCE_KEY,
      destination: DEST_KEY,
      amount: 10,
      assetCode: 'XLM',
      network: 'PUBLIC',
    })

    expect(MockTransactionBuilder).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ networkPassphrase: MockNetworks.PUBLIC })
    )
  })
})
