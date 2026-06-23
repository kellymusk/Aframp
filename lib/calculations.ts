export {
  formatAmountInput,
  formatCurrency,
  formatNumber,
  formatRate,
  parseAmountInput,
  truncateAddress,
} from '@/lib/onramp/formatters'

export function isValidStellarAddress(address: string) {
  if (!address) return false
  return /^G[A-Z2-7]{55}$/.test(address)
}
