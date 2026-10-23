import { APP_LOCALE } from '@/lib/locale'

/**
 * Converts an XLM input amount string to a formatted fiat (NGN) equivalent string.
 * Example: '50' with rate 249 returns '≈ ₦12,450'.
 */
export function calculateFiatEquivalent(input: string, rate: number): string {
  const amount = parseFloat(input)
  if (isNaN(amount) || amount <= 0) return '≈ ₦0'
  const total = amount * rate
  const formatted = total.toLocaleString(APP_LOCALE, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })
  return `≈ ₦${formatted}`
}
