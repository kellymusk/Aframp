export interface Bank {
  id: string
  name: string
  code: string
  logo?: string
}

export interface BankAccount {
  id: string
  bankName: string
  bankCode: string
  accountNumber: string
  accountName: string
  lastUsed?: Date
}

export const NIGERIAN_BANKS: Bank[] = [
  {
    id: '1',
    name: 'Access Bank',
    code: '044',
    logo: 'https://nigerianbanks.xyz/logo/access-bank.png',
  },
  {
    id: '2',
    name: 'Guaranty Trust Bank',
    code: '058',
    logo: 'https://nigerianbanks.xyz/logo/guaranty-trust-bank.png',
  },
  {
    id: '3',
    name: 'First Bank of Nigeria',
    code: '011',
    logo: 'https://nigerianbanks.xyz/logo/first-bank-of-nigeria.png',
  },
  {
    id: '4',
    name: 'United Bank for Africa',
    code: '033',
    logo: 'https://nigerianbanks.xyz/logo/united-bank-for-africa.png',
  },
  {
    id: '5',
    name: 'Zenith Bank',
    code: '057',
    logo: 'https://nigerianbanks.xyz/logo/zenith-bank.png',
  },
  {
    id: '6',
    name: 'Stanbic IBTC Bank',
    code: '221',
    logo: 'https://nigerianbanks.xyz/logo/stanbic-ibtc-bank.png',
  },
  {
    id: '7',
    name: 'Sterling Bank',
    code: '232',
    logo: 'https://nigerianbanks.xyz/logo/sterling-bank.png',
  },
  {
    id: '8',
    name: 'Union Bank of Nigeria',
    code: '032',
    logo: 'https://nigerianbanks.xyz/logo/union-bank-of-nigeria.png',
  },
  { id: '9', name: 'Wema Bank', code: '035', logo: 'https://nigerianbanks.xyz/logo/wema-bank.png' },
  {
    id: '10',
    name: 'Fidelity Bank',
    code: '070',
    logo: 'https://nigerianbanks.xyz/logo/fidelity-bank.png',
  },
  {
    id: '11',
    name: 'Kuda Bank',
    code: '50211',
    logo: 'https://nigerianbanks.xyz/logo/kuda-bank.png',
  },
  { id: '12', name: 'OPay', code: '999992', logo: 'https://nigerianbanks.xyz/logo/opay.png' },
  { id: '13', name: 'Palmpay', code: '999991', logo: 'https://nigerianbanks.xyz/logo/palmpay.png' },
  {
    id: '14',
    name: 'Moniepoint',
    code: '50515',
    logo: 'https://nigerianbanks.xyz/logo/moniepoint.png',
  },
  {
    id: '15',
    name: 'First City Monument Bank',
    code: '214',
    logo: 'https://nigerianbanks.xyz/logo/first-city-monument-bank.png',
  },
]

export const SAVED_ACCOUNTS_STORAGE_KEY = 'aframp_saved_accounts'

export async function fetchBanks(): Promise<Bank[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500))
  return NIGERIAN_BANKS
}

export async function verifyAccountNumber(
  bankCode: string,
  accountNumber: string
): Promise<string> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1500))

  if (accountNumber === '0123456789') {
    return 'CHUKWUEMEKA OKAFOR'
  }

  if (accountNumber.length === 10) {
    return 'JOHN DOE' // Default mock name for any 10 digit number
  }

  throw new Error('Invalid account number or verification failed')
}

export function saveAccount(account: Omit<BankAccount, 'id'>): BankAccount {
  const saved = getSavedAccounts()
  const newAccount: BankAccount = {
    ...account,
    id: Math.random().toString(36).substring(2, 9),
    lastUsed: new Date(),
  }

  const updated = [
    newAccount,
    ...saved.filter(
      (a) => a.accountNumber !== account.accountNumber || a.bankCode !== account.bankCode
    ),
  ]
  localStorage.setItem(SAVED_ACCOUNTS_STORAGE_KEY, JSON.stringify(updated.slice(0, 5)))
  return newAccount
}

export function getSavedAccounts(): BankAccount[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(SAVED_ACCOUNTS_STORAGE_KEY)
    const parsed = stored ? (JSON.parse(stored) as BankAccount[]) : []
    return parsed.map((account) => ({
      ...account,
      lastUsed: account.lastUsed ? new Date(account.lastUsed) : undefined,
    }))
  } catch {
    return []
  }
}

export function deleteSavedAccount(id: string): void {
  const saved = getSavedAccounts()
  const updated = saved.filter((a) => a.id !== id)
  localStorage.setItem(SAVED_ACCOUNTS_STORAGE_KEY, JSON.stringify(updated))
}

// Utility for rate limiting verification attempts
const VERIFICATION_ATTEMPTS_KEY = 'aframp_verification_attempts'
export function checkRateLimit(): boolean {
  const now = Date.now()
  const stored = localStorage.getItem(VERIFICATION_ATTEMPTS_KEY)
  let attempts = stored ? JSON.parse(stored) : []

  // Filter attempts in the last hour
  attempts = attempts.filter((timestamp: number) => now - timestamp < 3600000)

  if (attempts.length >= 5) {
    return false
  }

  attempts.push(now)
  localStorage.setItem(VERIFICATION_ATTEMPTS_KEY, JSON.stringify(attempts))
  return true
}

export async function signKycMessage(
  _address: string,
  _amount: number,
  _accountNumber: string
): Promise<string> {
  const message = `I authorize AFRAMP to send ₦${_amount.toLocaleString()} to account ${_accountNumber}`

  // Prefer a real Stellar wallet signature when available (e.g. Freighter)
  if (typeof window !== 'undefined') {
    type FreighterApi = {
      signMessage: (payload: { message: string; publicKey: string }) => Promise<string>
    }
    const freighterApi = (window as Window & { freighterApi?: FreighterApi }).freighterApi
    if (freighterApi && typeof freighterApi.signMessage === 'function') {
      try {
        const signature = await freighterApi.signMessage({
          message,
          publicKey: _address,
        })
        if (signature) return signature
      } catch (error) {
        console.warn('Stellar wallet signing failed, falling back to mock signature', error)
      }
    }
  }

  // Fallback: simulate wallet signature so the flow still works in demos
  await new Promise((resolve) => setTimeout(resolve, 1000))
  return `stellar-mock-signature-${Math.random().toString(36).slice(2)}`
}
