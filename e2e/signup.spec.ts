import { test, expect } from '@playwright/test'

/**
 * E2E tests for the /signup page.
 *
 * The SignupClient component renders a two-step flow:
 *   Step 1 — Phone number entry  (id="phone", button text "Continue")
 *   Step 2 — OTP entry           (id="otp",   button text "Verify Code")
 *
 * After successful OTP verification the user is redirected to /feature-highlights.
 */

test.describe('Signup flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup')
  })

  // ---------------------------------------------------------------------------
  // Phone step
  // ---------------------------------------------------------------------------

  test('phone number entry step renders', async ({ page }) => {
    // Page heading for step 1
    await expect(page.getByRole('heading', { name: 'Get Started' })).toBeVisible()

    // Phone input is present and labelled
    await expect(page.locator('#phone')).toBeVisible()
    await expect(page.getByLabel('Phone Number')).toBeVisible()

    // Submit button says "Continue"
    await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible()
  })

  test('invalid phone (fewer than 10 digits) shows an error toast', async ({ page }) => {
    // Enter a phone number that is too short
    await page.fill('#phone', '123')
    await page.getByRole('button', { name: 'Continue' }).click()

    // A sonner toast with an error message should appear
    await expect(
      page.getByText('Please enter a valid phone number')
    ).toBeVisible({ timeout: 5000 })

    // We should still be on the phone step — heading unchanged
    await expect(page.getByRole('heading', { name: 'Get Started' })).toBeVisible()
  })

  test('valid phone (10+ digits) proceeds to OTP step', async ({ page }) => {
    await page.fill('#phone', '+2348012345678')
    await page.getByRole('button', { name: 'Continue' }).click()

    // After the simulated 1-second delay the OTP step should be visible
    await expect(page.getByRole('heading', { name: 'Verify Phone' })).toBeVisible({
      timeout: 5000,
    })
  })

  // ---------------------------------------------------------------------------
  // OTP step — navigate there first via a valid phone submission
  // ---------------------------------------------------------------------------

  test('OTP step renders with the entered phone number in the description', async ({ page }) => {
    const phone = '+2348012345678'
    await page.fill('#phone', phone)
    await page.getByRole('button', { name: 'Continue' }).click()

    // Wait for OTP step
    await expect(page.getByRole('heading', { name: 'Verify Phone' })).toBeVisible({
      timeout: 5000,
    })

    // The sub-heading should contain the phone number that was entered
    await expect(page.getByText(phone, { exact: false })).toBeVisible()

    // OTP input is rendered
    await expect(page.locator('#otp')).toBeVisible()

    // "Verify Code" button is rendered
    await expect(page.getByRole('button', { name: 'Verify Code' })).toBeVisible()
  })

  test('OTP that is too short (< 6 digits) keeps user on OTP step', async ({ page }) => {
    // Reach OTP step
    await page.fill('#phone', '+2348012345678')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByRole('heading', { name: 'Verify Phone' })).toBeVisible({
      timeout: 5000,
    })

    // The "Verify Code" button is disabled when otp.length < 6 per the component logic.
    // Confirm it is disabled with a short OTP.
    await page.fill('#otp', '123')
    await expect(page.getByRole('button', { name: 'Verify Code' })).toBeDisabled()

    // We are still on the OTP step
    await expect(page.getByRole('heading', { name: 'Verify Phone' })).toBeVisible()
  })

  test('valid 6-digit OTP completes signup and redirects to /feature-highlights', async ({
    page,
  }) => {
    // Reach OTP step
    await page.fill('#phone', '+2348012345678')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByRole('heading', { name: 'Verify Phone' })).toBeVisible({
      timeout: 5000,
    })

    // Enter a 6-digit OTP
    await page.fill('#otp', '123456')

    // Button should now be enabled
    await expect(page.getByRole('button', { name: 'Verify Code' })).toBeEnabled()

    // Click verify — component simulates 1 s delay then redirects
    await page.getByRole('button', { name: 'Verify Code' }).click()

    // Expect redirection to /feature-highlights
    await page.waitForURL('**/feature-highlights', { timeout: 8000 })
    expect(page.url()).toContain('/feature-highlights')
  })
})
