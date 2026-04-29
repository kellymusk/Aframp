import type { FiatCurrency } from '@/types/onramp'

const currencyLocaleMap: Record<FiatCurrency, string> = {
  NGN: 'en-NG',
  KES: 'en-KE',
  GHS: 'en-GH',
  ZAR: 'en-ZA',
  UGX: 'en-UG',
}

export function formatCurrency(amount: number, currency: FiatCurrency, maximumFractionDigits = 2) {
  return new Intl.NumberFormat(currencyLocaleMap[currency], {
    style: 'currency',
    currency,
    maximumFractionDigits,
  }).format(amount)
}

export function formatNumber(amount: number, maximumFractionDigits = 6) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatAmountInput(raw: string) {
  if (!raw) return ''
  const normalized = raw.replace(/,/g, '')
  const [whole, decimal] = normalized.split('.')
  const wholeFormatted = whole ? Number(whole).toLocaleString('en-US') : ''
  if (decimal === undefined) {
    return wholeFormatted
  }
  return `${wholeFormatted}.${decimal}`
}

export function parseAmountInput(raw: string) {
  if (!raw) return 0
  const normalized = raw.replace(/,/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

export function truncateAddress(address: string, size = 5) {
  if (!address) return ''
  if (address.length <= size * 2 + 3) return address
  return `${address.slice(0, size)}...${address.slice(-size)}`
}

export function formatRate(rate: number, maxFractionDigits = 8) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: maxFractionDigits,
  }).format(rate)
}
