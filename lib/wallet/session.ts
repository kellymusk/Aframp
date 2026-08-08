/**
 * Wallet session storage — uses sessionStorage instead of localStorage to
 * limit the XSS exfiltration window (data is cleared when the tab closes and
 * is not accessible to other tabs/origins).
 */

const KEYS = {
  address: 'walletAddress',
  name: 'walletName',
  addressList: 'walletAddresses',
} as const

const store = typeof window !== 'undefined' ? window.sessionStorage : null

export const walletSession = {
  getAddress: () => store?.getItem(KEYS.address) ?? null,
  getName: () => store?.getItem(KEYS.name) ?? null,
  getAddressList: (): string[] => {
    const raw = store?.getItem(KEYS.addressList)
    return raw ? (JSON.parse(raw) as string[]) : []
  },

  setAddress: (address: string) => store?.setItem(KEYS.address, address),
  setName: (name: string) => store?.setItem(KEYS.name, name),
  setAddressList: (list: string[]) => store?.setItem(KEYS.addressList, JSON.stringify(list)),

  clear: () => {
    store?.removeItem(KEYS.address)
    store?.removeItem(KEYS.name)
    store?.removeItem(KEYS.addressList)
  },
}
