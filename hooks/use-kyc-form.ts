'use client'

import { useState, useCallback } from 'react'
import type { KycFormState } from '@/types/kyc'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface UseKycFormProps {
  onSubmit?: (data: { idFront: string; idBack: string; selfie: string }) => Promise<void>
}

export function useKycForm({ onSubmit }: UseKycFormProps = {}) {
  const [state, setState] = useState<KycFormState>({
    idFront: null,
    idBack: null,
    selfie: null,
    isSubmitting: false,
    error: null,
    submissionId: null,
  })

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Only JPEG, PNG, and WebP images are allowed'
    }

    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 5MB'
    }

    return null
  }, [])

  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Remove data:image/...;base64, prefix
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
    })
  }, [])

  const handleFileUpload = useCallback(
    async (field: 'idFront' | 'idBack' | 'selfie', file: File) => {
      setState((prev) => ({ ...prev, error: null }))

      const validationError = validateFile(file)
      if (validationError) {
        setState((prev) => ({ ...prev, error: validationError }))
        return
      }

      try {
        const base64 = await fileToBase64(file)
        setState((prev) => ({
          ...prev,
          [field]: base64,
        }))
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: 'Failed to process image. Please try again.',
        }))
      }
    },
    [validateFile, fileToBase64]
  )

  const submit = useCallback(async () => {
    if (!state.idFront || !state.idBack || !state.selfie) {
      setState((prev) => ({
        ...prev,
        error: 'All documents are required',
      }))
      return
    }

    setState((prev) => ({ ...prev, isSubmitting: true, error: null }))

    try {
      const response = await fetch('/api/kyc/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idFront: state.idFront,
          idBack: state.idBack,
          selfie: state.selfie,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit KYC')
      }

      const data = await response.json()

      setState((prev) => ({
        ...prev,
        submissionId: data.submissionId,
        isSubmitting: false,
      }))

      await onSubmit?.({
        idFront: state.idFront,
        idBack: state.idBack,
        selfie: state.selfie,
      })
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        error: error instanceof Error ? error.message : 'Submission failed',
      }))
    }
  }, [state, onSubmit])

  const reset = useCallback(() => {
    setState({
      idFront: null,
      idBack: null,
      selfie: null,
      isSubmitting: false,
      error: null,
      submissionId: null,
    })
  }, [])

  return {
    state,
    handleFileUpload,
    submit,
    reset,
  }
}
