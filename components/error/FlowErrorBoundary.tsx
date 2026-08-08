'use client'

import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import * as Sentry from '@sentry/nextjs'
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ─── Types ───────────────────────────────────────────────────────────────────

export type FlowStep =
  // Onramp steps
  | 'onramp-calculator'
  | 'onramp-payment'
  | 'onramp-processing'
  | 'onramp-success'
  // Offramp steps
  | 'offramp-calculator'
  | 'offramp-bank-details'
  | 'offramp-review'
  | 'offramp-processing'
  | 'offramp-success'

interface FlowErrorBoundaryProps {
  /** Which flow step this boundary wraps — shown in the error UI */
  step: FlowStep
  /** The protected children */
  children: ReactNode
  /**
   * Optional: the URL to navigate to when the user wants to start over.
   * Defaults to the root of the flow (e.g. /onramp or /offramp).
   */
  restartHref?: string
  /**
   * Optional: called when the user clicks "Try again" — lets the parent
   * preserve or restore form data before the tree re-mounts.
   */
  onRetry?: () => void
}

interface FlowErrorBoundaryState {
  hasError: boolean
  error: Error | null
  eventId: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STEP_LABELS: Record<FlowStep, string> = {
  'onramp-calculator': 'Onramp — Amount & Currency',
  'onramp-payment': 'Onramp — Payment',
  'onramp-processing': 'Onramp — Processing',
  'onramp-success': 'Onramp — Success',
  'offramp-calculator': 'Offramp — Amount & Currency',
  'offramp-bank-details': 'Offramp — Bank Details',
  'offramp-review': 'Offramp — Review',
  'offramp-processing': 'Offramp — Processing',
  'offramp-success': 'Offramp — Success',
}

/** Best-effort default "restart" href inferred from the step name. */
function defaultRestartHref(step: FlowStep): string {
  return step.startsWith('onramp') ? '/onramp' : '/offramp'
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * A flow-step-aware error boundary that:
 *   1. Shows which step failed so the user knows where they are.
 *   2. Offers a "Try again" button that re-mounts the subtree.
 *   3. Reports the error + step context to Sentry.
 *   4. Calls the optional `onRetry` callback before re-mounting, giving
 *      the parent a chance to restore saved form state.
 */
export class FlowErrorBoundary extends Component<
  FlowErrorBoundaryProps,
  FlowErrorBoundaryState
> {
  constructor(props: FlowErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, eventId: null }
  }

  static getDerivedStateFromError(error: Error): Partial<FlowErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const { step } = this.props

    // Report to Sentry with step context
    const eventId = Sentry.captureException(error, {
      extra: {
        componentStack: info.componentStack,
        flowStep: step,
        stepLabel: STEP_LABELS[step],
      },
      tags: {
        flowStep: step,
      },
    })

    this.setState({ eventId: eventId ?? null })

    // Also log locally in development
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[FlowErrorBoundary] Error in step "${STEP_LABELS[step]}":`, error, info)
    }
  }

  handleRetry = () => {
    const { onRetry } = this.props
    onRetry?.()
    this.setState({ hasError: false, error: null, eventId: null })
  }

  render() {
    const { children, step, restartHref } = this.props
    const { hasError, error, eventId } = this.state

    if (!hasError) {
      return children
    }

    const stepLabel = STEP_LABELS[step]
    const href = restartHref ?? defaultRestartHref(step)

    return <FlowErrorFallback
      stepLabel={stepLabel}
      error={error}
      eventId={eventId}
      restartHref={href}
      onRetry={this.handleRetry}
    />
  }
}

// ─── Fallback UI ─────────────────────────────────────────────────────────────

interface FlowErrorFallbackProps {
  stepLabel: string
  error: Error | null
  eventId: string | null
  restartHref: string
  onRetry: () => void
}

function FlowErrorFallback({
  stepLabel,
  error,
  eventId,
  restartHref,
  onRetry,
}: FlowErrorFallbackProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-destructive/10">
            <AlertTriangle className="w-10 h-10 text-destructive" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">
            An unexpected error occurred during{' '}
            <span className="font-medium text-foreground">{stepLabel}</span>.
          </p>
          {error?.message && (
            <p className="text-xs text-muted-foreground font-mono bg-muted rounded-md px-3 py-2 mt-2 text-left break-all">
              {error.message}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button onClick={onRetry} className="w-full sm:w-auto gap-2">
            <RefreshCw className="w-4 h-4" />
            Try again
          </Button>
          <Button variant="outline" asChild className="w-full sm:w-auto gap-2">
            <a href={restartHref}>
              <ArrowLeft className="w-4 h-4" />
              Start over
            </a>
          </Button>
          <Button variant="ghost" asChild className="w-full sm:w-auto gap-2">
            <a href="/">
              <Home className="w-4 h-4" />
              Home
            </a>
          </Button>
        </div>

        {/* Sentry event reference for support */}
        {eventId && (
          <p className="text-[10px] text-muted-foreground/60">
            Error ID:{' '}
            <span className="font-mono">{eventId}</span>
          </p>
        )}
      </div>
    </div>
  )
}
