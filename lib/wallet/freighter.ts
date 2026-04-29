'use client'

import {
  isConnected,
  isAllowed,
  setAllowed,
  requestAccess,
  getAddress,
  getNetwork,
  signTransaction,
} from '@stellar/freighter-api'

export type FreighterNetwork = 'PUBLIC' | 'TESTNET' | 'FUTURENET' | 'STANDALONE'

export interface FreighterStatus {
  isInstalled: boolean
  isConnected: boolean
  isAllowed: boolean
  publicKey: string | null
  network: FreighterNetwork | null
}

export interface AssetBalance {
  asset: string
  balance: string
  issuer?: string
}

export interface SignTransactionResult {
  signedTxXdr: string
  signerAddress?: string
  error?: string
}

/**
 * Check if Freighter extension is installed
 */
export async function checkFreighterInstalled(): Promise<boolean> {
  try {
    const result = await isConnected()
    return result.isConnected
  } catch {
    return false
  }
}

/**
 * Check if AFRAMP is allowed to connect
 */
export async function checkFreighterAllowed(): Promise<boolean> {
  try {
    const result = await isAllowed()
    return result.isAllowed
  } catch {
    return false
  }
}

/**
 * Request access from Freighter
 */
export async function requestFreighterAccess(): Promise<string | null> {
  try {
    const accessResult = await setAllowed()
    if (!accessResult.isAllowed) {
      return null
    }
    const accessReq = await requestAccess()
    if (accessReq.error) {
      console.error('Freighter access error:', accessReq.error)
      return null
    }
    return accessReq.address
  } catch (error) {
    console.error('Freighter access request failed:', error)
    return null
  }
}

/**
 * Get current public key from Freighter
 */
export async function getFreighterPublicKey(): Promise<string | null> {
  try {
    const result = await getAddress()
    if (result.error) {
      return null
    }
    return result.address
  } catch {
    return null
  }
}

/**
 * Get current network from Freighter
 */
export async function getFreighterNetwork(): Promise<FreighterNetwork | null> {
  try {
    const result = await getNetwork()
    if (result.error) {
      return null
    }
    return result.network as FreighterNetwork
  } catch {
    return null
  }
}

/**
 * Get full Freighter status
 */
export async function getFreighterStatus(): Promise<FreighterStatus> {
  const isInstalledResult = await checkFreighterInstalled()

  if (!isInstalledResult) {
    return {
      isInstalled: false,
      isConnected: false,
      isAllowed: false,
      publicKey: null,
      network: null,
    }
  }

  const [isAllowedResult, publicKey, network] = await Promise.all([
    checkFreighterAllowed(),
    getFreighterPublicKey(),
    getFreighterNetwork(),
  ])

  return {
    isInstalled: true,
    isConnected: !!publicKey,
    isAllowed: isAllowedResult,
    publicKey,
    network,
  }
}

/**
 * Sign a transaction using Freighter
 */
export async function signTransactionWithFreighter(
  xdr: string,
  network: FreighterNetwork = 'PUBLIC',
  networkPassphrase?: string
): Promise<SignTransactionResult> {
  try {
    // Get the network passphrase based on network if not provided
    const passphrase = networkPassphrase || getNetworkPassphrase(network)
    const result = await signTransaction(xdr, {
      networkPassphrase: passphrase,
    })
    if (result.error) {
      return {
        signedTxXdr: '',
        error: result.error.message || 'Failed to sign transaction',
      }
    }
    return {
      signedTxXdr: result.signedTxXdr,
      signerAddress: result.signerAddress,
    }
  } catch (error) {
    return {
      signedTxXdr: '',
      error: error instanceof Error ? error.message : 'Failed to sign transaction',
    }
  }
}

/**
 * Get network passphrase for a given network
 */
function getNetworkPassphrase(network: FreighterNetwork): string {
  switch (network) {
    case 'PUBLIC':
      return 'Public Global Stellar Network ; September 2015'
    case 'TESTNET':
      return 'Test SDF Network ; September 2015'
    case 'FUTURENET':
      return 'Test SDF Future Network ; October 2022'
    default:
      return 'Public Global Stellar Network ; September 2015'
  }
}

/**
 * Fetch balances from Stellar Horizon API
 */
export async function fetchStellarBalances(
  publicKey: string,
  network: FreighterNetwork = 'PUBLIC'
): Promise<AssetBalance[]> {
  const horizonUrl =
    network === 'TESTNET' ? 'https://horizon-testnet.stellar.org' : 'https://horizon.stellar.org'

  try {
    const response = await fetch(`${horizonUrl}/accounts/${publicKey}`)

    if (!response.ok) {
      if (response.status === 404) {
        // Account not funded
        return [{ asset: 'XLM', balance: '0' }]
      }
      throw new Error(`Failed to fetch account: ${response.status}`)
    }

    const account = await response.json()
    const balances: AssetBalance[] = []

    for (const bal of account.balances) {
      if (bal.asset_type === 'native') {
        balances.push({ asset: 'XLM', balance: bal.balance })
      } else {
        balances.push({
          asset: bal.asset_code,
          balance: bal.balance,
          issuer: bal.asset_issuer,
        })
      }
    }

    return balances
  } catch (error) {
    console.error('Failed to fetch balances:', error)
    return [{ asset: 'XLM', balance: '0' }]
  }
}

/**
 * Format Stellar address for display
 */
export function formatStellarAddress(address: string, chars = 4): string {
  if (!address || address.length < chars * 2 + 3) return address
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

/**
 * Validate Stellar public key format
 */
export function isValidStellarPublicKey(key: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(key)
}
