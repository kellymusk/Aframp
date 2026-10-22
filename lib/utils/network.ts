export type StellarNetwork = 'PUBLIC' | 'MAINNET' | 'TESTNET' | 'FUTURENET';

/**
 * Resolve the configured Stellar network from the public env var.
 * CI sets `MAINNET` for mainnet builds, while other tooling may use `PUBLIC`.
 * Anything unrecognized falls back to testnet.
 */
export function getStellarNetwork(): StellarNetwork {
  const raw = (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? '').toUpperCase();
  switch (raw) {
    case 'PUBLIC':
    case 'MAINNET':
      return 'MAINNET';
    case 'FUTURENET':
      return 'FUTURENET';
    case 'TESTNET':
    default:
      return 'TESTNET';
  }
}

/** True when the build targets Stellar mainnet (accepts PUBLIC or MAINNET). */
export function isMainnet(): boolean {
  return getStellarNetwork() === 'MAINNET';
}

/**
 * Base URL for the Stellar explorer matching the configured network.
 * Mainnet -> stellar.expert/explorer/public, otherwise testnet.
 */
export function getExplorerBaseUrl(): string {
  switch (getStellarNetwork()) {
    case 'MAINNET':
      return 'https://stellar.expert/explorer/public';
    case 'FUTURENET':
      return 'https://stellar.expert/explorer/futurenet';
    case 'TESTNET':
    default:
      return 'https://stellar.expert/explorer/testnet';
  }
}

/** Build an explorer link for a transaction hash on the configured network. */
export function getExplorerTxUrl(hash: string): string {
  return `${getExplorerBaseUrl()}/tx/${hash}`;
}
