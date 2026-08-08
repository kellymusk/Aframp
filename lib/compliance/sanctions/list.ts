/**
 * Sanctions list registry — the local screening corpus.
 *
 * Why a local list exists at all when we pay for a screening provider:
 *
 *   1. **Failover.**  ComplyAdvantage/Chainalysis going down must not become an
 *      unscreened payment path.  With FAIL_CLOSED the transaction is held for
 *      review, but a local hit lets us block outright rather than queue.
 *   2. **Wallet addresses.**  OFAC publishes designated crypto addresses
 *      directly in the SDN file.  Matching those is exact-string work that does
 *      not need a paid API call on every transaction.
 *   3. **Determinism in tests and CI**, which cannot reach a live provider.
 *
 * Where the data comes from:
 *
 *   `scripts/refresh-sanctions-lists.mjs` fetches the OFAC SDN and UN
 *   Consolidated files, normalises them into the SanctionsEntity shape below,
 *   and writes a snapshot JSON.  The snapshot is loaded at boot via
 *   loadSanctionsSnapshot().  It is intentionally NOT committed: it is large,
 *   it changes several times a week, and a stale committed copy is worse than
 *   no copy because it looks current.
 *
 *   With no snapshot loaded the registry holds only DEV_FIXTURE_ENTITIES —
 *   synthetic entries that exist so the code path is exercised in development
 *   and tests.  isSnapshotLoaded() reports which state we are in, and
 *   /api/admin/compliance/health surfaces it, because silently screening
 *   against a fixture list in production would be a control failure of the
 *   worst kind.
 */

import { NAME_SCREENING } from '../config'
import type { NameMatch } from '../types'
import { bestAliasMatch, normalizeName } from './matching'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ListSource =
  | 'OFAC SDN'
  | 'OFAC Consolidated'
  | 'UN Consolidated'
  | 'EU CFSP'
  | 'UK HMT'
  | 'DEV FIXTURE'

export interface SanctionsEntity {
  /** List-native id (OFAC uid, UN dataid, …), prefixed by source. */
  id: string
  source: ListSource
  /** Primary listed name. */
  name: string
  /** Every a.k.a. / f.k.a. the list carries.  Primary name excluded. */
  aliases: string[]
  entityType: 'INDIVIDUAL' | 'ENTITY' | 'VESSEL' | 'AIRCRAFT'
  matchTypes: Array<'SANCTION' | 'PEP' | 'ADVERSE_MEDIA' | 'WATCHLIST'>
  countries: string[]
  /** Designated crypto addresses, normalised to lowercase. */
  cryptoAddresses: string[]
  /** ISO date the entry was published/last amended, when the list gives one. */
  listedAt?: string
}

export interface SanctionsSnapshot {
  /** ISO timestamp the snapshot was generated. */
  generatedAt: string
  sources: ListSource[]
  entities: SanctionsEntity[]
}

// ---------------------------------------------------------------------------
// Development fixture
// ---------------------------------------------------------------------------

/**
 * Synthetic entries — **not** real designations.
 *
 * Deliberately invented so no real person or organisation is represented as
 * sanctioned anywhere in this repository.  They exercise the shapes that make
 * matching hard: transliteration variants, reordered name parts, honorifics,
 * a corporate suffix, and an entity carrying a crypto address.
 */
export const DEV_FIXTURE_ENTITIES: SanctionsEntity[] = [
  {
    id: 'FIXTURE-001',
    source: 'DEV FIXTURE',
    name: 'Ibrahim Musa Danjuma',
    aliases: ['Ibrahim M. Danjuma', 'Alhaji Ibrahim Danjuma', 'Ibraheem Moussa Danjouma'],
    entityType: 'INDIVIDUAL',
    matchTypes: ['SANCTION'],
    countries: ['NG'],
    cryptoAddresses: [],
    listedAt: '2021-03-14',
  },
  {
    id: 'FIXTURE-002',
    source: 'DEV FIXTURE',
    name: 'Zawadi Holdings Limited',
    aliases: ['Zawadi Holdings Ltd', 'Zawadi Group'],
    entityType: 'ENTITY',
    matchTypes: ['SANCTION', 'ADVERSE_MEDIA'],
    countries: ['KE'],
    cryptoAddresses: ['gd7fixtureaddressfortestingonlyaaaaaaaaaaaaaaaaaaaaaaaa'],
    listedAt: '2022-11-02',
  },
  {
    id: 'FIXTURE-003',
    source: 'DEV FIXTURE',
    name: 'Nomvula Precious Sithole',
    aliases: ['Nomvula P. Sithole', 'N. Sithole'],
    entityType: 'INDIVIDUAL',
    matchTypes: ['PEP'],
    countries: ['ZA'],
    cryptoAddresses: [],
    listedAt: '2023-06-21',
  },
]

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

let _entities: SanctionsEntity[] = DEV_FIXTURE_ENTITIES
let _snapshotLoaded = false
let _generatedAt: string | null = null

/**
 * Exact-match index over designated crypto addresses.
 *
 * Screening a wallet address is the one part of this module that must be exact:
 * a fuzzy match on an address is meaningless, and a linear scan of every
 * entity's addresses on every transaction is not something a payment path can
 * afford once the SDN list is loaded in full.
 */
let _addressIndex = new Map<string, SanctionsEntity>()

function rebuildAddressIndex(): void {
  const index = new Map<string, SanctionsEntity>()
  for (const entity of _entities) {
    for (const address of entity.cryptoAddresses) {
      index.set(address.toLowerCase(), entity)
    }
  }
  _addressIndex = index
}

rebuildAddressIndex()

/**
 * Replaces the in-memory corpus with a refreshed snapshot.
 *
 * Called at boot from the snapshot file and by the refresh job.  Swapping the
 * array wholesale (rather than mutating) means an in-flight screening call
 * always sees one consistent version of the list.
 */
export function loadSanctionsSnapshot(snapshot: SanctionsSnapshot): void {
  _entities = snapshot.entities
  _snapshotLoaded = true
  _generatedAt = snapshot.generatedAt
  rebuildAddressIndex()
}

export interface SnapshotStatus {
  loaded: boolean
  generatedAt: string | null
  entityCount: number
  addressCount: number
  /** Whole days since generation, or null when no snapshot is loaded. */
  ageDays: number | null
}

/**
 * Reports what the registry is currently screening against.
 *
 * Surfaced on the admin health endpoint.  `loaded: false` in production means
 * screening is running on fixture data and must be treated as an incident.
 */
export function getSnapshotStatus(): SnapshotStatus {
  return {
    loaded: _snapshotLoaded,
    generatedAt: _generatedAt,
    entityCount: _entities.length,
    addressCount: _addressIndex.size,
    ageDays: _generatedAt
      ? Math.floor((Date.now() - new Date(_generatedAt).getTime()) / 86_400_000)
      : null,
  }
}

// ---------------------------------------------------------------------------
// Screening
// ---------------------------------------------------------------------------

/**
 * Fuzzy-matches `name` against every listed name and alias.
 *
 * Returns matches at or above NAME_SCREENING.matchThreshold, highest first,
 * capped at maxMatches so one generic name cannot produce a case file with
 * thousands of hits in it.
 *
 * `entity: true` additionally folds away corporate suffixes — pass it when the
 * name came from a business account.
 */
export function screenNameAgainstLists(
  name: string,
  { entity = false }: { entity?: boolean } = {}
): NameMatch[] {
  if (normalizeName(name).length === 0) return []

  const matches: NameMatch[] = []

  for (const candidate of _entities) {
    const isEntity = entity || candidate.entityType === 'ENTITY'
    const { score, alias } = bestAliasMatch(
      name,
      [candidate.name, ...candidate.aliases],
      { entity: isEntity }
    )

    if (score < NAME_SCREENING.matchThreshold) continue

    matches.push({
      entityId: candidate.id,
      name: candidate.name,
      matchScore: score,
      listName: candidate.source,
      matchTypes: candidate.matchTypes,
      countries: candidate.countries,
      // Surface the alias that actually matched — an analyst clearing a hit
      // needs to see *what* matched, not just that something did.
      aliases: alias && alias !== candidate.name ? [alias] : undefined,
    })
  }

  return matches
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, NAME_SCREENING.maxMatches)
}

/**
 * Exact lookup of a crypto address against designated addresses.
 *
 * Case-insensitive because the lists publish EVM addresses in mixed
 * (checksummed) case while wallets hand us lowercase, and vice versa.
 */
export function screenAddressAgainstLists(address: string): SanctionsEntity | null {
  return _addressIndex.get(address.trim().toLowerCase()) ?? null
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Restores the fixture corpus.  Test helper only. */
export function _resetSanctionsList(): void {
  _entities = DEV_FIXTURE_ENTITIES
  _snapshotLoaded = false
  _generatedAt = null
  rebuildAddressIndex()
}

/** Swaps in an arbitrary corpus without marking a snapshot loaded.  Tests only. */
export function _setSanctionsEntities(entities: SanctionsEntity[]): void {
  _entities = entities
  rebuildAddressIndex()
}
