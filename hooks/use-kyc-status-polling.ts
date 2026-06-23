'use client'

import { useEffect, useRef, useCallback } from 'react'
import type { KycStatus } from '@/types/kyc'
import { useKyc } from '@/contexts/kyc-context'

interface UseKycStatusPollingProps {
  submissionId: string | null
  onStatusChange?: (status: KycStatus) => void
  onComplete?: (status: KycStatus) => void
  pollInterval?: number
}

export function useKycStatusPolling({
  submissionId,
  onStatusChange,
  onComplete,
  pollInterval = 5000,
}: UseKycStatusPollingProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const { updateKycStatus } = useKyc()
  const lastStatusRef = useRef<KycStatus | null>(null)

  const checkStatus = useCallback(async () => {
    if (!submissionId) return

    try {
      const response = await fetch(`/api/kyc/status/${submissionId}`)

      if (!response.ok) {
        console.error('Failed to fetch KYC status:', response.statusText)
        return
      }

      const data = await response.json()
      const newStatus: KycStatus = data.status

      // Only trigger callbacks if status changed
      if (newStatus !== lastStatusRef.current) {
        lastStatusRef.current = newStatus
        updateKycStatus(newStatus)
        onStatusChange?.(newStatus)

        // Stop polling if terminal state reached
        if (newStatus === 'approved' || newStatus === 'rejected' || newStatus === 'expired') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          onComplete?.(newStatus)
        }
      }
    } catch (error) {
      console.error('Error polling KYC status:', error)
    }
  }, [submissionId, updateKycStatus, onStatusChange, onComplete])

  useEffect(() => {
    if (!submissionId) return

    // Check immediately
    checkStatus()

    // Then poll at interval
    intervalRef.current = setInterval(checkStatus, pollInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [submissionId, pollInterval, checkStatus])

  return { checkStatus }
}
