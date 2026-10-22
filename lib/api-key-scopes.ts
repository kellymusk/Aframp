import type { ApiKey, ApiKeyScope } from '@/lib/api'

export const API_KEY_SCOPES: { scope: ApiKeyScope; label: string; description: string }[] = [
  { scope: 'read', label: 'Read', description: 'View balances, payments, refunds and cash-outs.' },
  { scope: 'charges', label: 'Charges', description: 'Create payment requests and refunds.' },
  { scope: 'payouts', label: 'Payouts', description: 'Cash out to a bank account.' },
]

const DAY_MS = 24 * 60 * 60 * 1000

export const API_KEY_EXPIRY_OPTIONS: { value: string; label: string; days: number | null }[] = [
  { value: 'never', label: 'Never', days: null },
  { value: '30', label: '30 days', days: 30 },
  { value: '90', label: '90 days', days: 90 },
  { value: '365', label: '1 year', days: 365 },
]

/** The ISO expiry timestamp for an expiry option, or null if the key never expires. */
export function expiryFromOption(value: string, now = new Date()): string | null {
  const days = API_KEY_EXPIRY_OPTIONS.find((option) => option.value === value)?.days ?? null
  return days === null ? null : new Date(now.getTime() + days * DAY_MS).toISOString()
}

export function isApiKeyExpired(key: Pick<ApiKey, 'expires_at'>, now = new Date()): boolean {
  if (!key.expires_at) return false
  const timestamp = Date.parse(key.expires_at)
  return Number.isFinite(timestamp) && timestamp <= now.getTime()
}

/**
 * Human-readable scope list. Keys created before scopes existed come back
 * without any, and the backend treats those as full access.
 */
export function describeScopes(scopes: ApiKeyScope[] | undefined): string[] {
  if (!scopes || scopes.length === 0) return ['Full access']
  return API_KEY_SCOPES.filter(({ scope }) => scopes.includes(scope)).map(({ label }) => label)
}
