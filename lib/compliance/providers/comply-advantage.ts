/**
 * ComplyAdvantage adapter — name screening (sanctions, PEP, adverse media).
 *
 * This is the half of the control that covers bank account holder names and
 * mobile-money subscriber names, which blockchain analytics cannot see.  For an
 * offramp it is the more important half: the fiat leg is where a designated
 * person actually receives value.
 *
 * ⚠️  Verify endpoint, parameters and response shape against current
 *     ComplyAdvantage documentation before enabling in production.
 *
 * Cost note: ComplyAdvantage bills per search.  Screening every transaction
 * re-bills for the same counterparty repeatedly.  The intended production
 * shape is to screen a counterparty once on first use, persist the result, and
 * re-screen on list update or after a staleness window — see the caching
 * discussion in docs/AML_COMPLIANCE.md.  This adapter deliberately does no
 * caching of its own: caching a *screening decision* is a compliance policy
 * choice, not a transport detail, and hiding it inside an HTTP client is how
 * teams end up unable to answer "when was this person last screened?".
 */

import { NAME_SCREENING, PROVIDER_TIMEOUT_MS } from '../config'
import type { NameMatch, NameScreeningResult } from '../types'
import {
  ProviderError,
  withTimeout,
  type NameScreeningOptions,
  type NameScreeningProvider,
} from './types'

const DEFAULT_BASE_URL = 'https://api.complyadvantage.com'

/**
 * ComplyAdvantage `fuzziness` is 0–1 and is *not* the same quantity as our
 * match threshold: theirs widens the candidate net server-side, ours decides
 * what counts as a hit.  Searching narrower than we filter would mean the
 * provider silently discards candidates we would have wanted to see, so this
 * sits deliberately below NAME_SCREENING.matchThreshold.
 */
const SEARCH_FUZZINESS = 0.6

/** Their match-type vocabulary → ours. */
const MATCH_TYPE_MAP: Record<string, NameMatch['matchTypes'][number]> = {
  sanction: 'SANCTION',
  'warning': 'WATCHLIST',
  'fitness-probity': 'WATCHLIST',
  pep: 'PEP',
  'pep-class-1': 'PEP',
  'pep-class-2': 'PEP',
  'pep-class-3': 'PEP',
  'pep-class-4': 'PEP',
  'adverse-media': 'ADVERSE_MEDIA',
  'adverse-media-financial-crime': 'ADVERSE_MEDIA',
  'adverse-media-violent-crime': 'ADVERSE_MEDIA',
  'adverse-media-sexual-crime': 'ADVERSE_MEDIA',
  'adverse-media-terrorism': 'ADVERSE_MEDIA',
  'adverse-media-fraud': 'ADVERSE_MEDIA',
}

interface ComplyAdvantageField {
  name?: string
  value?: string
  source?: string
}

interface ComplyAdvantageHit {
  doc?: {
    id?: string
    name?: string
    entity_type?: string
    aka?: Array<{ name?: string }>
    types?: string[]
    fields?: ComplyAdvantageField[]
    sources?: string[]
  }
  match_types?: string[]
  score?: number
}

interface ComplyAdvantageResponse {
  content?: {
    data?: {
      id?: number
      ref?: string
      hits?: ComplyAdvantageHit[]
    }
  }
}

export class ComplyAdvantageProvider implements NameScreeningProvider {
  readonly name = 'complyadvantage'

  private readonly apiKey: string
  private readonly baseUrl: string

  constructor(apiKey: string, baseUrl: string = DEFAULT_BASE_URL) {
    if (!apiKey) throw new Error('ComplyAdvantageProvider requires an API key')
    this.apiKey = apiKey
    this.baseUrl = baseUrl.replace(/\/$/, '')
  }

  async screenName(
    name: string,
    { country, entity = false, clientRef }: NameScreeningOptions = {}
  ): Promise<NameScreeningResult> {
    const body = JSON.stringify({
      search_term: name,
      client_ref: clientRef,
      fuzziness: SEARCH_FUZZINESS,
      // `share_url` returns a link into their case manager, which is what an
      // analyst actually wants in the case file.
      share_url: 1,
      filters: {
        entity_type: entity ? 'company' : 'person',
        types: ['sanction', 'warning', 'fitness-probity', 'pep', 'adverse-media'],
        ...(country ? { country_codes: [country] } : {}),
      },
    })

    const response = await withTimeout(
      fetch(`${this.baseUrl}/searches`, {
        method: 'POST',
        headers: {
          Authorization: `Token ${this.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body,
        cache: 'no-store',
      }),
      PROVIDER_TIMEOUT_MS,
      this.name
    )

    if (!response.ok) {
      throw new ProviderError(
        this.name,
        `Name screening failed with HTTP ${response.status}`
      )
    }

    let parsed: ComplyAdvantageResponse
    try {
      parsed = (await response.json()) as ComplyAdvantageResponse
    } catch (error) {
      throw new ProviderError(this.name, 'Malformed JSON in response', error)
    }

    const data = parsed.content?.data
    const hits = data?.hits ?? []

    const matches = hits
      .map((hit) => toNameMatch(hit))
      .filter((match): match is NameMatch => match !== null)
      .filter((match) => match.matchScore >= NAME_SCREENING.matchThreshold)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, NAME_SCREENING.maxMatches)

    return {
      matches,
      // Persisted on the case so the search can be re-opened in their console
      // during an audit or a regulator query.
      reference: data?.ref ?? (data?.id != null ? String(data.id) : undefined),
    }
  }
}

function toNameMatch(hit: ComplyAdvantageHit): NameMatch | null {
  const doc = hit.doc
  if (!doc?.id || !doc.name) return null

  const matchTypes = new Set<NameMatch['matchTypes'][number]>()
  // `match_types` describes *how* the name matched; `types` describes what the
  // subject is listed for.  Both feed our classification — a hit that arrives
  // with neither is still a hit, so it falls back to WATCHLIST rather than
  // being dropped.
  for (const type of [...(hit.match_types ?? []), ...(doc.types ?? [])]) {
    const mapped = MATCH_TYPE_MAP[type]
    if (mapped) matchTypes.add(mapped)
  }
  if (matchTypes.size === 0) matchTypes.add('WATCHLIST')

  return {
    entityId: doc.id,
    name: doc.name,
    // ComplyAdvantage scores can exceed 1 on strong multi-field matches; clamp
    // so downstream threshold comparisons stay on a 0–1 scale.
    matchScore: Math.min(1, hit.score ?? 0),
    listName: doc.sources?.[0] ?? 'ComplyAdvantage',
    matchTypes: [...matchTypes],
    countries: extractCountries(doc.fields),
    aliases: (doc.aka ?? [])
      .map((a) => a.name)
      .filter((n): n is string => Boolean(n))
      .slice(0, 10),
  }
}

function extractCountries(fields: ComplyAdvantageField[] | undefined): string[] {
  const countries = new Set<string>()
  for (const field of fields ?? []) {
    if (field.name?.toLowerCase().includes('country') && field.value) {
      countries.add(field.value)
    }
  }
  return [...countries]
}
