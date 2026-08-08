import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Edge runtime: keep sample rate low to avoid latency overhead
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 0,

  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === 'production',

  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? 'dev',
})
