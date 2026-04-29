/**
 * PEP Screening core types and constants.
 */

export type PepInfluenceLevel = 'head_of_state' | 'senior_official' | 'local_official' | 'rca'
export type PepRelationshipType = 'direct' | 'family' | 'close_associate'
export type PepMatchStatus = 'confirmed' | 'potential' | 'false_positive' | 'cleared'
export type EddStatus = 'pending' | 'in_review' | 'approved' | 'rejected'

export interface PepCandidate {
  id: string
  fullName: string
  aliases: string[]
  country: string
  position: string
  influenceLevel: PepInfluenceLevel
  relationshipType: PepRelationshipType
  /** Corruption Perception Index score 0-100 (higher = less corrupt) */
  cpiScore: number
  dateOfBirth?: string
  nationality?: string
  source: string
}

export interface PepScreeningResult {
  id: string
  walletAddress: string
  fullName: string
  screenedAt: number
  matches: PepMatch[]
  riskScore: number          // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  requiresEdd: boolean
  status: PepMatchStatus
  reviewedBy?: string
  reviewedAt?: number
  reviewNote?: string
}

export interface PepMatch {
  candidate: PepCandidate
  similarityScore: number    // 0-1 fuzzy match score
  riskScore: number          // 0-100 composite
  status: PepMatchStatus
}

export interface EddRecord {
  id: string
  walletAddress: string
  screeningResultId: string
  status: EddStatus
  sourceOfWealth?: string
  sourceOfFunds?: string
  supportingDocs: string[]   // doc references / URLs
  assignedTo?: string
  createdAt: number
  updatedAt: number
  signOffBy?: string
  signOffAt?: number
}

export interface AuditLogEntry {
  id: string
  timestamp: number
  action:
    | 'screening_initiated'
    | 'match_found'
    | 'false_positive_resolved'
    | 'edd_created'
    | 'edd_approved'
    | 'edd_rejected'
    | 'manual_review'
    | 'rescreening_run'
  walletAddress: string
  performedBy: 'system' | string
  detail: string
  resultId?: string
}

// Risk score weights
export const INFLUENCE_WEIGHT: Record<PepInfluenceLevel, number> = {
  head_of_state: 40,
  senior_official: 30,
  local_official: 15,
  rca: 10,
}

export const RELATIONSHIP_WEIGHT: Record<PepRelationshipType, number> = {
  direct: 40,
  family: 25,
  close_associate: 15,
}

/** CPI score → jurisdiction risk contribution (inverse: lower CPI = higher risk) */
export function jurisdictionRisk(cpiScore: number): number {
  return Math.round((1 - cpiScore / 100) * 20)
}

/** Composite risk score 0-100 */
export function compositeRiskScore(
  similarityScore: number,
  influenceLevel: PepInfluenceLevel,
  relationshipType: PepRelationshipType,
  cpiScore: number
): number {
  const fuzzyContrib = similarityScore * 20 // up to 20 pts
  const influence = INFLUENCE_WEIGHT[influenceLevel]
  const relationship = RELATIONSHIP_WEIGHT[relationshipType]
  const jurisdiction = jurisdictionRisk(cpiScore)
  return Math.min(100, Math.round(fuzzyContrib + influence + relationship + jurisdiction))
}

export function riskLevel(score: number): PepScreeningResult['riskLevel'] {
  if (score >= 80) return 'critical'
  if (score >= 60) return 'high'
  if (score >= 35) return 'medium'
  return 'low'
}
