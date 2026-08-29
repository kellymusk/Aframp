export type KycStatus = 'pending' | 'approved' | 'rejected' | 'expired'
export type KycSubmissionStep = 'id_upload' | 'selfie_upload' | 'review' | 'submitted'

export interface KycDocument {
  type: 'id_front' | 'id_back' | 'selfie'
  base64: string
  mimeType: string
  uploadedAt: number
}

export interface KycSubmission {
  id: string
  userId: string
  status: KycStatus
  step: KycSubmissionStep
  documents: KycDocument[]
  createdAt: number
  updatedAt: number
  expiresAt: number
  verificationNotes?: string
}

/** Which identity document the user is submitting — drives which field the KYC form shows. */
export type KycDocumentType = 'bvn' | 'nin' | 'passport'

export interface KycInitiateRequest {
  idFront: string // base64
  idBack: string // base64
  selfie: string // base64
  documentType: KycDocumentType
  documentNumber: string
}

export interface KycInitiateResponse {
  submissionId: string
  status: KycStatus
  expiresAt: number
}

export interface KycStatusResponse {
  submissionId: string
  status: KycStatus
  step: KycSubmissionStep
  verificationNotes?: string
  expiresAt: number
}

export interface KycFormState {
  idFront: string | null
  idBack: string | null
  selfie: string | null
  isSubmitting: boolean
  error: string | null
  submissionId: string | null
}
