/**
 * Tests for lib/stellar-p2p.ts
 *
 * Covers:
 *  - isValidStellarAddress — valid and invalid inputs
 *  - estimateStellarFee — returns XLM fee string, uses correct Horizon URL
 *  - sendStellarP2P — XDR builds correctly for given params
 *                   — correct asset codes and issuers are used
 *                   — memo is applied correctly (and truncated at 28 chars)
 *                   — fee from Horizon is forwarded to TransactionBuilder
 *                   — error: invalid destination address
 *                   — error: server.loadAccount throws
 *                   — error: Freighter signing fails
 *                   — error: submitTransaction throws
 *                   — XLM native asset vs. custom asset branch
 */

import { isValidStellarAddress, estimateStellarFee, sendStellarP2P } from '../stellar-p2p'

// ---------------------------------------------------------------------------
// Mock @stellar/stellar-sdk
// ---------------------------------------------------------------------------

const mockBuild = jest.fn()
const mockToXDR = jest.fn().mockReturnValue('AAAA==')
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
const mockSubmitTransaction = jest.fn()
const mockFromXDR = jest.fn().mockReturnValue({})

const MockServer = jest.fn().mockImplementation(() => ({
  loadAccount: mockLoadAccount,
  fetchBaseFee: mockFetchBaseFee,
  submitTransaction: mockSubmitTransaction,
}))

const MockAssetNative = jest.fn().mockImplementation(() => ({ isNative: () => true }))
const MockAsset = jest.fn().mockImplementation((code: string, issuer: string) => ({
  code,
  issuer,
  isNative: () => false,
}))
MockAsset.native = MockAssetNative

const MockMemoText = jest.fn().mockImplementation((text: string) => ({ type: 'text', text }))
const MockMemo = { text: MockMemoText }

const MockNetworks = { PUBLIC: 'Public Global Stellar Network ; September 2015', TESTNET: 'Test SDF Network ; September 2015' }

const mockPaymentOperation = jest.fn().mockReturnValue({ type: 'payment' })
const MockOperation = { payment: mockPaymentOperation }

const MockTransactionBuilder = jest.fn().mockImplementation(() => mockBuilder)
MockTransactionBuilder.fromXDR = mockFromXDR

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
// Mock Freighter signing
// ---------------------------------------------------------------------------

const mockSignTransaction = jest.fn()

jest.mock('@/lib/wallet/freighter', () => ({
  signTransactionWithFreighter: mockSignTransaction,
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_ADDRESS = 'GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV3TNFWQQE6'
const DEST_ADDRESS  = 'GBPXEZPKDQMTQPXHDKVMPJF5GGMEXNWRDANL7HZNFMLFK2AEY5MLJK2'

function makeStellarAccount() {
  return { id: VALID_ADDRESS, sequence: '1' }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockFetchBaseFee.mockResolvedValue(100)
  mockLoadAccount.mockResolvedValue(makeStellarAccount())
  mockBuild.mockReturnValue({ toXDR: mockToXDR })
  mockSignTransaction.mockResolvedValue({ signedTxXdr: 'BBBB==', error: undefined })
  mockSubmitTransaction.mockResolvedValue({ hash: 'abc123txhash' })
  MockTransactionBuilder.mockImplementation(() => mockBuilder)
})

// ---------------------------------------------------------------------------
// isValidStellarAddress
// ---------------------------------------------------------------------------

describe('isValidStellarAddress', () => {
  it('returns true for a valid 56-char G-prefix address', () => {
    expect(isValidStellarAddress(VALID_ADDRESS)).toBe(true)
  })

  it('returns false for an address starting with B', () => {
    expect(isValidStellarAddress('BBPXEZPKDQMTQPXHDKVMPJF5GGMEXNWRDANL7HZNFMLFK2AEY5MLJK2')).toBe(false)
  })

  it('returns false for an address that is too short', () => {
    expect(isValidStellarAddress('GABC')).toBe(false)
  })

  it('returns false for an empty string', () => {
    expect(isValidStellarAddress('')).toBe(false)
  })

  it('returns false for an address with lowercase chars', () => {
    expect(isValidStellarAddress('gahjjjkmokye4rvpzewztkh5fvi4pa3vl7gk2lfnubsgbv3tnfwqqe6')).toBe(false)
  })

  it('returns false for an address with invalid characters', () => {
    // Contains '0', '1', '8', '9' which are not in base32 charset
    const invalid = 'G0HJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV3TNFWQQE6'
    expect(isValidStellarAddress(invalid)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// estimateStellarFee
// ---------------------------------------------------------------------------

describe('estimateStellarFee', () => {
  it('converts base fee in stroops to XLM string', async () => {
    mockFetchBaseFee.mockResolvedValue(100)
    const fee = await estimateStellarFee('PUBLIC')
    // 100 stroops / 10_000_000 = 0.0000100 XLM
    expect(fee).toBe('0.0000100')
  })

  it('uses the TESTNET Horizon URL when network is TESTNET', async () => {
    await estimateStellarFee('TESTNET')
    expect(MockServer).toHaveBeenCalledWith('https://horizon-testnet.stellar.org')
  })

  it('uses the PUBLIC Horizon URL when network is PUBLIC', async () => {
    await estimateStellarFee('PUBLIC')
    expect(MockServer).toHaveBeenCalledWith('https://horizon.stellar.org')
  })

  it('falls back to PUBLIC Horizon URL when network is null', async () => {
    await estimateStellarFee(null)
    expect(MockServer).toHaveBeenCalledWith('https://horizon.stellar.org')
  })
})

// ---------------------------------------------------------------------------
// sendStellarP2P — invalid destination
// ---------------------------------------------------------------------------

describe('sendStellarP2P — validation', () => {
  it('returns error for invalid destination address', async () => {
    const result = await sendStellarP2P({
      sourcePublicKey: VALID_ADDRESS,
      destination: 'not-a-stellar-address',
      amount: '10',
      assetCode: 'XLM',
      network: 'PUBLIC',
    })
    expect(result.txHash).toBe('')
    expect(result.error).toBe('Invalid destination address')
    // Should not even hit Horizon
    expect(mockLoadAccount).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// sendStellarP2P — XDR build correctness
// ---------------------------------------------------------------------------

describe('sendStellarP2P — XDR build', () => {
  it('builds a payment operation with the correct destination, asset, and amount', async () => {
    await sendStellarP2P({
      sourcePublicKey: VALID_ADDRESS,
      destination: DEST_ADDRESS,
      amount: '25.5',
      assetCode: 'XLM',
      network: 'PUBLIC',
    })

    expect(mockPaymentOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        destination: DEST_ADDRESS,
        amount: '25.5',
      })
    )
  })

  it('uses Asset.native() for XLM asset code', async () => {
    await sendStellarP2P({
      sourcePublicKey: VALID_ADDRESS,
      destination: DEST_ADDRESS,
      amount: '1',
      assetCode: 'XLM',
      network: 'PUBLIC',
    })

    expect(MockAssetNative).toHaveBeenCalled()
  })

  it('creates a custom Asset for non-XLM asset code with provided issuer', async () => {
    const issuer = 'GAISSUERADDRESSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
    await sendStellarP2P({
      sourcePublicKey: VALID_ADDRESS,
      destination: DEST_ADDRESS,
      amount: '50',
      assetCode: 'cNGN',
      assetIssuer: issuer,
      network: 'PUBLIC',
    })

    expect(MockAsset).toHaveBeenCalledWith('cNGN', issuer)
  })

  it('falls back to sourcePublicKey as issuer when assetIssuer is not provided', async () => {
    await sendStellarP2P({
      sourcePublicKey: VALID_ADDRESS,
      destination: DEST_ADDRESS,
      amount: '10',
      assetCode: 'USDC',
      network: 'PUBLIC',
    })

    expect(MockAsset).toHaveBeenCalledWith('USDC', VALID_ADDRESS)
  })

  it('sets the fee from Horizon fetchBaseFee on the TransactionBuilder', async () => {
    mockFetchBaseFee.mockResolvedValue(200)

    await sendStellarP2P({
      sourcePublicKey: VALID_ADDRESS,
      destination: DEST_ADDRESS,
      amount: '5',
      assetCode: 'XLM',
      network: 'PUBLIC',
    })

    expect(MockTransactionBuilder).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ fee: '200' })
    )
  })

  it('uses PUBLIC network passphrase when network is PUBLIC', async () => {
    await sendStellarP2P({
      sourcePublicKey: VALID_ADDRESS,
      destination: DEST_ADDRESS,
      amount: '1',
      assetCode: 'XLM',
      network: 'PUBLIC',
    })

    expect(MockTransactionBuilder).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ networkPassphrase: MockNetworks.PUBLIC })
    )
  })

  it('uses TESTNET network passphrase when network is TESTNET', async () => {
    await sendStellarP2P({
      sourcePublicKey: VALID_ADDRESS,
      destination: DEST_ADDRESS,
      amount: '1',
      assetCode: 'XLM',
      network: 'TESTNET',
    })

    expect(MockTransactionBuilder).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ networkPassphrase: MockNetworks.TESTNET })
    )
  })

  it('calls setTimeout(300) on the builder', async () => {
    await sendStellarP2P({
      sourcePublicKey: VALID_ADDRESS,
      destination: DEST_ADDRESS,
      amount: '1',
      assetCode: 'XLM',
      network: 'PUBLIC',
    })

    expect(mockSetTimeout).toHaveBeenCalledWith(300)
  })
})

// ---------------------------------------------------------------------------
// sendStellarP2P — memo handling
// ---------------------------------------------------------------------------

describe('sendStellarP2P — memo', () => {
  it('adds a text memo when memo is provided', async () => {
    await sendStellarP2P({
      sourcePublicKey: VALID_ADDRESS,
      destination: DEST_ADDRESS,
      amount: '1',
      assetCode: 'XLM',
      memo: 'Invoice #42',
      network: 'PUBLIC',
    })

    expect(MockMemoText).toHaveBeenCalledWith('Invoice #42')
    expect(mockAddMemo).toHaveBeenCalled()
  })

  it('truncates memo to 28 characters', async () => {
    const longMemo = 'This memo is definitely longer than 28 characters long'
    await sendStellarP2P({
      sourcePublicKey: VALID_ADDRESS,
      destination: DEST_ADDRESS,
      amount: '1',
      assetCode: 'XLM',
      memo: longMemo,
      network: 'PUBLIC',
    })

    expect(MockMemoText).toHaveBeenCalledWith(longMemo.trim().slice(0, 28))
  })

  it('does not add memo when memo is undefined', async () => {
    await sendStellarP2P({
      sourcePublicKey: VALID_ADDRESS,
      destination: DEST_ADDRESS,
      amount: '1',
      assetCode: 'XLM',
      network: 'PUBLIC',
    })

    expect(mockAddMemo).not.toHaveBeenCalled()
  })

  it('does not add memo when memo is empty string', async () => {
    await sendStellarP2P({
      sourcePublicKey: VALID_ADDRESS,
      destination: DEST_ADDRESS,
      amount: '1',
      assetCode: 'XLM',
      memo: '   ',
      network: 'PUBLIC',
    })

    expect(mockAddMemo).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// sendStellarP2P — success flow
// ---------------------------------------------------------------------------

describe('sendStellarP2P — success', () => {
  it('returns txHash on success', async () => {
    mockSubmitTransaction.mockResolvedValue({ hash: 'deadbeef' })

    const result = await sendStellarP2P({
      sourcePublicKey: VALID_ADDRESS,
      destination: DEST_ADDRESS,
      amount: '10',
      assetCode: 'XLM',
      network: 'PUBLIC',
    })

    expect(result.txHash).toBe('deadbeef')
    expect(result.error).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// sendStellarP2P — error cases
// ---------------------------------------------------------------------------

describe('sendStellarP2P — errors', () => {
  it('returns error when loadAccount throws', async () => {
    mockLoadAccount.mockRejectedValue(new Error('Account not found'))

    const result = await sendStellarP2P({
      sourcePublicKey: VALID_ADDRESS,
      destination: DEST_ADDRESS,
      amount: '10',
      assetCode: 'XLM',
      network: 'PUBLIC',
    })

    expect(result.txHash).toBe('')
    expect(result.error).toBe('Account not found')
  })

  it('returns error when Freighter signing returns an error', async () => {
    mockSignTransaction.mockResolvedValue({ signedTxXdr: '', error: 'User rejected' })

    const result = await sendStellarP2P({
      sourcePublicKey: VALID_ADDRESS,
      destination: DEST_ADDRESS,
      amount: '10',
      assetCode: 'XLM',
      network: 'PUBLIC',
    })

    expect(result.txHash).toBe('')
    expect(result.error).toBe('User rejected')
  })

  it('returns "Signing failed" when signedTxXdr is empty with no error message', async () => {
    mockSignTransaction.mockResolvedValue({ signedTxXdr: '', error: undefined })

    const result = await sendStellarP2P({
      sourcePublicKey: VALID_ADDRESS,
      destination: DEST_ADDRESS,
      amount: '10',
      assetCode: 'XLM',
      network: 'PUBLIC',
    })

    expect(result.txHash).toBe('')
    expect(result.error).toBe('Signing failed')
  })

  it('returns error when submitTransaction throws', async () => {
    mockSubmitTransaction.mockRejectedValue(new Error('Insufficient balance'))

    const result = await sendStellarP2P({
      sourcePublicKey: VALID_ADDRESS,
      destination: DEST_ADDRESS,
      amount: '10',
      assetCode: 'XLM',
      network: 'PUBLIC',
    })

    expect(result.txHash).toBe('')
    expect(result.error).toBe('Insufficient balance')
  })

  it('returns "Transaction failed" for non-Error throws', async () => {
    mockSubmitTransaction.mockRejectedValue('string error')

    const result = await sendStellarP2P({
      sourcePublicKey: VALID_ADDRESS,
      destination: DEST_ADDRESS,
      amount: '10',
      assetCode: 'XLM',
      network: 'PUBLIC',
    })

    expect(result.txHash).toBe('')
    expect(result.error).toBe('Transaction failed')
  })
})
