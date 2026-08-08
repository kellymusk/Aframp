/**
 * Hero section statistics displayed on the landing page.
 *
 * These values are intentionally centralised here so they can be updated in a
 * single place without touching component code. Update them whenever the real
 * platform metrics change.
 *
 * Source / update process:
 *  - Obtain current numbers from the internal analytics dashboard or the data
 *    team before each release.
 *  - Round figures to the nearest presentable milestone (e.g. "50K+").
 *  - Reference issue #270 for context on why this file exists.
 *
 * TODO: Consider replacing this static config with a call to an analytics API
 *       endpoint (e.g. GET /api/stats) so the numbers update automatically
 *       without requiring a code change or redeployment.
 */
export interface HeroStat {
  /** Display value shown in large text (e.g. "50K+") */
  value: string
  /** Short label shown below the value (e.g. "Active Users") */
  label: string
}

export const HERO_STATS: HeroStat[] = [
  { value: '50K+', label: 'Active Users' },
  { value: '$2M+', label: 'Processed Daily' },
  { value: '12', label: 'Countries' },
]
