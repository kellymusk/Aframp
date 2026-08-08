import { FlowErrorBoundary } from '@/components/error/FlowErrorBoundary'
import { OnrampProcessingClient } from '@/components/onramp/onramp-processing-client'

export default async function OnrampProcessingPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const { orderId } = await params
  return (
    <FlowErrorBoundary step="onramp-processing" restartHref="/onramp">
      <OnrampProcessingClient orderId={orderId} />
    </FlowErrorBoundary>
  )
}
