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

/**
 * Matches a value that a spreadsheet could evaluate as a formula, including
 * when leading whitespace/control chars (space, tab, CR, LF, ...) precede the
 * trigger character, since spreadsheets may trim those before evaluating.
 */
const FORMULA_PATTERN = /^[\u0000-\u0020]*[=+\-@]/

/**
 * Shared CSV cell escaper. Neutralises formula injection (prefixes `'`) and
 * quotes cells containing `"`, `,`, CR or LF. Pass `protectFormula: false`
 * for numeric columns so negative amounts stay numeric.
 */
export function escapeCsvCell(
  value: string | number | bigint | null | undefined,
  protectFormula = typeof value === 'string'
): string {
  const text = value == null ? '' : String(value)
  const safe = protectFormula && FORMULA_PATTERN.test(text) ? `'${text}` : text
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

const csvField = escapeCsvCell

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
