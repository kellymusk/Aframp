export type StellarNetwork = 'PUBLIC' | 'MAINNET' | 'TESTNET' | 'FUTURENET';

const RAW_NETWORK = (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? '').trim().toUpperCase();

/**
 * Normalized Stellar network for the current build.
 * CI sets `MAINNET` for mainnet builds, while other tooling may use `PUBLIC`.
 * Both are treated as mainnet here.
 */
export const STELLAR_NETWORK: StellarNetwork =
  RAW_NETWORK === 'PUBLIC' || RAW_NETWORK === 'MAINNET'
    ? 'MAINNET'
    : RAW_NETWORK === 'FUTURENET'
      ? 'FUTURENET'
      : 'TESTNET';

/** True when the build targets Stellar mainnet (accepts `MAINNET` or `PUBLIC`). */
export function isMainnet(): boolean {
  return STELLAR_NETWORK === 'MAINNET';
}

/** stellar.expert explorer path segment for the current network. */
export function getExplorerNetworkPath(): string {
  switch (STELLAR_NETWORK) {
    case 'MAINNET':
      return 'public';
    case 'FUTURENET':
      return 'futurenet';
    default:
      return 'testnet';
  }
}

/** Base URL of the stellar.expert explorer for the current network. */
export function getExplorerBaseUrl(): string {
  return `https://stellar.expert/explorer/${getExplorerNetworkPath()}`;
}

/** Build a stellar.expert explorer URL for a transaction hash on the current network. */
export function getTransactionExplorerUrl(hash: string): string {
  return `${getExplorerBaseUrl()}/tx/${hash}`;
}
