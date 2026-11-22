/**
 * Stellar network configuration utilities
 * Provides consistent network value across the application
 */

export type StellarNetwork = 'testnet' | 'public'

/**
 * Get the configured Stellar network.
 * Normalizes casing and defaults to testnet if not configured.
 */
export function getStellarNetwork(): StellarNetwork {
  const env = process.env.NEXT_PUBLIC_STELLAR_NETWORK?.toLowerCase()
  
  if (env === 'public' || env === 'mainnet') {
    return 'public'
  }
  
  // Default to testnet (includes 'testnet', undefined, empty, or any other value)
  return 'testnet'
}

/**
 * Get the Stellar Explorer base URL for the configured network
 */
export function getStellarExplorerBase(): string {
  const network = getStellarNetwork()
  return `https://stellar.expert/explorer/${network}`
}

/**
 * Get the Stellar Explorer URL for a specific account
 */
export function getStellarAccountUrl(address: string): string {
  return `${getStellarExplorerBase()}/account/${address}`
}

/**
 * Get the Stellar Explorer URL for a specific transaction
 */
export function getStellarTransactionUrl(txHash: string): string {
  return `${getStellarExplorerBase()}/tx/${txHash}`
}

/**
 * Get the Stellar Horizon API URL for the configured network
 */
export function getStellarHorizonUrl(): string {
  const network = getStellarNetwork()
  return network === 'public'
    ? 'https://horizon.stellar.org'
    : 'https://horizon-testnet.stellar.org'
}
