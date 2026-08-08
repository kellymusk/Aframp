import { NextResponse } from 'next/server'
import type { OnrampOrder } from '@/types/onramp'
import { captureError, log } from '@/lib/observability'

export async function POST(request: Request) {
  try {
    const orderData = await request.json()

    // In a real application, you would:
    // 1. Validate the order data
    // 2. Save to a database
    // 3. Generate a real ID if not provided
    // 4. Trigger any necessary backend processes (e.g. listening for bank transfer)

    console.log('Backend: Creating onramp order', { ...orderData, walletAddress: '[REDACTED]' })

    // Simulate database delay
    await new Promise((resolve) => setTimeout(resolve, 800))

    const order: OnrampOrder = {
      ...orderData,
      status: 'created',
      createdAt: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
    }

    log.info('onramp.order.created', {
      orderId: order.id,
      fiatCurrency: order.fiatCurrency,
      cryptoAsset: order.cryptoAsset,
      paymentMethod: order.paymentMethod,
    })

    return NextResponse.json({
      success: true,
      order,
      message: 'Order created successfully',
    })
  } catch (error) {
    captureError(error, {
      tags: { domain: 'onramp', operation: 'create-order' },
    })
    console.error('Error creating onramp order:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 }
    )
  }
}
