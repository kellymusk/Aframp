import { getTransactionExplorerUrl } from '../config/network'

const TX = 'abc123deadbeef'

describe('getTransactionExplorerUrl', () => {
  const originalEnv = process.env.NEXT_PUBLIC_STELLAR_NETWORK

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_STELLAR_NETWORK
    } else {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = originalEnv
    }
  })

  it('returns a testnet URL when NEXT_PUBLIC_STELLAR_NETWORK is unset', () => {
    delete process.env.NEXT_PUBLIC_STELLAR_NETWORK
    expect(getTransactionExplorerUrl(TX)).toBe(
      `https://stellar.expert/explorer/testnet/tx/${TX}`
    )
  })

  it('returns a testnet URL when NEXT_PUBLIC_STELLAR_NETWORK=testnet', () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'testnet'
    expect(getTransactionExplorerUrl(TX)).toBe(
      `https://stellar.expert/explorer/testnet/tx/${TX}`
    )
  })

  it('returns a public URL when NEXT_PUBLIC_STELLAR_NETWORK=public', () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'public'
    expect(getTransactionExplorerUrl(TX)).toBe(
      `https://stellar.expert/explorer/public/tx/${TX}`
    )
  })
})
