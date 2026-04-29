/**
 * Fuzzy name matching using Jaro-Winkler similarity.
 * No external dependency — pure implementation.
 */

function jaroSimilarity(s1: string, t: string): number {
  if (s1 === t) return 1
  const s = s1.toLowerCase()
  const t2 = t.toLowerCase()
  const matchDist = Math.max(Math.floor(Math.max(s.length, t2.length) / 2) - 1, 0)
  const sMatches = new Array(s.length).fill(false)
  const tMatches = new Array(t2.length).fill(false)
  let matches = 0
  let transpositions = 0

  for (let i = 0; i < s.length; i++) {
    const start = Math.max(0, i - matchDist)
    const end = Math.min(i + matchDist + 1, t2.length)
    for (let j = start; j < end; j++) {
      if (tMatches[j] || s[i] !== t2[j]) continue
      sMatches[i] = true
      tMatches[j] = true
      matches++
      break
    }
  }

  if (matches === 0) return 0

  let k = 0
  for (let i = 0; i < s.length; i++) {
    if (!sMatches[i]) continue
    while (!tMatches[k]) k++
    if (s[i] !== t2[k]) transpositions++
    k++
  }

  return (matches / s.length + matches / t2.length + (matches - transpositions / 2) / matches) / 3
}

/** Jaro-Winkler similarity (0-1) */
export function jaroWinkler(s1: string, s2: string, p = 0.1): number {
  const jaro = jaroSimilarity(s1, s2)
  const prefix = Math.min(
    4,
    [...s1.toLowerCase()].findIndex((c, i) => c !== s2.toLowerCase()[i]) === -1
      ? Math.min(s1.length, s2.length)
      : [...s1.toLowerCase()].findIndex((c, i) => c !== s2.toLowerCase()[i])
  )
  return jaro + prefix * p * (1 - jaro)
}

/**
 * Match a query name against a candidate (name + aliases).
 * Returns the highest similarity score found.
 */
export function matchName(query: string, name: string, aliases: string[]): number {
  const candidates = [name, ...aliases]
  return Math.max(...candidates.map((c) => jaroWinkler(query, c)))
}

/** Normalise a name: lowercase, strip punctuation, collapse whitespace */
export function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
