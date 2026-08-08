import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,

  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === 'production',

  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? 'dev',

  // Redact secrets from captured events before they leave the process
  beforeSend(event) {
    // Remove any Stellar private keys or mnemonics accidentally captured in extras
    if (event.extra) {
      const redactKeys = ['secretKey', 'mnemonic', 'privateKey', 'secret', 'password', 'token']
      for (const key of redactKeys) {
        if (key in event.extra) {
          event.extra[key] = '[REDACTED]'
        }
      }
    }
    return event
  },
})
