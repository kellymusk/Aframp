import { NextRequest, NextResponse } from 'next/server'
import { trackConversion } from '@/lib/referral/analytics'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await context.params

  try {
    const body = await request.json()
    const { status, additionalData } = body
    const referralTotalFees: number | undefined = body.referralTotalFees

    console.warn(`Backend: Updating order ${orderId} status to ${status}`, additionalData)

    // Record referral conversion when an order using a referral code completes
    if (status === 'completed' && additionalData?.referralCode) {
      trackConversion(
        additionalData.referralCode,
        additionalData.walletAddress ?? 'unknown',
        orderId,
        referralTotalFees,
      )
      console.warn(
        `Referral conversion recorded for code ${additionalData.referralCode} on order ${orderId}`,
      )
    }

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
