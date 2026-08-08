/**
 * Name matching for sanctions screening.
 *
 * Screening a bank account holder name against a watchlist is a fuzzy-match
 * problem, not a string-equality one.  The same person appears across lists as
 * "Mohammed Al-Hassan", "Muhammad al Hassan", "HASSAN, Mohamed" and
 * "Alhaji Mohammed Hassan".  Exact matching catches none of those, and a bank
 * that only exact-matches has no screening control at all.
 *
 * The approach here is the industry-standard one:
 *
 *   1. Normalise aggressively — case, diacritics, punctuation, honorifics.
 *   2. Compare as *token sets*, so name order and inserted middle names do not
 *      break the match.
 *   3. Compare individual tokens with Jaro-Winkler, which is tuned for short
 *      strings with shared prefixes — exactly how transliteration variants
 *      differ ("Yusuf"/"Yousef", "Abdulahi"/"Abdullahi").
 *
 * Everything is deterministic and dependency-free so the same input always
 * produces the same score.  A screening decision an analyst cannot reproduce is
 * not defensible to a regulator.
 */

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

/**
 * Honorifics, titles and generational suffixes stripped before comparison.
 *
 * These carry no identifying information but do inflate token counts, which
 * drags a real match below threshold ("Alhaji Musa Bello" vs "Musa Bello"
 * would otherwise lose a third of its coverage).  The list is weighted towards
 * titles common in Aframp's markets alongside the usual English ones.
 */
const HONORIFICS = new Set([
  'mr', 'mrs', 'ms', 'miss', 'mx', 'dr', 'prof', 'professor', 'rev', 'reverend',
  'sir', 'madam', 'mallam', 'malam', 'alhaji', 'alhaja', 'hajia', 'hajj', 'hajji',
  'chief', 'oba', 'eze', 'igwe', 'otunba', 'engr', 'engineer', 'barr', 'barrister',
  'arc', 'architect', 'hon', 'honourable', 'honorable', 'pastor', 'bishop', 'imam',
  'sheikh', 'sheik', 'elder', 'capt', 'captain', 'col', 'colonel', 'gen', 'general',
  'jnr', 'jr', 'snr', 'sr', 'ii', 'iii', 'iv',
])

/**
 * Corporate suffixes folded away when screening entity (rather than person)
 * names, so "Acme Trading Ltd" matches the listed "ACME TRADING LIMITED".
 */
const CORPORATE_SUFFIXES = new Set([
  'ltd', 'limited', 'plc', 'inc', 'incorporated', 'llc', 'llp', 'lp', 'gmbh',
  'sa', 'sarl', 'bv', 'nv', 'ag', 'pty', 'co', 'company', 'corp', 'corporation',
  'holdings', 'holding', 'group', 'intl', 'international', 'enterprises',
  'enterprise', 'ventures', 'trading', 'and', 'the',
])

/**
 * Strips diacritics, punctuation and case, and collapses whitespace.
 *
 * Arabic/French transliterations reach us with accents that the lists drop
 * ("Séïdou" vs "Seidou"), and connectors are written inconsistently
 * ("Al-Hassan", "Al Hassan", "AlHassan").  Hyphens and apostrophes become
 * spaces rather than being deleted, so "Al-Hassan" tokenises to two tokens the
 * same way "Al Hassan" does.
 */
export function normalizeName(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // combining diacritical marks
    .toLowerCase()
    .replace(/[\u2018\u2019'\u0060\u00b4]/g, '') // elision apostrophes: d'Souza -> dsouza
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export interface TokenizeOptions {
  /** Also drop corporate suffixes.  Use when screening business names. */
  entity?: boolean
}

/**
 * Normalises then splits into comparison tokens, dropping noise words.
 *
 * If stripping leaves nothing (a name made entirely of words we consider
 * noise, e.g. a company literally called "The Group"), the un-stripped tokens
 * are returned instead — screening something is always better than screening
 * an empty set, which would match everything or nothing depending on the
 * caller.
 */
export function tokenize(raw: string, { entity = false }: TokenizeOptions = {}): string[] {
  const all = normalizeName(raw).split(' ').filter(Boolean)

  const kept = all.filter((t) => {
    if (HONORIFICS.has(t)) return false
    if (entity && CORPORATE_SUFFIXES.has(t)) return false
    // Single letters are initials — they carry too little signal to compare
    // but shouldn't count against coverage either.
    return t.length > 1
  })

  return kept.length > 0 ? kept : all
}

// ---------------------------------------------------------------------------
// Jaro-Winkler
// ---------------------------------------------------------------------------

/**
 * Jaro similarity — 0 (nothing in common) to 1 (identical).
 *
 * Counts characters common to both strings within a sliding window of
 * ⌊max(len)/2⌋ − 1, then discounts for how many of those are transposed.
 */
export function jaro(a: string, b: string): number {
  if (a === b) return 1
  if (a.length === 0 || b.length === 0) return 0

  const matchWindow = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1)
  const aMatched = new Array<boolean>(a.length).fill(false)
  const bMatched = new Array<boolean>(b.length).fill(false)

  let matches = 0
  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - matchWindow)
    const end = Math.min(i + matchWindow + 1, b.length)
    for (let j = start; j < end; j++) {
      if (bMatched[j] || a[i] !== b[j]) continue
      aMatched[i] = true
      bMatched[j] = true
      matches++
      break
    }
  }

  if (matches === 0) return 0

  // Transpositions: matched characters that appear in a different relative
  // order in the two strings, counted in pairs.
  let transpositions = 0
  let k = 0
  for (let i = 0; i < a.length; i++) {
    if (!aMatched[i]) continue
    while (!bMatched[k]) k++
    if (a[i] !== b[k]) transpositions++
    k++
  }
  transpositions /= 2

  return (matches / a.length + matches / b.length + (matches - transpositions) / matches) / 3
}

/**
 * Jaro-Winkler — Jaro with a bonus for a shared prefix (up to 4 characters).
 *
 * The prefix bonus is what makes this the right metric for names: people
 * misspell and transliterate endings far more often than beginnings, so
 * "Abdullahi"/"Abdulahi" should score higher than raw Jaro gives it.
 */
export function jaroWinkler(a: string, b: string, scalingFactor = 0.1): number {
  const j = jaro(a, b)
  // The standard boost only applies to already-similar strings; without this
  // guard, unrelated names that happen to share a prefix get inflated.
  if (j < 0.7) return j

  let prefix = 0
  const maxPrefix = Math.min(4, a.length, b.length)
  while (prefix < maxPrefix && a[prefix] === b[prefix]) prefix++

  return j + prefix * scalingFactor * (1 - j)
}

// ---------------------------------------------------------------------------
// Token-set similarity
// ---------------------------------------------------------------------------

/** Below this, two tokens are treated as unrelated rather than weakly matched. */
const TOKEN_MATCH_FLOOR = 0.8

/**
 * Fraction of the score lost per surplus token in the longer name.
 *
 * Deliberately gentle.  Lists routinely hold more name parts than a bank
 * record does ("Musa Ibrahim Bello" listed, "Musa Bello" on the account), and
 * a harsh penalty there is precisely how real hits get missed.  The asymmetry
 * is intentional: false positives cost analyst minutes, false negatives cost a
 * licence.
 */
const SURPLUS_PENALTY = 0.3

/**
 * Similarity between two names as token sets — 0 to 1.
 *
 * Each token of the shorter name is greedily paired with its best unused
 * partner in the longer one, so word order does not matter: "Hassan Mohammed"
 * and "Mohammed Hassan" score 1.0.  The mean pair similarity is then discounted
 * by how many tokens went unpaired.
 *
 * Greedy pairing rather than optimal (Hungarian) assignment is a deliberate
 * trade: on the 2–4 token inputs real names produce, the two agree almost
 * always, and greedy runs in the microseconds a payment path can afford.
 */
export function nameSimilarity(
  a: string,
  b: string,
  options: TokenizeOptions = {}
): number {
  const tokensA = tokenize(a, options)
  const tokensB = tokenize(b, options)

  if (tokensA.length === 0 || tokensB.length === 0) return 0

  const [shorter, longer] =
    tokensA.length <= tokensB.length ? [tokensA, tokensB] : [tokensB, tokensA]

  const used = new Set<number>()
  let total = 0

  for (const token of shorter) {
    let best = 0
    let bestIndex = -1

    for (let i = 0; i < longer.length; i++) {
      if (used.has(i)) continue
      const score = jaroWinkler(token, longer[i])
      if (score > best) {
        best = score
        bestIndex = i
      }
    }

    if (bestIndex >= 0 && best >= TOKEN_MATCH_FLOOR) {
      used.add(bestIndex)
      total += best
    }
    // Below the floor the token contributes 0 but still counts in the mean —
    // an unmatched name part must drag the overall score down.
  }

  const mean = total / shorter.length
  const surplus = longer.length - shorter.length
  const penalty = 1 - SURPLUS_PENALTY * (surplus / longer.length)

  return round4(mean * penalty)
}

/**
 * Best similarity between `name` and any of an entity's aliases (its primary
 * name included), plus which alias produced it.
 *
 * Lists carry aliases precisely because subjects use them; screening only the
 * primary name discards most of the list's value.
 */
export function bestAliasMatch(
  name: string,
  aliases: string[],
  options: TokenizeOptions = {}
): { score: number; alias: string | null } {
  let best = 0
  let bestAlias: string | null = null

  for (const alias of aliases) {
    const score = nameSimilarity(name, alias, options)
    if (score > best) {
      best = score
      bestAlias = alias
    }
  }

  return { score: best, alias: bestAlias }
}

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000
}
