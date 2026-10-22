export type StellarNetwork = 'PUBLIC' | 'TESTNET' | 'FUTURENET';

/**
 * Resolve the configured Stellar network from the environment.
 *
 * CI sets `NEXT_PUBLIC_STELLAR_NETWORK` to `MAINNET` for mainnet builds, so
 * `MAINNET` is treated as an alias for `PUBLIC`. Anything unrecognized falls
 * back to `TESTNET` to preserve the previous default behavior.
 */
export function getStellarNetwork(): StellarNetwork {
  const raw = (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? '').toUpperCase();

  switch (raw) {
    case 'PUBLIC':
    case 'MAINNET':
      return 'PUBLIC';
    case 'FUTURENET':
      return 'FUTURENET';
    case 'TESTNET':
    default:
      return 'TESTNET';
  }
}

export function isMainnet(): boolean {
  return getStellarNetwork() === 'PUBLIC';
}

/**
 * Base URL for the Stellar Expert explorer matching the configured network.
 */
export function getExplorerBaseUrl(): string {
  const network = getStellarNetwork();

  switch (network) {
    case 'PUBLIC':
      return 'https://stellar.expert/explorer/public';
    case 'FUTURENET':
      return 'https://stellar.expert/explorer/futurenet';
    case 'TESTNET':
    default:
      return 'https://stellar.expert/explorer/testnet';
  }
}

/**
 * Build a Stellar Expert transaction URL for the given hash on the
 * configured network.
 */
export function getExplorerTxUrl(hash: string): string {
  return `${getExplorerBaseUrl()}/tx/${hash}`;
}
