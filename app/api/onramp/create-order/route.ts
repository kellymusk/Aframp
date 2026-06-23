import { NextResponse } from 'next/server'
import type { OnrampOrder } from '@/types/onramp'

export async function POST(request: Request) {
  try {
    const orderData = await request.json()

    // In a real application, you would:
    // 1. Validate the order data
    // 2. Save to a database
    // 3. Generate a real ID if not provided
    // 4. Trigger any necessary backend processes (e.g. listening for bank transfer)

    console.log('Backend: Creating onramp order', orderData)

    // Simulate database delay
    await new Promise((resolve) => setTimeout(resolve, 800))

    const order: OnrampOrder = {
      ...orderData,
      status: 'created',
      createdAt: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
    }

    return NextResponse.json({
      success: true,
      order,
      message: 'Order created successfully',
    })
  } catch (error) {
    console.error('Error creating onramp order:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 }
    )
  }
}
