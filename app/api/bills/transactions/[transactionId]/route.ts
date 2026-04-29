import { NextResponse } from 'next/server'

const sampleTimeline = [
  { id: 'initiated', label: 'Payment initiated', status: 'completed', timestamp: '09:02' },
  { id: 'processing', label: 'Biller processing', status: 'completed', timestamp: '09:03' },
  { id: 'settled', label: 'Payment settled', status: 'completed', timestamp: '09:05' },
]

export async function GET(
  _request: Request,
  context: { params: Promise<{ transactionId: string }> }
) {
  const { transactionId } = await context.params

  return NextResponse.json({
    id: transactionId,
    amount: 79200,
    currency: 'NGN',
    fee: 450,
    biller: 'Ikeja Electric',
    billerCategory: 'Electricity',
    accountLabel: 'Meter 3434 233 112',
    status: 'completed',
    reference: `AFR-${transactionId.slice(0, 6).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    paymentMethod: 'Wallet Balance',
    timeline: sampleTimeline,
    customerSupportEmail: 'support@aframp.com',
  })
}
