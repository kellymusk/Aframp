import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * The official Aframp mark — white rounded-square badge with the green
 * stylised A + arrow. Uses the extracted logo asset from the brand sheet.
 */
export function AframpMark({
  className,
  decorative = false,
}: {
  className?: string
  decorative?: boolean
}) {
  return (
    <Image
      src="/logo-mark.webp"
      alt={decorative ? '' : 'Aframp'}
      width={100}
      height={107}
      className={cn('size-9 shrink-0', className)}
      priority
    />
  )
}

export function AframpWordmark({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <AframpMark decorative />
      <span className="text-xl font-bold tracking-tight">Aframp</span>
    </span>
  )
}
