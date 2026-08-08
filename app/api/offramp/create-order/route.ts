import { NextResponse } from 'next/server'
import type { OfframpOrder } from '@/types/offramp'
import { captureError, log } from '@/lib/observability'

export async function POST(request: Request) {
  try {
    const orderData = await request.json()

    console.log('Backend: Creating offramp order', { ...orderData, walletAddress: '[REDACTED]' })

    // Simulate database delay
    await new Promise((resolve) => setTimeout(resolve, 800))

    const order: OfframpOrder = {
      ...orderData,
      id: `offramp-${Date.now()}`,
      createdAt: Date.now(),
      lockExpiresAt: Date.now() + 15 * 60 * 1000,
      status: 'pending_bank_details',
    }

    log.info('offramp.order.created', {
      orderId: order.id,
      cryptoAsset: order.cryptoAsset,
      fiatCurrency: order.fiatCurrency,
    })

    return NextResponse.json({
      success: true,
      order,
      message: 'Offramp order created successfully',
    })
  } catch (error) {
    captureError(error, {
      tags: { domain: 'offramp', operation: 'create-order' },
    })
    console.error('Error creating offramp order:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create offramp order' },
      { status: 500 }
    )
  }
}
