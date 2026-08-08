import { ReceivePageClient } from '@/components/receive/receive-page-client'

export default function ReceivePage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  return <ReceivePageClient initialParams={searchParams} />
}
