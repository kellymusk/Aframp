/**
 * Chainalysis adapter — wallet risk.
 *
 * Targets the Address Screening API (`/api/risk/v2/entities`), which returns a
 * categorical risk verdict plus the exposure reasoning behind it.  KYT, the
 * other Chainalysis product, is a transfer-registration API with a different
 * lifecycle (register, then poll for alerts) that does not fit a synchronous
 * pre-transaction check; if Aframp later adopts KYT it belongs in its own
 * adapter rather than bent into this one.
 *
 * ⚠️  Request/response shapes follow the vendor's published v2 contract at time
 *     of writing.  Verify against current Chainalysis documentation and their
 *     sandbox before enabling in production — vendors revise these, and a
 *     silently-changed field here degrades to "no risk found", which is the
 *     failure direction that matters.  parseRisk() below is deliberately strict
 *     about the enum so an unrecognised verdict raises instead of scoring 0.
 */

import { PROVIDER_TIMEOUT_MS } from '../config'
import type { RiskLevel, WalletRiskResult } from '../types'
import { ProviderError, withTimeout, type WalletRiskProvider } from './types'

const DEFAULT_BASE_URL = 'https://api.chainalysis.com'

/** Chainalysis returns a four-level enum; it maps 1:1 onto our RiskLevel. */
const RISK_MAP: Record<string, RiskLevel> = {
  Low: 'LOW',
  Medium: 'MEDIUM',
  High: 'HIGH',
  Severe: 'SEVERE',
}

/**
 * Representative numeric score per band, since this API is categorical.
 *
 * The engine works in numbers so that vendor verdicts compose with velocity
 * signals.  Values sit at the midpoint of each RISK_BANDS range, except SEVERE
 * which is pinned to 100 — a severe verdict should reach the block threshold on
 * its own, without needing a second corroborating signal.
 */
const RISK_SCORES: Record<RiskLevel, number> = {
  LOW: 5,
  MEDIUM: 35,
  HIGH: 65,
  SEVERE: 100,
}

interface ChainalysisEntityResponse {
  risk?: string
  riskReason?: string | null
  cluster?: { name?: string; category?: string } | null
  addressIdentifications?: Array<{ category?: string; name?: string }>
  exposures?: Array<{ category?: string; value?: number }>
}

export class ChainalysisProvider implements WalletRiskProvider {
  readonly name = 'chainalysis'

  private readonly apiKey: string
  private readonly baseUrl: string

  constructor(apiKey: string, baseUrl: string = DEFAULT_BASE_URL) {
    if (!apiKey) throw new Error('ChainalysisProvider requires an API key')
    this.apiKey = apiKey
    this.baseUrl = baseUrl.replace(/\/$/, '')
  }

  /**
   * `chain` is unused: this endpoint resolves an address to a cluster without
   * needing the chain named, unlike Elliptic.  It stays in the signature
   * because WalletRiskProvider requires it and adapters must stay swappable.
   */
  async screenWallet(address: string, _chain: string): Promise<WalletRiskResult> {
    const url = `${this.baseUrl}/api/risk/v2/entities/${encodeURIComponent(address)}`

    const response = await withTimeout(
      fetch(url, {
        method: 'GET',
        headers: {
          Token: this.apiKey,
          Accept: 'application/json',
        },
        // Screening results are per-address and change over time; never serve
        // one from an HTTP cache.
        cache: 'no-store',
      }),
      PROVIDER_TIMEOUT_MS,
      this.name
    )

    // 404 means the address is unknown to Chainalysis, which is a legitimate
    // low-risk answer for a fresh address — not an error.
    if (response.status === 404) {
      return {
        address,
        riskScore: RISK_SCORES.LOW,
        riskLevel: 'LOW',
        categories: [],
        sanctioned: false,
      }
    }

    if (!response.ok) {
      throw new ProviderError(
        this.name,
        `Address screening failed with HTTP ${response.status}`
      )
    }

    let body: ChainalysisEntityResponse
    try {
      body = (await response.json()) as ChainalysisEntityResponse
    } catch (error) {
      throw new ProviderError(this.name, 'Malformed JSON in response', error)
    }

    const riskLevel = parseRisk(body.risk, this.name)
    const categories = collectCategories(body)

    return {
      address,
      riskScore: RISK_SCORES[riskLevel],
      riskLevel,
      categories,
      // Chainalysis signals designation through the `sanctions` category rather
      // than a dedicated boolean, so we look for it explicitly instead of
      // inferring it from the severity — a SEVERE verdict can also come from
      // heavy darknet exposure, which is a risk call, not a legal prohibition.
      sanctioned: categories.some((c) => c.toLowerCase().includes('sanction')),
      reference: body.cluster?.name ?? undefined,
    }
  }
}

/**
 * Maps the vendor's risk enum, raising on anything unrecognised.
 *
 * Defaulting an unknown verdict to LOW would turn a vendor-side rename into a
 * silent screening bypass.  Raising routes the transaction to review instead,
 * which is the correct direction to fail.
 */
function parseRisk(risk: string | undefined, provider: string): RiskLevel {
  if (!risk) throw new ProviderError(provider, 'Response contained no risk verdict')
  const level = RISK_MAP[risk]
  if (!level) throw new ProviderError(provider, `Unrecognised risk verdict "${risk}"`)
  return level
}

/** Flattens identification, cluster and exposure categories into one list. */
function collectCategories(body: ChainalysisEntityResponse): string[] {
  const categories = new Set<string>()

  for (const id of body.addressIdentifications ?? []) {
    if (id.category) categories.add(id.category)
  }
  if (body.cluster?.category) categories.add(body.cluster.category)
  for (const exposure of body.exposures ?? []) {
    // Only exposures with actual value attached — a zero-value exposure row is
    // noise in the case file.
    if (exposure.category && (exposure.value ?? 0) > 0) categories.add(exposure.category)
  }
  if (body.riskReason) categories.add(body.riskReason)

  return [...categories]
}
