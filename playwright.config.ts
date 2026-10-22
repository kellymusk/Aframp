import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  reporter: 'list',
  // The suite runs against `next dev`, which compiles each route on first
  // visit (several seconds per page on a cold CI runner).
  timeout: 60_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: 'http://127.0.0.1:3001',
    browserName: 'chromium',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
