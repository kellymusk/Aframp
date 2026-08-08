'use client'

import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react'
import type { KycStatus } from '@/types/kyc'
import { useNotifications } from '@/contexts/notification-context'

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

  // useNotifications may not be available at the very top of the tree, so
  // we guard against it being undefined during SSR or if the provider order
  // is wrong. The notification-context has its own guard error.
  let notifPush: ReturnType<typeof useNotifications>['push'] | null = null
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { push } = useNotifications()
    notifPush = push
  } catch {
    // NotificationProvider not yet mounted — skip notifications
  }

  // Restore submissionId from localStorage, then re-verify the actual status
  // with the server — the locally cached status is a UI convenience only and
  // must never be trusted, since a user can freely edit it in DevTools.
  useEffect(() => {
    const storedSubmissionId = localStorage.getItem(SUBMISSION_STORAGE_KEY)
    setSubmissionIdState(storedSubmissionId)

    if (!storedSubmissionId) {
      localStorage.removeItem(KYC_STORAGE_KEY)
      setKycStatus(null)
      setIsLoading(false)
      return
    }

    fetch(`/api/kyc/status/${storedSubmissionId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const verifiedStatus: KycStatus | null = data?.status ?? null
        setKycStatus(verifiedStatus)
        if (verifiedStatus) {
          localStorage.setItem(KYC_STORAGE_KEY, verifiedStatus)
        } else {
          localStorage.removeItem(KYC_STORAGE_KEY)
        }
      })
      .catch(() => {
        setKycStatus(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const setSubmissionId = (id: string) => {
    setSubmissionIdState(id)
    localStorage.setItem(SUBMISSION_STORAGE_KEY, id)
  }

  const updateKycStatus = useCallback(
    (status: KycStatus) => {
      setKycStatus((prev) => {
        if (prev !== status && notifPush) {
          const messages: Record<KycStatus, { title: string; message: string } | undefined> = {
            pending:   { title: 'KYC under review', message: 'Your KYC submission is being reviewed.' },
            approved:  { title: 'KYC approved ✓',   message: 'Your identity is verified. You can now trade.' },
            rejected:  { title: 'KYC rejected',     message: 'Your KYC was not approved. Please resubmit.' },
            expired:   { title: 'KYC expired',      message: 'Your KYC verification has expired. Please resubmit.' },
          }
          const copy = messages[status]
          if (copy) {
            void notifPush({
              ...copy,
              category: 'kyc',
              priority: status === 'approved' || status === 'rejected' ? 'high' : 'normal',
              metadata: { status },
            })
          }
        }
        return status
      })
      localStorage.setItem(KYC_STORAGE_KEY, status)
    },
    [notifPush]
  )

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
