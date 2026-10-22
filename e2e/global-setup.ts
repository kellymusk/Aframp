import type { FullConfig } from '@playwright/test'

/**
 * The suite runs against `next dev`, which compiles each route the first
 * time it's requested. A test that navigates into an uncompiled route (e.g.
 * /verify → /home after login, /charge → /request/[id]) waits for that
 * compile before the URL changes, and on a cold CI runner with both specs
 * compiling in parallel that can outlast the URL assertion. Compile every
 * route the specs visit before any test starts.
 */
const ROUTES = ['/', '/login', '/verify', '/home', '/charge', '/request/warm-up']

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL
  if (!baseURL) return
  for (const route of ROUTES) {
    // Sequential on purpose: parallel compiles are what make this slow.
    await fetch(new URL(route, baseURL), { signal: AbortSignal.timeout(120_000) }).catch(() => {
      // A failed warm-up only means that route compiles during its test.
    })
  }
}
