/** Per-tab record of the merchant's wallet address, set once a wallet is created. */
const STORAGE_KEY = 'walletAddress'

function getAddress(): string | null {
  if (typeof window === 'undefined') return null
  return window.sessionStorage.getItem(STORAGE_KEY)
}

function setAddress(address: string): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(STORAGE_KEY, address)
}

function clear(): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(STORAGE_KEY)
}

export const walletSession = { getAddress, setAddress, clear }
