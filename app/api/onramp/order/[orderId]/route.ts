import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await context.params

  try {
    // In a real application, you would fetch from a database
    console.log(`Backend: Fetching onramp order ${orderId}`)

    // For now, we'll return a simulated order or return 404 if not found
    // Since we're using localStorage for persistence across pages, we might still 
    // want to fallback to that or simulate a backend store.
    
    // Simulate database delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    // This is just a mock response. In reality, the POST /create-order 
    // would have saved this to a DB.
    return NextResponse.json({
      success: true,
      orderId,
      // We don't have the full order data here without a DB, 
      // so we might need to rely on the client for now or 
      // implement a simple in-memory store for the demo.
    })
  } catch (error) {
    console.error('Error fetching onramp order:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}
