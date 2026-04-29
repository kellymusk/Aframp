import { BillsReceiptPage } from '@/components/bills/bills-receipt-page'

interface ReceiptPageProps {
  params: Promise<{ transactionId: string }>
}

export default async function BillsReceiptRoute({ params }: ReceiptPageProps) {
  const { transactionId } = await params
  return <BillsReceiptPage transactionId={transactionId} />
}
