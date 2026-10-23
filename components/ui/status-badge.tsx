import { Badge } from '@/components/ui/badge'
import type { StatusConfig } from '@/lib/status'

interface StatusBadgeProps<Status extends string> {
  status: Status
  config: StatusConfig<Status>
  className?: string
}

export function StatusBadge<Status extends string>({
  status,
  config,
  className,
}: StatusBadgeProps<Status>) {
  const label = config.label[status] ?? status
  return (
    <Badge
      variant={config.variant[status]}
      role="status"
      aria-live="polite"
      aria-label={`Status: ${label}`}
      className={className}
    >
      {label}
    </Badge>
  )
}
