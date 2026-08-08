/**
 * Shared AML/CFT types.
 *
 * Kept free of server-only imports so the admin UI and the browser client can
 * import these shapes without pulling in the stores or provider adapters —
 * same split as lib/orders/types.ts.
 *
 * Terminology note: the code says "SAR" (Suspicious Activity Report) throughout
 * because that is the term used in the requirement.  Every regulator Aframp
 * files with in-market — NFIU (NG), FRC (KE), FIC (GH), FIC (ZA), FIA (UG) —
 * calls the same artefact a Suspicious Transaction Report (STR).  They are the
 * same filing; see JURISDICTIONS in ./config.ts.
 */

// ---------------------------------------------------------------------------
// Risk
// ---------------------------------------------------------------------------

/** Ordered least → most severe.  Comparisons must use RISK_LEVEL_RANK. */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'SEVERE'

export const RISK_LEVEL_RANK: Record<RiskLevel, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  SEVERE: 3,
}

/**
 * What the screening engine decided the transaction should do next.
 *
 *   ALLOW  — proceed; the screening result is still written to the ledger.
 *   REVIEW — hold the transaction and open a case for a human analyst.
 *   BLOCK  — reject outright.  Only sanctions hits and severe provider
 *            verdicts reach this; a blocked transaction always opens a case
 *            too, because a block is itself a reportable event.
 */
export type ScreeningDecision = 'ALLOW' | 'REVIEW' | 'BLOCK'

/**
 * Every distinct reason a transaction can be flagged.  These strings are
 * persisted on cases and surfaced in the admin UI, so treat them as a stable
 * wire contract — rename via migration, not in place.
 */
export type SignalCode =
  // --- sanctions / provider screening -------------------------------------
  | 'SANCTIONS_MATCH'
  | 'PEP_MATCH'
  | 'ADVERSE_MEDIA'
  | 'WALLET_SEVERE_RISK'
  | 'WALLET_HIGH_RISK'
  | 'WALLET_MEDIUM_RISK'
  | 'PROVIDER_UNAVAILABLE'
  // --- velocity ------------------------------------------------------------
  | 'VELOCITY_TX_COUNT'
  | 'VELOCITY_VOLUME'
  | 'VELOCITY_SPIKE'
  | 'STRUCTURING'
  | 'RAPID_RAMP_REVERSAL'
  | 'COUNTERPARTY_FANOUT'
  | 'NEW_ACCOUNT_HIGH_VALUE'
  | 'DORMANT_REACTIVATION'

/**
 * One reason a transaction scored the way it did.
 *
 * `score` is this signal's standalone contribution (0–100).  The aggregate is
 * not a plain sum — see scoreSignals() in ./risk.ts.
 */
export interface RiskSignal {
  code: SignalCode
  severity: RiskLevel
  /** Standalone contribution, 0–100. */
  score: number
  /** Analyst-facing one-liner.  Must not contain raw PII beyond the subject. */
  description: string
  /** Structured evidence for the case file (thresholds, observed values, ids). */
  metadata?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Screening input / output
// ---------------------------------------------------------------------------

export type TransactionKind = 'onramp' | 'offramp' | 'billpay'

/** ISO 3166-1 alpha-2, restricted to markets Aframp is licensed in. */
export type Jurisdiction = 'NG' | 'KE' | 'GH' | 'ZA' | 'UG'

/**
 * Markets Aframp accepts payments from but holds no AML registration in — the
 * mobile-money footprint in lib/payments/regions.ts is wider than the licensed
 * footprint.
 *
 * These are not jurisdictions in the regulatory sense: there is no FIU we file
 * with and no statutory threshold to anchor structuring against.  They exist as
 * a type so a transaction from one cannot be silently screened under some other
 * market's policy, and so the console can show an analyst that a case has no
 * filing route.  See UNLICENSED_MARKET_POLICY in ./config.ts.
 */
export type UnlicensedMarket = 'TZ' | 'CM' | 'CI' | 'RW' | 'ZM'

/**
 * Any market a screened transaction can originate in.
 *
 * Prefer `Jurisdiction` wherever the value genuinely must be a licensed market
 * (SAR filing, regulator routing).  `Market` is for the screening path, which
 * must accept everything the payment routes accept.
 */
export type Market = Jurisdiction | UnlicensedMarket

/**
 * A transaction presented for screening.
 *
 * Amounts are integer **USD cents** everywhere in this module, matching
 * lib/kyc/withdrawalLimitService.ts.  Local-currency amounts are carried
 * separately for the case file and are never used in threshold arithmetic.
 */
export interface ScreeningSubject {
  /** Stable per-transaction id (order id, withdrawal id, …). */
  transactionId: string
  /** Wallet public key — the account identity used across this module. */
  userId: string
  kind: TransactionKind
  amountCents: number
  asset: string
  chain: string
  /**
   * Where the transaction originates.  Drives the structuring threshold, the
   * SAR filing deadline and the country hint sent to name screening.  May be an
   * unlicensed market — see UNLICENSED_MARKET_POLICY.
   */
  jurisdiction: Market

  /** Counterparty crypto address, when the transaction has one. */
  walletAddress?: string
  /** Bank or mobile-money account holder name, when the transaction has one. */
  accountName?: string
  /** Bank/mobile-money account number — hashed before it reaches the ledger. */
  accountNumber?: string
  /** Free-form counterparty key used for fan-out detection (bank acct, address). */
  counterpartyId?: string

  /** Account's KYC tier at screening time, for tier-relative thresholds. */
  kycTier?: string
  /** When the account first transacted.  Drives NEW_ACCOUNT_HIGH_VALUE. */
  accountCreatedAt?: Date
}

export interface ScreeningResult {
  transactionId: string
  userId: string
  decision: ScreeningDecision
  /** Aggregate 0–100.  See scoreSignals(). */
  riskScore: number
  riskLevel: RiskLevel
  signals: RiskSignal[]
  /** Case id, when the decision opened one. */
  caseId?: string
  /** Which providers answered, and whether they degraded to the local list. */
  providers: ProviderAttribution[]
  screenedAt: string
}

export interface ProviderAttribution {
  name: string
  kind: 'wallet' | 'name'
  /** false when the call failed and a fallback answered instead. */
  ok: boolean
  latencyMs: number
  /** Provider's own reference id, for audit trails and re-pulls. */
  reference?: string
}

// ---------------------------------------------------------------------------
// Provider results
// ---------------------------------------------------------------------------

/** A sanctions/PEP/adverse-media hit against a screened name. */
export interface NameMatch {
  /** Provider or list entity id. */
  entityId: string
  name: string
  /** 0–1.  1.0 is an exact normalised match. */
  matchScore: number
  /** e.g. "OFAC SDN", "UN Consolidated", "EU CFSP". */
  listName: string
  matchTypes: Array<'SANCTION' | 'PEP' | 'ADVERSE_MEDIA' | 'WATCHLIST'>
  countries?: string[]
  /** Aliases that matched, for the analyst to eyeball. */
  aliases?: string[]
}

export interface NameScreeningResult {
  matches: NameMatch[]
  /** Provider's search/reference id for audit. */
  reference?: string
}

export interface WalletRiskResult {
  address: string
  /** 0–100, normalised across providers. */
  riskScore: number
  riskLevel: RiskLevel
  /** Categories the provider attributes to the address (e.g. "darknet_market"). */
  categories: string[]
  /** True when the address itself is on a sanctions list. */
  sanctioned: boolean
  reference?: string
}

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

export type CaseStatus =
  | 'OPEN'
  | 'IN_REVIEW'
  | 'ESCALATED'
  | 'CLEARED'
  | 'CONFIRMED_SUSPICIOUS'

export type CaseDisposition = 'FALSE_POSITIVE' | 'TRUE_POSITIVE' | 'INCONCLUSIVE'

/** An entry in a case's append-only audit trail. */
export interface CaseEvent {
  at: string
  /** Analyst id, or "system" for engine-generated entries. */
  actor: string
  action:
    | 'CREATED'
    | 'ASSIGNED'
    | 'STATUS_CHANGED'
    | 'NOTE_ADDED'
    | 'SAR_FILED'
    | 'REOPENED'
  detail?: string
}

export interface ComplianceCase {
  id: string
  transactionId: string
  userId: string
  kind: TransactionKind
  jurisdiction: Market
  amountCents: number
  asset: string
  status: CaseStatus
  riskScore: number
  riskLevel: RiskLevel
  decision: ScreeningDecision
  signals: RiskSignal[]
  /** Analyst id, once picked up. */
  assignedTo?: string
  disposition?: CaseDisposition
  /** Set when the case has been reported; see SarRecord.id. */
  sarId?: string
  events: CaseEvent[]
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// SAR / STR
// ---------------------------------------------------------------------------

export type SarStatus = 'DRAFT' | 'SUBMITTED' | 'ACKNOWLEDGED' | 'REJECTED'

export interface SarRecord {
  id: string
  caseId: string
  userId: string
  jurisdiction: Jurisdiction
  /** The receiving FIU, e.g. "NFIU".  Derived from jurisdiction. */
  regulator: string
  status: SarStatus
  /** Analyst's narrative — the substance of the filing. */
  narrative: string
  /** Signal codes that triggered the filing, copied at draft time. */
  groundsForSuspicion: SignalCode[]
  amountCents: number
  /** Analyst who drafted it. */
  filedBy: string
  /**
   * When the clock started — the moment suspicion was formed, i.e. the case's
   * creation.  Deadlines run from here, not from draft time.
   */
  suspicionFormedAt: string
  /** Computed from suspicionFormedAt + the jurisdiction's filing window. */
  dueAt: string
  submittedAt?: string
  /** Regulator's acknowledgement reference, once returned. */
  regulatorReference?: string
  createdAt: string
  updatedAt: string
}
