import robots from '../robots'
import sitemap from '../sitemap'
import { metadata as appMetadata } from '../(app)/layout'

describe('robots.txt', () => {
  it('lets crawlers see the public pages and keeps them out of the dashboard', () => {
    const { rules, sitemap: sitemapUrl } = robots()
    const rule = Array.isArray(rules) ? rules[0] : rules
    expect(rule.allow).toEqual(expect.arrayContaining(['/', '/login', '/signup']))
    expect(rule.disallow).toEqual(expect.arrayContaining(['/home', '/admin', '/withdraw']))
    expect(sitemapUrl).toMatch(/\/sitemap\.xml$/)
  })
})

describe('sitemap.xml', () => {
  it('lists only public pages, home first', () => {
    const entries = sitemap()
    expect(entries.map((entry) => new URL(entry.url).pathname)).toEqual([
      '/',
      '/landing',
      '/login',
      '/signup',
    ])
    expect(entries[0].priority).toBe(1)
  })
})

describe('site URL', () => {
  const original = process.env.NEXT_PUBLIC_SITE_URL

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = original
    jest.resetModules()
  })

  it('uses NEXT_PUBLIC_SITE_URL without a trailing slash', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://pay.example.com/'
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { SITE_URL } = require('@/lib/site-url') as typeof import('@/lib/site-url')
      expect(SITE_URL).toBe('https://pay.example.com')
    })
  })
})

describe('dashboard layout metadata', () => {
  it('keeps signed-in pages out of search results', () => {
    expect(appMetadata.robots).toEqual({ index: false, follow: false })
  })
})
