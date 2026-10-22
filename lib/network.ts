export type StellarNetwork = 'TESTNET' | 'MAINNET'

const RAW_NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK

function parseNetwork(value: string | undefined): StellarNetwork {
  if (value === undefined || value === '') return 'TESTNET'
  if (value === 'TESTNET' || value === 'MAINNET') return value
  throw new Error(
    `Invalid NEXT_PUBLIC_STELLAR_NETWORK value "${value}". Expected "TESTNET" or "MAINNET".`
  )
}

export const network: StellarNetwork = parseNetwork(RAW_NETWORK)

export const isMainnet = network === 'MAINNET'

const EXPLORER_SEGMENT = isMainnet ? 'public' : 'testnet'

export function explorerTxUrl(hash: string): string {
  return `https://stellar.expert/explorer/${EXPLORER_SEGMENT}/tx/${hash}`
}

export function explorerAccountUrl(address: string): string {
  return `https://stellar.expert/explorer/${EXPLORER_SEGMENT}/account/${address}`
}

export function statusUrl(): string {
  return `https://stellar.expert/explorer/${EXPLORER_SEGMENT}`
}
