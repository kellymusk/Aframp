import { OnrampProcessingClient } from '@/components/onramp/onramp-processing-client'

export default async function OnrampProcessingPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const { orderId } = await params
  return <OnrampProcessingClient orderId={orderId} />
}
