/**
 * Thin wrapper around the Freighter browser extension's injected
 * `window.freighterApi`. Freighter injects this object into every page; when
 * it's absent the extension simply isn't installed.
 *
 * We talk to the injected global directly rather than depending on
 * `@stellar/freighter-api` so this stays a zero-dependency, isolated module —
 * easy to swap out once the project settles on a wallet-connect library.
 */
'use client'

export const FREIGHTER_INSTALL_URL = 'https://www.freighter.app/'

interface FreighterAddressResult {
  address: string
  error?: string
}

interface FreighterSignedTxResult {
  signedTxXdr: string
  signerAddress?: string
  error?: string
}

interface FreighterConnectedResult {
  isConnected: boolean
  error?: string
}

interface FreighterApi {
  isConnected: () => Promise<FreighterConnectedResult>
  getAddress: () => Promise<FreighterAddressResult>
  requestAccess: () => Promise<FreighterAddressResult>
  signTransaction: (
    xdr: string,
    opts: { networkPassphrase: string }
  ) => Promise<FreighterSignedTxResult>
}

declare global {
  interface Window {
    freighterApi?: FreighterApi
  }
}

export class FreighterNotInstalledError extends Error {
  constructor() {
    super('Freighter extension was not detected in this browser.')
    this.name = 'FreighterNotInstalledError'
  }
}

/** Synchronous check — safe to call during render for conditional UI. */
export function isFreighterInstalled(): boolean {
  return typeof window !== 'undefined' && typeof window.freighterApi !== 'undefined'
}

function requireFreighter(): FreighterApi {
  if (!isFreighterInstalled()) throw new FreighterNotInstalledError()
  return window.freighterApi!
}

/**
 * Requests wallet access and returns the connected public key (G...).
 * Throws {@link FreighterNotInstalledError} if the extension isn't present.
 */
export async function connectFreighter(): Promise<string> {
  const freighter = requireFreighter()

  const connected = await freighter.isConnected()
  if (connected.error) throw new Error(connected.error)

  const access = await freighter.requestAccess()
  if (access.error) throw new Error(access.error)
  if (!access.address) throw new Error('Freighter did not return a wallet address.')

  return access.address
}

/**
 * Signs a SEP-0010 challenge transaction (base64 XDR) with Freighter and
 * returns the signed XDR to hand back to the backend's verify endpoint.
 */
export async function signChallengeTransaction(
  challengeXdr: string,
  networkPassphrase: string
): Promise<string> {
  const freighter = requireFreighter()
  const result = await freighter.signTransaction(challengeXdr, { networkPassphrase })
  if (result.error) throw new Error(result.error)
  if (!result.signedTxXdr) throw new Error('Freighter did not return a signed transaction.')
  return result.signedTxXdr
}
