#!/usr/bin/env node
/* eslint-disable no-console -- CLI job: stdout and a non-zero exit are its interface. */
/**
 * Refreshes the local sanctions screening corpus.
 *
 *   node scripts/refresh-sanctions-lists.mjs [--out data/sanctions/snapshot.json]
 *
 * Fetches the OFAC SDN and UN Consolidated lists, normalises both into the
 * SanctionsEntity shape used by lib/compliance/sanctions/list.ts, and writes a
 * single snapshot JSON.
 *
 * Why this exists as a job rather than a live API call:
 *
 *   Sanctions designations take effect on publication, not on our next refresh,
 *   so the corpus must be pulled on a schedule — daily at minimum.  Fetching it
 *   per transaction would be both slow and rude to two public services.  The
 *   snapshot is deliberately NOT committed to the repository: it is large, it
 *   changes several times a week, and a stale committed copy is worse than no
 *   copy because it looks current.
 *
 * Run it:
 *   - on deploy, so a fresh instance never boots on fixture data
 *   - daily thereafter (cron / scheduled GitHub Action)
 *
 * The application reports snapshot age on /api/admin/compliance/health and the
 * console banners it past SNAPSHOT_STALE_DAYS.  A refresh failure is therefore
 * visible rather than silent — but this script also exits non-zero so the
 * scheduler notices first.
 *
 * ⚠️  Source URLs and file formats are those published at time of writing.
 *     OFAC and the UN do change them.  Verify before relying on this in
 *     production, and treat a parse yielding implausibly few entities as a
 *     failure — see MIN_PLAUSIBLE_ENTITIES below.
 */

import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const SOURCES = {
  // OFAC Specially Designated Nationals, XML.  Includes digital currency
  // addresses in the `<feature>` elements, which is the part no other list
  // gives us.
  ofacSdn: 'https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN_ENHANCED.XML',
  // UN Security Council Consolidated List, XML.
  unConsolidated: 'https://scsanctions.un.org/resources/xml/en/consolidated.xml',
}

/**
 * A successful fetch that parses to near-nothing is the dangerous failure: the
 * job "succeeds", the snapshot loads, health reports green, and we screen
 * against an empty corpus.  Both lists carry thousands of entries, so anything
 * below this means the format changed under us.
 */
const MIN_PLAUSIBLE_ENTITIES = 500

const FETCH_TIMEOUT_MS = 120_000

async function main() {
  const outIndex = process.argv.indexOf('--out')
  const outPath = resolve(
    outIndex >= 0 && process.argv[outIndex + 1]
      ? process.argv[outIndex + 1]
      : 'data/sanctions/snapshot.json'
  )

  console.log('Refreshing sanctions lists…')

  const entities = []
  const sources = []

  for (const [key, url] of Object.entries(SOURCES)) {
    try {
      console.log(`  fetching ${key} …`)
      const xml = await fetchText(url)
      const parsed = key === 'ofacSdn' ? parseOfac(xml) : parseUn(xml)
      console.log(`    ${parsed.length} entities`)
      entities.push(...parsed)
      sources.push(parsed[0]?.source ?? key)
    } catch (error) {
      // Fail the whole job rather than writing a partial snapshot.  A snapshot
      // missing one list still loads and still reports healthy, which is
      // exactly the silent degradation this script is supposed to prevent.
      console.error(`    FAILED: ${error.message}`)
      process.exitCode = 1
      return
    }
  }

  if (entities.length < MIN_PLAUSIBLE_ENTITIES) {
    console.error(
      `Refusing to write snapshot: parsed only ${entities.length} entities ` +
        `(expected at least ${MIN_PLAUSIBLE_ENTITIES}). The upstream format has probably changed.`
    )
    process.exitCode = 1
    return
  }

  const snapshot = {
    generatedAt: new Date().toISOString(),
    sources,
    entities,
  }

  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, JSON.stringify(snapshot), 'utf8')

  const addresses = entities.reduce((n, e) => n + e.cryptoAddresses.length, 0)
  console.log(
    `Wrote ${entities.length} entities (${addresses} crypto addresses) to ${outPath}`
  )
}

async function fetchText(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`)
    return await response.text()
  } finally {
    clearTimeout(timer)
  }
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------
//
// Both parsers are regex-based rather than using a real XML parser.  That is a
// deliberate trade for a build-time script with no runtime dependencies: the
// documents are machine-generated with stable element names, and the failure
// mode of a bad parse is caught by MIN_PLAUSIBLE_ENTITIES above rather than
// being silently absorbed.  If either list moves to a materially different
// structure, replace these with a streaming XML parser — do not patch the
// regexes further.

function parseOfac(xml) {
  const entities = []

  for (const block of matchBlocks(xml, /<entity[\s\S]*?<\/entity>/gi)) {
    const id = firstMatch(block, /\bid="(\d+)"/i)
    const name = firstMatch(block, /<formattedFullName>([^<]+)<\/formattedFullName>/i)
    if (!id || !name) continue

    const primary = decodeXml(name)
    const aliases = matchValues(block, /<formattedFullName>([^<]+)<\/formattedFullName>/gi)
      .map(decodeXml)
      .filter((alias) => alias !== primary)

    // Digital currency addresses are published as feature values whose type
    // name starts "Digital Currency Address".
    const cryptoAddresses = matchValues(
      block,
      /<feature[^>]*>[\s\S]*?Digital Currency Address[\s\S]*?<value>([^<]+)<\/value>[\s\S]*?<\/feature>/gi
    ).map((value) => decodeXml(value).trim().toLowerCase())

    entities.push({
      id: `OFAC-${id}`,
      source: 'OFAC SDN',
      name: primary,
      aliases: unique(aliases),
      entityType: /<entityType>Individual<\/entityType>/i.test(block) ? 'INDIVIDUAL' : 'ENTITY',
      matchTypes: ['SANCTION'],
      countries: unique(matchValues(block, /<country>([^<]+)<\/country>/gi).map(decodeXml)),
      cryptoAddresses: unique(cryptoAddresses),
    })
  }

  return entities
}

function parseUn(xml) {
  const entities = []

  const individuals = matchBlocks(xml, /<INDIVIDUAL>[\s\S]*?<\/INDIVIDUAL>/gi)
  const groups = matchBlocks(xml, /<ENTITY>[\s\S]*?<\/ENTITY>/gi)

  for (const [blocks, type] of [
    [individuals, 'INDIVIDUAL'],
    [groups, 'ENTITY'],
  ]) {
    for (const block of blocks) {
      const id = firstMatch(block, /<DATAID>([^<]+)<\/DATAID>/i)
      if (!id) continue

      // UN splits personal names across numbered elements; entities use a
      // single FIRST_NAME holding the whole name.
      const nameParts = [
        firstMatch(block, /<FIRST_NAME>([^<]+)<\/FIRST_NAME>/i),
        firstMatch(block, /<SECOND_NAME>([^<]+)<\/SECOND_NAME>/i),
        firstMatch(block, /<THIRD_NAME>([^<]+)<\/THIRD_NAME>/i),
        firstMatch(block, /<FOURTH_NAME>([^<]+)<\/FOURTH_NAME>/i),
      ].filter(Boolean)

      const name = decodeXml(nameParts.join(' ').trim())
      if (!name) continue

      const aliases = matchValues(block, /<ALIAS_NAME>([^<]+)<\/ALIAS_NAME>/gi)
        .map((alias) => decodeXml(alias).trim())
        .filter(Boolean)

      entities.push({
        id: `UN-${id}`,
        source: 'UN Consolidated',
        name,
        aliases: unique(aliases),
        entityType: type,
        matchTypes: ['SANCTION'],
        countries: unique(
          matchValues(block, /<COUNTRY>([^<]*)<\/COUNTRY>/gi)
            .map((country) => decodeXml(country).trim())
            .filter(Boolean)
        ),
        cryptoAddresses: [],
        listedAt: firstMatch(block, /<LISTED_ON>([^<]+)<\/LISTED_ON>/i) ?? undefined,
      })
    }
  }

  return entities
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Whole matches, for splitting a document into per-record blocks. */
function matchBlocks(text, pattern) {
  return [...text.matchAll(pattern)].map((m) => m[0])
}

/** First capture group of every match. */
function matchValues(text, pattern) {
  return [...text.matchAll(pattern)].map((m) => m[1])
}

function firstMatch(text, pattern) {
  const match = text.match(pattern)
  return match ? match[1] : null
}

function decodeXml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

function unique(values) {
  return [...new Set(values)]
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
