import type { Metadata } from 'next'

export { default } from './pricealert/page'

const title = "Aframp — Africa's gateway to global decentralized finance"
const description =
  'Fast, secure, and effortless for everyday spending. Send money to anyone in Africa instantly.'

// metadataBase is set in app/layout.tsx, so relative URLs here resolve to absolute ones.
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Aframp',
    title,
    description,
    // images are supplied by app/opengraph-image.tsx
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    // images are supplied by app/twitter-image.tsx
  },
}
