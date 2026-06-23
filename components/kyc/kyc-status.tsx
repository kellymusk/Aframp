'use client'

import { CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { KycStatus } from '@/types/kyc'

interface KycStatusProps {
  status: KycStatus
  verificationNotes?: string
  isPolling?: boolean
}

export function KycStatusDisplay({ status, verificationNotes, isPolling }: KycStatusProps) {
  const statusConfig = {
    pending: {
      icon: Clock,
      label: 'Verification in Progress',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      description: 'Your documents are being reviewed. This usually takes 5-15 minutes.',
    },
    approved: {
      icon: CheckCircle2,
      label: 'Verified',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      description: 'Your KYC verification is complete. You can now access all features.',
    },
    rejected: {
      icon: XCircle,
      label: 'Verification Failed',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      description: 'Your verification was not approved. Please resubmit with clearer images.',
    },
    expired: {
      icon: AlertCircle,
      label: 'Verification Expired',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      description: 'Your verification has expired. Please submit again.',
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'rounded-lg border-2 p-4',
        config.borderColor,
        config.bgColor
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn('h-6 w-6 flex-shrink-0', config.color)} />
        <div className="flex-1">
          <h3 className={cn('font-semibold', config.color)}>
            {config.label}
            {isPolling && status === 'pending' && (
              <span className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-blue-600" />
            )}
          </h3>
          <p className="mt-1 text-sm text-gray-600">{config.description}</p>
          {verificationNotes && (
            <p className="mt-2 text-sm font-medium text-gray-700">
              {verificationNotes}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

interface KycStepIndicatorProps {
  currentStep: 'id' | 'selfie' | 'review' | 'submitted'
}

export function KycStepIndicator({ currentStep }: KycStepIndicatorProps) {
  const steps = [
    { id: 'id', label: 'ID Upload' },
    { id: 'selfie', label: 'Selfie' },
    { id: 'review', label: 'Review' },
    { id: 'submitted', label: 'Submitted' },
  ]

  const stepIndex = steps.findIndex((s) => s.id === currentStep)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex flex-col items-center">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full border-2 font-semibold',
                index <= stepIndex
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 bg-white text-gray-400'
              )}
            >
              {index < stepIndex ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : (
                index + 1
              )}
            </div>
            <span
              className={cn(
                'mt-2 text-xs font-medium',
                index <= stepIndex ? 'text-gray-900' : 'text-gray-500'
              )}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* Connecting lines */}
      <div className="flex gap-2">
        {steps.slice(0, -1).map((_, index) => (
          <div
            key={index}
            className={cn(
              'flex-1 h-1 rounded-full',
              index < stepIndex ? 'bg-blue-600' : 'bg-gray-300'
            )}
          />
        ))}
      </div>
    </div>
  )
}
