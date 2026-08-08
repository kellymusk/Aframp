import { test, expect } from '@playwright/test'

/**
 * E2E tests for the onramp flow.
 *
 * Routes under test:
 *   /onramp                          — Calculator page
 *   /onramp/payment/[orderId]        — Payment step
 *   /onramp/processing/[orderId]     — Processing / order-status step
 *   /onramp/success                  — Success / confirmation page
 */

// A synthetic Stellar wallet address used in tests that need one.
const TEST_WALLET = 'GDQJUTQYK2MQX2VGDR2FYWLIYAQIEGXTQVTFEMGH3UXQDOSH4EJQKIO'
// A synthetic order ID used to navigate directly to sub-pages.
const TEST_ORDER_ID = 'test-order-001'

test.describe('Onramp calculator page', () => {
  test.beforeEach(async ({ page }) => {
    // Seed localStorage so wallet-dependent UI renders
    await page.goto('/onramp')
    await page.evaluate((addr) => {
      localStorage.setItem('walletAddress', addr)
      localStorage.setItem('walletAddresses', JSON.stringify([addr]))
    }, TEST_WALLET)
    await page.reload()
  })

  test('page renders the onramp calculator', async ({ page }) => {
    // The calculator form / card should be visible
    await expect(page.getByRole('button', { name: /Continue to Payment/i })).toBeVisible({
      timeout: 10000,
    })

    // "You Pay" label is present
    await expect(page.getByText('You Pay')).toBeVisible()

    // "You Receive" label is present
    await expect(page.getByText(/You Receive/i)).toBeVisible()

    // Payment method section
    await expect(page.getByText('Payment Method')).toBeVisible()
  })

  test('currency selector is interactive', async ({ page }) => {
    // The currency selector buttons (fiat side) should be present.
    // CurrencySelector renders a button/trigger showing the active currency code.
    const fiatSelector = page.locator('[data-testid="currency-selector-fiat"]')
    const fiatSelectorByText = page.getByRole('button', { name: /NGN|KES|GHS|ZAR|UGX/i }).first()

    // Check the selector is visible — prefer data-testid, fallback to role+text
    const selectorLocator = (await fiatSelector.count()) > 0 ? fiatSelector : fiatSelectorByText
    await expect(selectorLocator).toBeVisible({ timeout: 10000 })

    // Click the selector to open a dropdown / dialog
    await selectorLocator.click()

    // At least one currency option should appear
    await expect(
      page.getByText(/NGN|KES|GHS|ZAR|UGX/i).first()
    ).toBeVisible({ timeout: 5000 })
  })

  test('amount input accepts numeric values', async ({ page }) => {
    // The AmountInput renders a plain <input> with placeholder "0.00".
    const amountInput = page.getByPlaceholder('0.00')
    await expect(amountInput).toBeVisible({ timeout: 10000 })

    // Type a valid amount
    await amountInput.fill('5000')
    await expect(amountInput).toHaveValue('5000')
  })

  test('payment method cards are selectable', async ({ page }) => {
    // Three payment method options are rendered
    await expect(page.getByText('Bank Transfer')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Card Payment')).toBeVisible()
    await expect(page.getByText('Mobile Money')).toBeVisible()

    // Click "Card Payment" — it should become selected (the component changes
    // visual state; we verify the click does not throw).
    await page.getByText('Card Payment').click()
    // After selection the fee description for card should be visible
    await expect(page.getByText(/1\.5% fee/i)).toBeVisible()
  })

  test('proceed to payment page with a valid amount and wallet', async ({ page }) => {
    const amountInput = page.getByPlaceholder('0.00')
    await expect(amountInput).toBeVisible({ timeout: 10000 })

    // Fill in a valid amount (above the minimum of 100)
    await amountInput.fill('5000')

    // Wait for the "Continue to Payment" button to become enabled
    // (exchange rate needs to load; the test has retries configured)
    const continueBtn = page.getByRole('button', { name: /Continue to Payment/i })
    await expect(continueBtn).toBeEnabled({ timeout: 15000 })

    await continueBtn.click()

    // Should navigate to /onramp/payment/...
    await page.waitForURL('**/onramp/payment/**', { timeout: 15000 })
    expect(page.url()).toContain('/onramp/payment/')
  })
})

test.describe('Onramp processing page', () => {
  test.beforeEach(async ({ page }) => {
    // Seed a minimal order in localStorage so the processing page can read it
    await page.goto('/onramp')
    await page.evaluate(
      ({ orderId, wallet }) => {
        const order = {
          id: orderId,
          status: 'awaiting_payment',
          fiatCurrency: 'NGN',
          fiatAmount: 5000,
          cryptoAsset: 'cNGN',
          cryptoAmount: 5000,
          walletAddress: wallet,
          paymentMethod: 'bank_transfer',
          fees: { processingFee: 0, networkFee: 50, totalFees: 50, totalCost: 5050 },
          createdAt: new Date().toISOString(),
          referenceId: orderId,
        }
        localStorage.setItem(`onramp:order:${orderId}`, JSON.stringify(order))
        localStorage.setItem('onramp:latest-order', JSON.stringify(order))
        localStorage.setItem('walletAddress', wallet)
      },
      { orderId: TEST_ORDER_ID, wallet: TEST_WALLET }
    )
  })

  test('processing page renders and shows order status', async ({ page }) => {
    await page.goto(`/onramp/processing/${TEST_ORDER_ID}`)

    // The page should load without a hard error
    // A progress bar, status timeline, or order summary card should be present.
    await expect(
      page.getByText(/awaiting payment|payment confirmed|order created|processing/i).first()
    ).toBeVisible({ timeout: 10000 })
  })

  test('processing page displays a back / refresh action', async ({ page }) => {
    await page.goto(`/onramp/processing/${TEST_ORDER_ID}`)

    // Either a "Back" link or a refresh button should be visible
    const backLink = page.getByRole('link', { name: /back/i })
    const refreshBtn = page.getByRole('button', { name: /refresh/i })

    const hasBack = (await backLink.count()) > 0
    const hasRefresh = (await refreshBtn.count()) > 0

    expect(hasBack || hasRefresh).toBe(true)
  })
})

test.describe('Onramp success page', () => {
  test.beforeEach(async ({ page }) => {
    // Seed a completed order in localStorage
    await page.goto('/onramp')
    await page.evaluate(
      ({ orderId, wallet }) => {
        const order = {
          id: orderId,
          status: 'completed',
          fiatCurrency: 'NGN',
          fiatAmount: 5000,
          cryptoAsset: 'cNGN',
          cryptoAmount: 5000,
          walletAddress: wallet,
          paymentMethod: 'bank_transfer',
          fees: { processingFee: 0, networkFee: 50, totalFees: 50, totalCost: 5050 },
          createdAt: new Date().toISOString(),
          referenceId: orderId,
          transactionHash: 'abc123txhash',
        }
        localStorage.setItem(`onramp:order:${orderId}`, JSON.stringify(order))
        localStorage.setItem('walletAddress', wallet)
      },
      { orderId: TEST_ORDER_ID, wallet: TEST_WALLET }
    )
  })

  test('success page shows a confirmation message', async ({ page }) => {
    await page.goto(`/onramp/success?order=${TEST_ORDER_ID}`)

    // The success client shows a "completed" confirmation; look for typical success text.
    await expect(
      page.getByText(/success|completed|confirmed|transaction complete/i).first()
    ).toBeVisible({ timeout: 10000 })
  })

  test('success page offers next-step actions', async ({ page }) => {
    await page.goto(`/onramp/success?order=${TEST_ORDER_ID}`)

    // The OnrampSuccessClient renders action buttons (e.g., Download, Dashboard, Try Again).
    const actionButton = page
      .getByRole('button', { name: /download|dashboard|go to dashboard|buy again|done/i })
      .first()
    await expect(actionButton).toBeVisible({ timeout: 10000 })
  })
})
