import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance: sample 10 % of traces in production, none in dev
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,

  // Session replay: 10 % of sessions, 100 % when an error occurs
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

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

  beforeSend(event) {
    // Strip sensitive wallet data from breadcrumb messages
    if (event.breadcrumbs?.values) {
      event.breadcrumbs.values = event.breadcrumbs.values.map((b) => ({
        ...b,
        message: b.message?.replace(/G[A-Z2-7]{55}/g, '[STELLAR_ADDR]'),
      }))
    }
    return event
  },
})
