import { cn } from '@/lib/utils'

const VARIANTS = {
  empty: (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true" className="w-full h-full">
      <circle cx="40" cy="40" r="30" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" className="opacity-30" />
      <rect x="24" y="28" width="32" height="24" rx="4" stroke="currentColor" strokeWidth="1.5" className="opacity-60" />
      <path d="M30 36h20M30 42h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="opacity-40" />
      <circle cx="40" cy="56" r="3" fill="currentColor" className="opacity-20" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true" className="w-full h-full">
      <circle cx="35" cy="35" r="18" stroke="currentColor" strokeWidth="1.5" className="opacity-50" />
      <path d="M48 48l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-60" />
      <path d="M29 35h12M35 29v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="opacity-30" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true" className="w-full h-full">
      <rect x="16" y="22" width="48" height="40" rx="6" stroke="currentColor" strokeWidth="1.5" className="opacity-50" />
      <path d="M16 34h48" stroke="currentColor" strokeWidth="1.5" className="opacity-30" />
      <path d="M28 16v12M52 16v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="opacity-50" />
      <circle cx="40" cy="50" r="4" fill="currentColor" className="opacity-20" />
    </svg>
  ),
} as const

export type EmptyStateVariant = keyof typeof VARIANTS

interface EmptyStateIllustrationProps {
  variant?: EmptyStateVariant
  className?: string
}

export function EmptyStateIllustration({
  variant = 'empty',
  className,
}: EmptyStateIllustrationProps) {
  return (
    <div
      className={cn(
        'mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-muted/40 text-muted-foreground',
        className
      )}
    >
      {VARIANTS[variant]}
    </div>
  )
}
