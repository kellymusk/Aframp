import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await context.params

  try {
    const { status, additionalData } = await request.json()

    console.log(`Backend: Updating order ${orderId} status to ${status}`, additionalData)

    // In a real application, you would update the database here
    
    // Simulate delay
    await new Promise((resolve) => setTimeout(resolve, 300))

    return NextResponse.json({
      success: true,
      orderId,
      status,
    })
  } catch (error) {
    console.error('Error updating order status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update order status' },
      { status: 500 }
    )
  }
}
