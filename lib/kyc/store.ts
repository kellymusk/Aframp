import type { KycSubmission } from '@/types/kyc'

// In-memory store for KYC submissions. Replace with a database in production.
export const kycStore = new Map<string, KycSubmission>()
