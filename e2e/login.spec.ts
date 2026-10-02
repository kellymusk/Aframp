import { expect, test } from '@playwright/test'

test('signs in and redirects to the home dashboard', async ({ page }) => {
  await page.route('**/backend/login', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ challenge_id: 'e2e-challenge', expires_in_secs: 600 }),
    })
  )

  await page.route('**/backend/balance', (route) => route.fulfill({ json: [] }))
  await page.route('**/backend/transactions*', (route) => route.fulfill({ json: [] }))
  await page.route('**/backend/payment-requests*', (route) => route.fulfill({ json: [] }))
  await page.route('**/backend/verify-otp', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'e2e-token',
        user_id: 'e2e-user',
        merchant_id: 'e2e-merchant',
      }),
    })
  )

  await page.goto('/login')
  // Don't interact with the server-rendered form before React hydrates it.
  await page.waitForLoadState('networkidle')
  await page.getByLabel('Email').fill('merchant@example.com')
  await page.getByLabel('Password', { exact: true }).fill('correct-horse-battery-staple')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByLabel('6-digit code').fill('123456')
  await page.getByRole('button', { name: 'Verify' }).click()

  await expect(page).toHaveURL(/\/home$/)
  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible()
})
