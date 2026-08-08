import { NextRequest, NextResponse } from 'next/server'
import { generateReceiptHTML, generateReceiptText } from '@/lib/bills/receipt-generator'
import { BillTransaction } from '@/lib/bills/types'

// Mock function - replace with actual database query
async function getTransaction(transactionId: string): Promise<BillTransaction | null> {
  // This would typically fetch from your database
  // For now, returning mock data
  return {
    id: transactionId,
    reference: transactionId,
    billerId: 'ikeja-electric',
    biller: 'Ikeja Electric (NEPA)',
    billerCategory: 'Electricity',
    accountNumber: '12345678901',
    accountLabel: 'John Doe',
    amount: 5000,
    fee: 150,
    currency: 'NGN',
    paymentMethod: 'Card',
    status: 'completed',
    gatewayReference: 'PAY-123456789',
    gateway: 'paystack',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    customerEmail: 'customer@example.com',
    customerPhone: '+2348012345678',
    customerSupportEmail: 'support@aframp.com',
    timeline: [
      {
        id: '1',
        label: 'Payment Initiated',
        status: 'completed',
        timestamp: new Date(Date.now() - 300000).toLocaleString(),
      },
      {
        id: '2',
        label: 'Payment Verified',
        status: 'completed',
        timestamp: new Date(Date.now() - 240000).toLocaleString(),
      },
      {
        id: '3',
        label: 'Bill Payment Processed',
        status: 'completed',
        timestamp: new Date(Date.now() - 180000).toLocaleString(),
      },
      {
        id: '4',
        label: 'Confirmation Sent',
        status: 'completed',
        timestamp: new Date().toLocaleString(),
      },
    ],
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const { transactionId } = await params
    const format = request.nextUrl.searchParams.get('format') || 'html'

    const transaction = await getTransaction(transactionId)

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    const companyInfo = {
      name: 'Aframp',
      address: '123 Blockchain Street, Lagos, Nigeria',
      phone: '+234 800 000 0000',
      email: 'support@aframp.com',
      website: 'https://aframp.com',
    }

    const receiptData = { transaction, companyInfo }

    if (format === 'text') {
      const textReceipt = generateReceiptText(receiptData)
      return new NextResponse(textReceipt, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="receipt-${transactionId}.txt"`,
        },
      })
    }

    if (format === 'json') {
      return NextResponse.json(transaction)
    }

    // Default: HTML
    const htmlReceipt = generateReceiptHTML(receiptData)
    return new NextResponse(htmlReceipt, {
      headers: {
        'Content-Type': 'text/html',
      },
    })
  } catch (error) {
    console.error('Receipt generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate receipt' },
      { status: 500 }
    )
  }
}
