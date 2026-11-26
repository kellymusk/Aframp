import type { Payment } from '@/lib/api'
import { formatStroopsPlain } from '@/lib/money'

const CSV_HEADERS = [
  'created_at',
  'amount',
  'asset',
  'status',
  'tx_hash',
  'wallet_address',
  'network',
  'confirmations',
]

function csvField(value: string, protectFormula = true): string {
  const safeValue =
    protectFormula && /^[\u0000-\u0020]*[=+\-@]/.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(safeValue) ? `"${safeValue.replace(/"/g, '""')}"` : safeValue
}

export function exportPaymentsToCSV(payments: Payment[]): string {
  const rows = payments.map((payment) =>
    [
      csvField(payment.created_at),
      csvField(formatStroopsPlain(payment.amount_stroops), false),
      csvField(payment.asset),
      csvField(payment.status),
      csvField(payment.tx_hash),
      csvField(payment.wallet_address),
      csvField(payment.network),
      csvField(String(payment.confirmations), false),
    ].join(',')
  )

  return [CSV_HEADERS.join(','), ...rows].join('\r\n')
}
