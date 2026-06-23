'use client'

import { createContext, useContext, ReactNode, useState, useEffect } from 'react'
import type { KycStatus } from '@/types/kyc'

interface KycContextType {
  kycStatus: KycStatus | null
  submissionId: string | null
  isVerified: boolean
  isLoading: boolean
  setSubmissionId: (id: string) => void
  updateKycStatus: (status: KycStatus) => void
  clearKyc: () => void
}

const KycContext = createContext<KycContextType | undefined>(undefined)

const KYC_STORAGE_KEY = 'kyc:status'
const SUBMISSION_STORAGE_KEY = 'kyc:submissionId'

interface KycProviderProps {
  children: ReactNode
}

export function KycProvider({ children }: KycProviderProps) {
  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null)
  const [submissionId, setSubmissionIdState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Restore from localStorage on mount
  useEffect(() => {
    const storedStatus = localStorage.getItem(KYC_STORAGE_KEY) as KycStatus | null
    const storedSubmissionId = localStorage.getItem(SUBMISSION_STORAGE_KEY)

    setKycStatus(storedStatus)
    setSubmissionIdState(storedSubmissionId)
    setIsLoading(false)
  }, [])

  const setSubmissionId = (id: string) => {
    setSubmissionIdState(id)
    localStorage.setItem(SUBMISSION_STORAGE_KEY, id)
  }

  const updateKycStatus = (status: KycStatus) => {
    setKycStatus(status)
    localStorage.setItem(KYC_STORAGE_KEY, status)
  }

  const clearKyc = () => {
    setKycStatus(null)
    setSubmissionIdState(null)
    localStorage.removeItem(KYC_STORAGE_KEY)
    localStorage.removeItem(SUBMISSION_STORAGE_KEY)
  }

  const value: KycContextType = {
    kycStatus,
    submissionId,
    isVerified: kycStatus === 'approved',
    isLoading,
    setSubmissionId,
    updateKycStatus,
    clearKyc,
  }

  return <KycContext.Provider value={value}>{children}</KycContext.Provider>
}

export function useKyc() {
  const context = useContext(KycContext)
  if (context === undefined) {
    throw new Error('useKyc must be used within KycProvider')
  }
  return context
}
