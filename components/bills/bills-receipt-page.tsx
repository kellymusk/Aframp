import { BillsReceiptClient } from '@/components/bills/bills-receipt-client'

interface BillsReceiptPageProps {
  transactionId: string
}

export function BillsReceiptPage({ transactionId }: BillsReceiptPageProps) {
  return <BillsReceiptClient transactionId={transactionId} />
}
