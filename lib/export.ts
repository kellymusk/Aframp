import type { Payment } from '@/lib/api'
import { formatStroops } from '@/lib/money'

function csvCell(value: string | number | bigint): string {
  let text = String(value)
  if (/^[\t\r\n ]*[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

const PAYMENT_HEADERS = [
  'Payment ID',
  'Merchant ID',
  'Wallet ID',
  'Wallet Address',
  'Transaction Hash',
  'Amount',
  'Amount (stroops)',
  'Asset',
  'Network',
  'Status',
  'Confirmations',
  'Created At',
  'Updated At',
]

export function exportPaymentsToCSV(payments: Payment[]): string {
  const rows = payments.map((payment) => [
    payment.id,
    payment.merchant_id,
    payment.wallet_id,
    payment.wallet_address,
    payment.tx_hash,
    formatStroops(payment.amount_stroops),
    payment.amount_stroops,
    payment.asset,
    payment.network,
    payment.status,
    payment.confirmations,
    payment.created_at,
    payment.updated_at,
  ])

  return [PAYMENT_HEADERS, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
}