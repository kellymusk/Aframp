import * as Sentry from '@sentry/nextjs'
import { redactSentryEvent } from './lib/sentry-redact'

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,

  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === 'production',

  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? 'dev',

  // Redact secrets / PII (extra, request, contexts, breadcrumbs, ...) using
  // the rules shared with the edge and client configs.
  beforeSend: redactSentryEvent,
})
