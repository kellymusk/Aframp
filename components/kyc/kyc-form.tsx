'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IdUpload } from './id-upload'
import { SelfieUpload } from './selfie-upload'
import { KycStatusDisplay, KycStepIndicator } from './kyc-status'
import { useKycForm } from '@/hooks/use-kyc-form'
import { useKycStatusPolling } from '@/hooks/use-kyc-status-polling'
import { useKyc } from '@/contexts/kyc-context'
import type { KycSubmissionStep } from '@/types/kyc'
import { cn } from '@/lib/utils'

interface KycFormProps {
  onComplete?: () => void
}

export function KycForm({ onComplete }: KycFormProps) {
  const [step, setStep] = useState<KycSubmissionStep>('id_upload')
  const { state, handleFileUpload, submit, reset } = useKycForm({
    onSubmit: async () => {
      setStep('submitted')
    },
  })
  const { updateKycStatus, setSubmissionId } = useKyc()
  const { checkStatus } = useKycStatusPolling({
    submissionId: state.submissionId,
    onStatusChange: (status) => {
      if (status === 'approved' || status === 'rejected' || status === 'expired') {
        setStep('submitted')
      }
    },
    onComplete: (status) => {
      updateKycStatus(status)
      onComplete?.()
    },
  })

  useEffect(() => {
    if (state.submissionId) {
      setSubmissionId(state.submissionId)
    }
  }, [state.submissionId, setSubmissionId])

  const isIdComplete = state.idFront && state.idBack
  const isSelfieComplete = state.selfie
  const isReviewReady = isIdComplete && isSelfieComplete

  const handleNext = () => {
    if (step === 'id_upload' && isIdComplete) {
      setStep('selfie_upload')
    } else if (step === 'selfie_upload' && isSelfieComplete) {
      setStep('review')
    }
  }

  const handleBack = () => {
    if (step === 'selfie_upload') {
      setStep('id_upload')
    } else if (step === 'review') {
      setStep('selfie_upload')
    }
  }

  const handleReset = () => {
    reset()
    setStep('id_upload')
  }

  // Show status after submission
  if (state.submissionId) {
    return (
      <div className="space-y-6">
        <KycStepIndicator currentStep="submitted" />

        <div className="space-y-4">
          <KycStatusDisplay
            status={state.submissionId ? 'pending' : 'pending'}
            isPolling={true}
          />

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-900">
              Your KYC submission is being processed. We'll notify you once verification is complete.
            </p>
          </div>

          <Button
            onClick={handleReset}
            variant="outline"
            className="w-full"
          >
            Start Over
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <KycStepIndicator currentStep={step} />

      {state.error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* ID Upload Step */}
        {(step === 'id_upload' || isIdComplete) && (
          <div className={cn(step !== 'id_upload' && 'opacity-60')}>
            <div className="space-y-4">
              <IdUpload
                side="front"
                image={state.idFront}
                onUpload={(file) => handleFileUpload('idFront', file)}
                disabled={state.isSubmitting || step !== 'id_upload'}
              />
              <IdUpload
                side="back"
                image={state.idBack}
                onUpload={(file) => handleFileUpload('idBack', file)}
                disabled={state.isSubmitting || step !== 'id_upload'}
              />
            </div>
          </div>
        )}

        {/* Selfie Upload Step */}
        {(step === 'selfie_upload' || isSelfieComplete) && (
          <div className={cn(step !== 'selfie_upload' && 'opacity-60')}>
            <SelfieUpload
              image={state.selfie}
              onUpload={(file) => handleFileUpload('selfie', file)}
              disabled={state.isSubmitting || step !== 'selfie_upload'}
            />
          </div>
        )}

        {/* Review Step */}
        {step === 'review' && (
          <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="font-semibold text-gray-900">Review Your Documents</h3>
            <p className="text-sm text-gray-600">
              Please review your documents before submitting. Make sure all images are clear and readable.
            </p>

            <div className="grid grid-cols-3 gap-3">
              {state.idFront && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-700">ID Front</p>
                  <img
                    src={state.idFront}
                    alt="ID Front"
                    className="h-24 w-full rounded object-cover"
                  />
                </div>
              )}
              {state.idBack && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-700">ID Back</p>
                  <img
                    src={state.idBack}
                    alt="ID Back"
                    className="h-24 w-full rounded object-cover"
                  />
                </div>
              )}
              {state.selfie && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-700">Selfie</p>
                  <img
                    src={state.selfie}
                    alt="Selfie"
                    className="h-24 w-full rounded object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3">
        {step !== 'id_upload' && (
          <Button
            onClick={handleBack}
            variant="outline"
            disabled={state.isSubmitting}
            className="flex-1"
          >
            Back
          </Button>
        )}

        {step === 'review' ? (
          <Button
            onClick={submit}
            disabled={state.isSubmitting || !isReviewReady}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {state.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit KYC'
            )}
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={
              (step === 'id_upload' && !isIdComplete) ||
              (step === 'selfie_upload' && !isSelfieComplete) ||
              state.isSubmitting
            }
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            Next
          </Button>
        )}
      </div>
    </div>
  )
}
