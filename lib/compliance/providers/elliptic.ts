/**
 * Elliptic adapter — wallet risk.
 *
 * Targets Elliptic's synchronous wallet screening endpoint.  Two things make
 * this adapter more involved than the Chainalysis one:
 *
 *   1. **HMAC request signing.**  Elliptic authenticates each call with an
 *      HMAC-SHA256 signature over `{timestamp}{METHOD}{path}{body}`, keyed on
 *      the base64-decoded API secret.  The signature is timestamp-bound, so
 *      clock skew on the server shows up as 401s rather than as a code bug —
 *      worth knowing before debugging this at 3am.
 *   2. **A 0–10 risk score**, not a category, which is rescaled to our 0–100.
 *
 * ⚠️  As with the Chainalysis adapter: verify the endpoint, the signing payload
 *     and the response shape against current Elliptic documentation before
 *     enabling in production.
 */

import { createHmac } from 'node:crypto'
import { PROVIDER_TIMEOUT_MS } from '../config'
import type { RiskLevel, WalletRiskResult } from '../types'
import { ProviderError, withTimeout, type WalletRiskProvider } from './types'

const DEFAULT_BASE_URL = 'https://aml-api.elliptic.co'
const SCREEN_PATH = '/v2/wallet/synchronous'

/**
 * Elliptic scores 0–10.  Multiplying by 10 lands on our 0–100 scale directly,
 * and the band boundaries line up with how Elliptic documents its own
 * thresholds (≥7 high, ≥9 severe), so no bespoke mapping table is needed.
 */
const ELLIPTIC_SCORE_MAX = 10

interface EllipticResponse {
  /** 0–10, or null when Elliptic has no opinion on the address. */
  risk_score?: number | null
  evaluation_detail?: {
    source?: string
    destination?: string
  }
  triggered_rules?: Array<{
    rule?: { name?: string }
    matched_elements?: Array<{ contributions?: Array<{ entities?: Array<{ category?: string; name?: string }> }> }>
  }>
  cluster?: { category?: string; name?: string }
  id?: string
}

export class EllipticProvider implements WalletRiskProvider {
  readonly name = 'elliptic'

  private readonly apiKey: string
  private readonly apiSecret: string
  private readonly baseUrl: string

  constructor(apiKey: string, apiSecret: string, baseUrl: string = DEFAULT_BASE_URL) {
    if (!apiKey || !apiSecret) {
      throw new Error('EllipticProvider requires both an API key and secret')
    }
    this.apiKey = apiKey
    this.apiSecret = apiSecret
    this.baseUrl = baseUrl.replace(/\/$/, '')
  }

  async screenWallet(address: string, chain: string): Promise<WalletRiskResult> {
    const payload = JSON.stringify({
      subject: {
        asset: mapChainToAsset(chain),
        blockchain: mapChainToBlockchain(chain),
        type: 'address',
        hash: address,
      },
      type: 'wallet_exposure',
      customer_reference: 'aframp',
    })

    const timestamp = Date.now()
    const signature = this.sign(timestamp, 'POST', SCREEN_PATH, payload)

    const response = await withTimeout(
      fetch(`${this.baseUrl}${SCREEN_PATH}`, {
        method: 'POST',
        headers: {
          'x-access-key': this.apiKey,
          'x-access-sign': signature,
          'x-access-timestamp': String(timestamp),
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: payload,
        cache: 'no-store',
      }),
      PROVIDER_TIMEOUT_MS,
      this.name
    )

    if (!response.ok) {
      throw new ProviderError(
        this.name,
        `Wallet screening failed with HTTP ${response.status}`
      )
    }

    let body: EllipticResponse
    try {
      body = (await response.json()) as EllipticResponse
    } catch (error) {
      throw new ProviderError(this.name, 'Malformed JSON in response', error)
    }

    // A null score means "no exposure found", which is genuinely low risk —
    // distinct from a failed call, which throws above.
    const rawScore = body.risk_score ?? 0
    if (typeof rawScore !== 'number' || Number.isNaN(rawScore)) {
      throw new ProviderError(this.name, 'Response contained a non-numeric risk score')
    }

    const riskScore = Math.round(
      (Math.min(Math.max(rawScore, 0), ELLIPTIC_SCORE_MAX) / ELLIPTIC_SCORE_MAX) * 100
    )
    const categories = collectCategories(body)

    return {
      address,
      riskScore,
      riskLevel: levelFromScore(riskScore),
      categories,
      sanctioned: categories.some((c) => c.toLowerCase().includes('sanction')),
      reference: body.id,
    }
  }

  /**
   * HMAC-SHA256 over `{timestamp}{METHOD}{path}{body}`, keyed on the
   * base64-decoded secret, emitted base64.
   *
   * The secret is base64 at rest, so it must be decoded to bytes before use —
   * signing with the base64 *text* produces a well-formed signature that the
   * API rejects, which is an easy hour to lose.
   */
  private sign(timestamp: number, method: string, path: string, body: string): string {
    const message = `${timestamp}${method.toUpperCase()}${path}${body}`
    return createHmac('sha256', Buffer.from(this.apiSecret, 'base64'))
      .update(message, 'utf8')
      .digest('base64')
  }
}

/** Mirrors the band boundaries in config.ts RISK_BANDS. */
function levelFromScore(score: number): RiskLevel {
  if (score >= 75) return 'SEVERE'
  if (score >= 50) return 'HIGH'
  if (score >= 25) return 'MEDIUM'
  return 'LOW'
}

/**
 * Chain name → Elliptic asset code.
 *
 * Aframp settles on Stellar today; the rest are here so adding a chain does not
 * require touching the adapter.  Unknown chains fall through to the raw string
 * so Elliptic rejects it loudly rather than being silently screened as the
 * wrong asset.
 */
function mapChainToAsset(chain: string): string {
  const map: Record<string, string> = {
    stellar: 'XLM',
    ethereum: 'ETH',
    bitcoin: 'BTC',
    polygon: 'MATIC',
    tron: 'TRX',
  }
  return map[chain.toLowerCase()] ?? chain.toUpperCase()
}

function mapChainToBlockchain(chain: string): string {
  const map: Record<string, string> = {
    stellar: 'stellar',
    ethereum: 'ethereum',
    bitcoin: 'bitcoin',
    polygon: 'polygon',
    tron: 'tron',
  }
  return map[chain.toLowerCase()] ?? chain.toLowerCase()
}

/** Pulls rule names and attributed entity categories into a flat list. */
function collectCategories(body: EllipticResponse): string[] {
  const categories = new Set<string>()

  if (body.cluster?.category) categories.add(body.cluster.category)

  for (const rule of body.triggered_rules ?? []) {
    if (rule.rule?.name) categories.add(rule.rule.name)
    for (const element of rule.matched_elements ?? []) {
      for (const contribution of element.contributions ?? []) {
        for (const entity of contribution.entities ?? []) {
          if (entity.category) categories.add(entity.category)
        }
      }
    }
  }

  return [...categories]
}
