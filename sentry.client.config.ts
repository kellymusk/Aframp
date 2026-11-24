import * as Sentry from '@sentry/nextjs'

import { redactEvent } from '@/lib/sentry-redact'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance: sample 10 % of traces in production, none in dev
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,

  // Session replay (financial app): record only sessions that hit an error,
  // never random sessions. All text, inputs and media are masked, and
  // anything that renders balances, amounts, addresses or KYC images is
  // blocked outright. Add data-sentry-block / data-sentry-mask to new
  // sensitive elements to keep them out of replays.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
      block: ['[data-sentry-block]', '[data-balance]', '[data-amount]', '[data-kyc]', 'img'],
    }),
  ],

  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === 'production',

  // Surface the release in Sentry's UI for source-map correlation
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? 'dev',

  // Ignore common noise
  ignoreErrors: [
    // Browser extensions & network noise
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    /^Loading chunk \d+ failed/,
    'NetworkError when attempting to fetch resource',
    // Wallet interactions users cancel themselves
    'User rejected the request',
    'User denied transaction signature',
  ],

  // Shared redaction rules (Stellar public + secret keys, emails, sensitive
  // keys in extra / request / contexts / breadcrumbs) live in one place.
  beforeSend: redactEvent,
})
