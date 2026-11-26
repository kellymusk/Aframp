import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-url'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/landing', '/login', '/signup'],
      disallow: [
        '/home',
        '/admin',
        '/settings',
        '/transactions',
        '/remittances',
        '/withdraw',
        '/charge',
        '/verify',
        '/request',
        '/api/',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
