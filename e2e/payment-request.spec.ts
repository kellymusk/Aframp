import { expect, test } from '@playwright/test'

const requestId = 'e2e-payment-request'
const paymentRequest = {
  id: requestId,
  merchant_id: 'e2e-merchant',
  address: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
  network: 'testnet',
  amount_stroops: 10_000_000,
  asset: 'XLM',
  memo: 'E2E-REFERENCE',
  status: 'pending',
  expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
  created_at: new Date().toISOString(),
  sep7_uri:
    'web+stellar:pay?destination=GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF&amount=1',
}

test('creates a payment request and displays its QR code', async ({ page }) => {
  // The session lives in an httpOnly cookie behind /api/session.
  await page.route('**/api/session', (route) =>
    route.fulfill({
      json:
        route.request().method() === 'GET'
          ? { token: 'e2e-token', userId: 'e2e-user', merchantId: 'e2e-merchant' }
          : { ok: true },
    })
  )

  await page.route('**/backend/payment-requests', (route) =>
    route.fulfill({ status: 201, json: paymentRequest })
  )
  await page.route(`**/backend/payment-requests/${requestId}`, (route) =>
    route.fulfill({ status: 200, json: paymentRequest })
  )

  await page.goto('/charge')
  // Don't interact with the server-rendered keypad before React hydrates it.
  // networkidle alone isn't enough on a cold CI runner: a click that lands
  // before hydration is dropped, so retry until the amount actually updates.
  await page.waitForLoadState('networkidle')
  await expect(async () => {
    if ((await page.getByTestId('charge-amount').textContent()) !== '1') {
      await page.getByRole('button', { name: '1', exact: true }).click()
    }
    await expect(page.getByTestId('charge-amount')).toHaveText('1', { timeout: 1_000 })
  }).toPass({ timeout: 20_000 })
  await page.getByRole('button', { name: 'Show payment code' }).click()

  await expect(page).toHaveURL(new RegExp(`/request/${requestId}$`))
  // react-qr-code renders `title` as a <title> child, not an attribute.
  await expect(
    page.locator('svg', { has: page.locator('title', { hasText: /^Pay / }) })
  ).toBeVisible()
})
