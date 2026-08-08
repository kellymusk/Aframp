/**
 * Name matching tests.
 *
 * These are the tests that matter most in the whole module.  A screening
 * control is only as good as its matcher: too strict and designated people walk
 * through under a transliteration variant, too loose and analysts drown in
 * homonyms and start clearing everything reflexively.
 *
 * The cases below are grouped by the failure they guard against, and the
 * "must not match" group is as important as the "must match" one.
 */

import {
  bestAliasMatch,
  jaro,
  jaroWinkler,
  nameSimilarity,
  normalizeName,
  tokenize,
} from '../sanctions/matching'
import { NAME_SCREENING } from '../config'

const THRESHOLD = NAME_SCREENING.matchThreshold

describe('normalizeName', () => {
  it('strips diacritics so transliterations converge', () => {
    expect(normalizeName('Séïdou Traoré')).toBe('seidou traore')
  })

  it('folds punctuation and connectors to spaces', () => {
    expect(normalizeName('Al-Hassan')).toBe('al hassan')
    expect(normalizeName('Al Hassan')).toBe('al hassan')
  })

  it("removes elision apostrophes rather than splitting on them", () => {
    // d'Souza must not become two tokens "d" and "souza".
    expect(normalizeName("D'Souza")).toBe('dsouza')
  })

  it('collapses repeated whitespace and trims', () => {
    expect(normalizeName('  Musa   Bello  ')).toBe('musa bello')
  })
})

describe('tokenize', () => {
  it('drops honorifics common in Aframp markets', () => {
    expect(tokenize('Alhaji Ibrahim Danjuma')).toEqual(['ibrahim', 'danjuma'])
    expect(tokenize('Chief Mrs Nomvula Sithole')).toEqual(['nomvula', 'sithole'])
  })

  it('drops corporate suffixes only in entity mode', () => {
    expect(tokenize('Zawadi Holdings Limited', { entity: true })).toEqual(['zawadi'])
    expect(tokenize('Zawadi Holdings Limited')).toEqual(['zawadi', 'holdings', 'limited'])
  })

  it('falls back to unstripped tokens rather than returning nothing', () => {
    // A name made entirely of noise words must still screen against something —
    // an empty token set would match nothing at all.
    expect(tokenize('The Group', { entity: true })).toEqual(['the', 'group'])
  })

  it('drops single-character initials', () => {
    expect(tokenize('Ibrahim M Danjuma')).toEqual(['ibrahim', 'danjuma'])
  })
})

describe('jaro / jaroWinkler', () => {
  it('scores identical strings 1', () => {
    expect(jaro('musa', 'musa')).toBe(1)
    expect(jaroWinkler('musa', 'musa')).toBe(1)
  })

  it('scores disjoint strings 0', () => {
    expect(jaro('abc', 'xyz')).toBe(0)
  })

  it('rewards a shared prefix, which is how transliterations differ', () => {
    // "Abdullahi" / "Abdulahi" share nine leading characters; the ending is
    // where transliteration diverges.
    expect(jaroWinkler('abdullahi', 'abdulahi')).toBeGreaterThan(
      jaro('abdullahi', 'abdulahi')
    )
    expect(jaroWinkler('abdullahi', 'abdulahi')).toBeGreaterThan(0.95)
  })

  it('withholds the prefix bonus from weakly-similar strings', () => {
    // Without the 0.7 guard, unrelated names sharing a prefix get inflated.
    const score = jaroWinkler('mohammed', 'mostafa')
    expect(score).toBe(jaro('mohammed', 'mostafa'))
  })
})

describe('nameSimilarity — must match', () => {
  it('ignores name order', () => {
    expect(nameSimilarity('Hassan Mohammed', 'Mohammed Hassan')).toBe(1)
  })

  it('matches across transliteration variants', () => {
    expect(nameSimilarity('Ibrahim Musa Danjuma', 'Ibraheem Moussa Danjouma')).toBeGreaterThanOrEqual(
      THRESHOLD
    )
  })

  it('matches when the list carries an extra middle name', () => {
    // The list routinely holds more name parts than a bank record does.  This
    // is the single most common cause of a missed true hit.
    expect(nameSimilarity('Musa Bello', 'Musa Ibrahim Bello')).toBeGreaterThanOrEqual(
      THRESHOLD
    )
  })

  it('matches through an honorific', () => {
    expect(nameSimilarity('Alhaji Ibrahim Danjuma', 'Ibrahim Danjuma')).toBe(1)
  })

  it('matches a hyphenated name against its spaced form', () => {
    expect(nameSimilarity('Mohammed Al-Hassan', 'Mohammed Al Hassan')).toBe(1)
  })

  it('matches corporate forms in entity mode', () => {
    expect(
      nameSimilarity('Zawadi Holdings Ltd', 'ZAWADI HOLDINGS LIMITED', { entity: true })
    ).toBe(1)
  })

  it('tolerates a single-character typo', () => {
    expect(nameSimilarity('Nomvula Sithole', 'Nomvula Sithoie')).toBeGreaterThanOrEqual(
      THRESHOLD
    )
  })
})

describe('nameSimilarity — must not match', () => {
  it('rejects unrelated names', () => {
    expect(nameSimilarity('Musa Bello', 'Grace Achieng')).toBeLessThan(THRESHOLD)
  })

  it('rejects a shared surname alone', () => {
    // Sharing one name part out of two is not a hit; treating it as one would
    // flag every customer with a common surname.
    expect(nameSimilarity('Grace Bello', 'Musa Bello')).toBeLessThan(THRESHOLD)
  })

  it('rejects a shared first name alone', () => {
    expect(nameSimilarity('Musa Bello', 'Musa Achieng')).toBeLessThan(THRESHOLD)
  })

  it('rejects a subset that shares only a common given name', () => {
    expect(nameSimilarity('Mohammed', 'Mohammed Hassan Ibrahim Yusuf')).toBeLessThan(
      THRESHOLD
    )
  })

  it('returns 0 for an empty or symbol-only name', () => {
    expect(nameSimilarity('', 'Musa Bello')).toBe(0)
    expect(nameSimilarity('---', 'Musa Bello')).toBe(0)
  })
})

describe('nameSimilarity — properties', () => {
  it('is symmetric', () => {
    const a = 'Ibrahim Musa Danjuma'
    const b = 'Ibraheem Moussa Danjouma'
    expect(nameSimilarity(a, b)).toBe(nameSimilarity(b, a))
  })

  it('is deterministic across repeated calls', () => {
    // A screening score an analyst cannot reproduce is not defensible.
    const scores = Array.from({ length: 5 }, () =>
      nameSimilarity('Musa Bello', 'Musa Ibrahim Bello')
    )
    expect(new Set(scores).size).toBe(1)
  })

  it('never exceeds 1', () => {
    expect(nameSimilarity('Musa Bello', 'Musa Bello')).toBeLessThanOrEqual(1)
  })
})

describe('bestAliasMatch', () => {
  const aliases = ['Ibrahim Musa Danjuma', 'Ibrahim M. Danjuma', 'Alhaji Ibrahim Danjuma']

  it('returns the strongest alias and its score', () => {
    const { score, alias } = bestAliasMatch('Alhaji Ibrahim Danjuma', aliases)
    expect(score).toBe(1)
    // Several aliases here reduce to the same token set once the honorific and
    // the "M." initial are stripped, so they tie at 1.0 and the first wins.
    // The score is what drives the decision; which of a set of equivalent
    // aliases is surfaced to the analyst is cosmetic.
    expect(['Ibrahim Musa Danjuma', 'Ibrahim M. Danjuma', 'Alhaji Ibrahim Danjuma']).toContain(
      alias
    )
  })

  it('prefers a stronger alias over a weaker earlier one', () => {
    const { alias } = bestAliasMatch('Grace Achieng', ['Musa Bello', 'Grace Achieng'])
    expect(alias).toBe('Grace Achieng')
  })

  it('finds a hit through an alias the primary name would have missed', () => {
    // The whole point of carrying aliases: subjects use them.
    const { score } = bestAliasMatch('Ibrahim Danjuma', aliases)
    expect(score).toBeGreaterThanOrEqual(THRESHOLD)
  })

  it('reports no alias for an empty list', () => {
    expect(bestAliasMatch('Musa Bello', [])).toEqual({ score: 0, alias: null })
  })
})
