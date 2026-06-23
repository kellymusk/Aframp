'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  BillsEmptyIllustration,
  FilterEmptyIllustration,
  ScheduledEmptyIllustration,
  SearchEmptyIllustration,
  TransactionsEmptyIllustration,
} from '@/components/illustrations/empty-illustrations'

export type EmptyStateVariant = 'transactions' | 'bills' | 'search' | 'scheduled' | 'filter'

const variantIllustrations: Record<EmptyStateVariant, React.ReactNode> = {
  transactions: <TransactionsEmptyIllustration />,
  bills: <BillsEmptyIllustration />,
  search: <SearchEmptyIllustration />,
  scheduled: <ScheduledEmptyIllustration />,
  filter: <FilterEmptyIllustration />,
}

export interface EmptyStateAction {
  label: string
  href?: string
  onClick?: () => void
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
}

export interface EmptyStateProps {
  variant?: EmptyStateVariant
  title: string
  description?: string
  illustration?: React.ReactNode
  action?: EmptyStateAction
  secondaryAction?: EmptyStateAction
  className?: string
  compact?: boolean
  bordered?: boolean
}

function ActionButton({ action }: { action: EmptyStateAction }) {
  const variant = action.variant ?? (action.href ? 'default' : 'outline')

  if (action.href) {
    return (
      <Button variant={variant} size="sm" asChild>
        <Link href={action.href}>{action.label}</Link>
      </Button>
    )
  }

  return (
    <Button variant={variant} size="sm" type="button" onClick={action.onClick}>
      {action.label}
    </Button>
  )
}

export function EmptyState({
  variant = 'transactions',
  title,
  description,
  illustration,
  action,
  secondaryAction,
  className,
  compact = false,
  bordered = true,
}: EmptyStateProps) {
  const art = illustration ?? variantIllustrations[variant]

  const content = (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-12 px-6',
        className
      )}
    >
      <div className={cn('mb-4', compact && 'mb-3')}>{art}</div>
      <h3 className={cn('font-semibold text-foreground', compact ? 'text-base' : 'text-lg')}>
        {title}
      </h3>
      {description ? (
        <p
          className={cn(
            'text-muted-foreground mt-2 max-w-sm',
            compact ? 'text-xs' : 'text-sm'
          )}
        >
          {description}
        </p>
      ) : null}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action ? <ActionButton action={action} /> : null}
          {secondaryAction ? <ActionButton action={secondaryAction} /> : null}
        </div>
      )}
    </motion.div>
  )

  if (!bordered) {
    return content
  }

  return (
    <Card className="border-border bg-card">
      <CardContent className={compact ? 'p-4' : 'p-0'}>{content}</CardContent>
    </Card>
  )
}
