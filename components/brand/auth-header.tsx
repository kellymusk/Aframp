import type { ReactNode } from 'react'
import { AframpMark } from '@/components/brand/aframp-mark'

/** Logo and wordmark, then the page's heading and a one-line prompt. */
export function AuthHeader({ title, subtitle }: { title: string; subtitle: ReactNode }) {
  return (
    <header className="space-y-4">
      <div className="flex items-center gap-2.5">
        <AframpMark className="size-9" />
        <span className="text-xl font-bold tracking-tight">Aframp</span>
      </div>
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm">{subtitle}</p>
      </div>
    </header>
  )
}
