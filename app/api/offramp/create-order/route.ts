import { NextResponse } from 'next/server'
import type { OfframpOrder } from '@/types/offramp'

export async function POST(request: Request) {
  try {
    const orderData = await request.json()

    console.log('Backend: Creating offramp order', orderData)

    // Simulate database delay
    await new Promise((resolve) => setTimeout(resolve, 800))

    const order: OfframpOrder = {
      ...orderData,
      id: `offramp-${Date.now()}`,
      createdAt: Date.now(),
      lockExpiresAt: Date.now() + 15 * 60 * 1000,
      status: 'pending_bank_details',
    }

    return NextResponse.json({
      success: true,
      order,
      message: 'Offramp order created successfully',
    })
  } catch (error) {
    console.error('Error creating offramp order:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create offramp order' },
      { status: 500 }
    )
  }
}
