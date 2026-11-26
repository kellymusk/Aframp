/**
 * Stellar network configuration helpers.
 *
 * Uses NEXT_PUBLIC_STELLAR_NETWORK to determine whether the app is pointing at
 * testnet or public (mainnet). Defaults to "testnet" so development and staging
 * environments never accidentally link to mainnet transactions.
 */

type StellarNetwork = 'testnet' | 'public'

function getStellarNetwork(): StellarNetwork {
  const env = process.env.NEXT_PUBLIC_STELLAR_NETWORK
  if (env === 'public') return 'public'
  return 'testnet'
}

const EXPLORER_ROOTS: Record<StellarNetwork, string> = {
  testnet: 'https://stellar.expert/explorer/testnet/tx',
  public: 'https://stellar.expert/explorer/public/tx',
}

/**
 * Returns the full stellar.expert URL for a transaction hash, honoring
 * NEXT_PUBLIC_STELLAR_NETWORK. Defaults to testnet when the variable is unset.
 */
export function getTransactionExplorerUrl(txHash: string): string {
  return `${EXPLORER_ROOTS[getStellarNetwork()]}/${txHash}`
}
