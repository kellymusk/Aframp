import { CircleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

/**
 * The generic "couldn't load this" state — including a plain network
 * failure, which is common enough (flaky wifi, backend redeploying) that it
 * shouldn't read like a crash. Calm and muted, not alarm-red, with a real
 * retry button rather than raw error text.
 */
export function ErrorState({ message = 'Failed to load data.', onRetry }: ErrorStateProps) {
  return (
    <div className="border-border bg-muted/30 mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border px-6 py-10 text-center">
      <div className="bg-muted flex size-10 items-center justify-center rounded-full">
        <CircleAlert className="text-muted-foreground size-5" aria-hidden />
      </div>
      <p className="text-foreground text-sm font-medium">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
