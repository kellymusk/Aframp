import React from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── Framer-motion stub ────────────────────────────────────────────────────────
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

// ── Lucide-react stub ─────────────────────────────────────────────────────────
jest.mock('lucide-react', () => ({
  Shield: (p: any) => <div data-testid="icon-shield" {...p} />,
  ShieldCheck: (p: any) => <div data-testid="icon-shieldcheck" {...p} />,
  ShieldAlert: (p: any) => <div data-testid="icon-shieldalert" {...p} />,
  Smartphone: (p: any) => <div data-testid="icon-smartphone" {...p} />,
  Key: (p: any) => <div data-testid="icon-key" {...p} />,
  Lock: (p: any) => <div data-testid="icon-lock" {...p} />,
  Eye: (p: any) => <div data-testid="icon-eye" {...p} />,
  EyeOff: (p: any) => <div data-testid="icon-eyeoff" {...p} />,
  Copy: (p: any) => <div data-testid="icon-copy" {...p} />,
  Check: (p: any) => <div data-testid="icon-check" {...p} />,
  Loader2: (p: any) => <div data-testid="icon-loader2" {...p} />,
  AlertTriangle: (p: any) => <div data-testid="icon-alerttriangle" {...p} />,
}))

// ── Next/navigation stub ──────────────────────────────────────────────────────
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

// ── clipboard stub ────────────────────────────────────────────────────────────
Object.assign(navigator, {
  clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
})

import { SecurityTab } from '@/components/settings/security-tab'

afterEach(() => {
  cleanup()
  jest.clearAllTimers()
  jest.useRealTimers()
})

// ─────────────────────────────────────────────────────────────────────────────
// Initial render
// ─────────────────────────────────────────────────────────────────────────────

describe('SecurityTab — initial render', () => {
  it('renders the Two-Factor Authentication card', () => {
    render(<SecurityTab />)
    expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument()
  })

  it('renders the 2FA status badge as "Disabled" by default', () => {
    render(<SecurityTab />)
    const badge = document.getElementById('2fa-status-badge')
    expect(badge).toBeInTheDocument()
    expect(badge!.textContent).toBe('Disabled')
  })

  it('renders the "Enable 2FA" button by default', () => {
    render(<SecurityTab />)
    expect(document.getElementById('enable-2fa-btn')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /enable 2fa/i })).toBeInTheDocument()
  })

  it('does NOT render the "Disable 2FA" button by default', () => {
    render(<SecurityTab />)
    expect(document.getElementById('disable-2fa-btn')).not.toBeInTheDocument()
  })

  it('renders the Change Password card', () => {
    render(<SecurityTab />)
    expect(screen.getByText('Change Password')).toBeInTheDocument()
  })

  it('renders the current-password input', () => {
    render(<SecurityTab />)
    expect(document.getElementById('current-password')).toBeInTheDocument()
  })

  it('renders the new-password input', () => {
    render(<SecurityTab />)
    expect(document.getElementById('new-password')).toBeInTheDocument()
  })

  it('renders the confirm-password input', () => {
    render(<SecurityTab />)
    expect(document.getElementById('confirm-password')).toBeInTheDocument()
  })

  it('renders the Update Password button', () => {
    render(<SecurityTab />)
    expect(document.getElementById('change-password-btn')).toBeInTheDocument()
  })

  it('Update Password button is disabled when fields are empty', () => {
    render(<SecurityTab />)
    const btn = document.getElementById('change-password-btn') as HTMLButtonElement
    expect(btn).toBeDisabled()
  })

  it('renders the Active Sessions card', () => {
    render(<SecurityTab />)
    expect(screen.getByText('Active Sessions')).toBeInTheDocument()
  })

  it('renders at least one active session entry', () => {
    render(<SecurityTab />)
    expect(screen.getByText('Chrome on Windows')).toBeInTheDocument()
  })

  it('marks the current device session', () => {
    render(<SecurityTab />)
    expect(screen.getByText('(This device)')).toBeInTheDocument()
  })

  it('renders a Revoke button for non-current sessions', () => {
    render(<SecurityTab />)
    expect(screen.getByRole('button', { name: /revoke/i })).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2FA — enable flow
// ─────────────────────────────────────────────────────────────────────────────

describe('SecurityTab — 2FA enable flow', () => {
  it('clicking "Enable 2FA" transitions to the setup step', async () => {
    const user = userEvent.setup()
    render(<SecurityTab />)

    await user.click(screen.getByRole('button', { name: /enable 2fa/i }))

    // Step 1 of setup: "Scan QR Code"
    expect(screen.getByText(/scan qr code/i)).toBeInTheDocument()
  })

  it('setup step renders the 6-digit verification code input', async () => {
    const user = userEvent.setup()
    render(<SecurityTab />)

    await user.click(screen.getByRole('button', { name: /enable 2fa/i }))

    const input = document.getElementById('2fa-verification-code') as HTMLInputElement
    expect(input).toBeInTheDocument()
  })

  it('setup step renders the manual TOTP secret key', async () => {
    const user = userEvent.setup()
    render(<SecurityTab />)

    await user.click(screen.getByRole('button', { name: /enable 2fa/i }))

    // The secret key is displayed in a <code> element
    expect(screen.getByText(/JBSW|KZAU|MJRG/)).toBeInTheDocument()
  })

  it('verify button is disabled when verification code is shorter than 6 digits', async () => {
    const user = userEvent.setup()
    render(<SecurityTab />)

    await user.click(screen.getByRole('button', { name: /enable 2fa/i }))

    const input = document.getElementById('2fa-verification-code') as HTMLInputElement
    await user.type(input, '123')

    const verifyBtn = document.getElementById('verify-2fa-btn') as HTMLButtonElement
    expect(verifyBtn).toBeDisabled()
  })

  it('verify button is enabled when verification code is exactly 6 digits', async () => {
    const user = userEvent.setup()
    render(<SecurityTab />)

    await user.click(screen.getByRole('button', { name: /enable 2fa/i }))

    const input = document.getElementById('2fa-verification-code') as HTMLInputElement
    await user.type(input, '123456')

    const verifyBtn = document.getElementById('verify-2fa-btn') as HTMLButtonElement
    expect(verifyBtn).not.toBeDisabled()
  })

  it('verification code input strips non-digits', async () => {
    const user = userEvent.setup()
    render(<SecurityTab />)

    await user.click(screen.getByRole('button', { name: /enable 2fa/i }))

    const input = document.getElementById('2fa-verification-code') as HTMLInputElement
    await user.type(input, 'abc123def')

    // Only digits should remain; limited to 6
    expect(input.value).toBe('123')
  })

  it('verification code input is capped at 6 digits', async () => {
    const user = userEvent.setup()
    render(<SecurityTab />)

    await user.click(screen.getByRole('button', { name: /enable 2fa/i }))

    const input = document.getElementById('2fa-verification-code') as HTMLInputElement
    await user.type(input, '1234567890')

    expect(input.value.length).toBeLessThanOrEqual(6)
  })

  it('"Cancel Setup" button returns to the overview', async () => {
    const user = userEvent.setup()
    render(<SecurityTab />)

    await user.click(screen.getByRole('button', { name: /enable 2fa/i }))
    expect(screen.getByText(/scan qr code/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cancel setup/i }))

    // Back to overview: enable button visible again
    expect(document.getElementById('enable-2fa-btn')).toBeInTheDocument()
  })

  it('completing 2FA verification transitions to the backup codes step', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<SecurityTab />)

    await user.click(screen.getByRole('button', { name: /enable 2fa/i }))

    const input = document.getElementById('2fa-verification-code') as HTMLInputElement
    await user.type(input, '123456')

    await user.click(document.getElementById('verify-2fa-btn')!)

    // Advance through the 2 second fake async delay
    jest.advanceTimersByTime(2500)

    // Backup codes step should now be shown
    expect(screen.getByText(/save your backup codes/i)).toBeInTheDocument()

    jest.useRealTimers()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2FA — backup codes step
// ─────────────────────────────────────────────────────────────────────────────

describe('SecurityTab — backup codes step', () => {
  /** Helper: advance through the enable flow to the backup-codes step. */
  async function reachBackupStep() {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<SecurityTab />)

    await user.click(screen.getByRole('button', { name: /enable 2fa/i }))
    const input = document.getElementById('2fa-verification-code') as HTMLInputElement
    await user.type(input, '123456')
    await user.click(document.getElementById('verify-2fa-btn')!)
    jest.advanceTimersByTime(2500)

    return user
  }

  afterEach(() => jest.useRealTimers())

  it('renders 6 backup codes', async () => {
    const user = await reachBackupStep()
    // Each backup code is in the format XXXX-XXXX; we have 6 of them
    const codes = ['A4K9-M2X7', 'B8P3-R5W1', 'C6L2-T9N4', 'D1J8-V3Q6', 'E7H5-Y0S2', 'F3G4-U8K9']
    codes.forEach((code) => {
      expect(screen.getByText(code)).toBeInTheDocument()
    })
    void user // suppress lint warning
  })

  it('renders the "Copy Codes" button', async () => {
    await reachBackupStep()
    expect(document.getElementById('copy-backup-codes-btn')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copy codes/i })).toBeInTheDocument()
  })

  it('renders the "I\'ve Saved My Codes" button', async () => {
    await reachBackupStep()
    expect(document.getElementById('complete-2fa-btn')).toBeInTheDocument()
  })

  it('clicking "Copy Codes" writes to clipboard', async () => {
    const user = await reachBackupStep()
    await user.click(screen.getByRole('button', { name: /copy codes/i }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('A4K9-M2X7')
    )
  })

  it('completing 2FA enables it and updates the badge to "Enabled"', async () => {
    const user = await reachBackupStep()
    await user.click(document.getElementById('complete-2fa-btn')!)

    const badge = document.getElementById('2fa-status-badge')
    expect(badge!.textContent).toBe('Enabled')
  })

  it('after 2FA is enabled the "Disable 2FA" button is rendered', async () => {
    const user = await reachBackupStep()
    await user.click(document.getElementById('complete-2fa-btn')!)

    expect(document.getElementById('disable-2fa-btn')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2FA — disable
// ─────────────────────────────────────────────────────────────────────────────

describe('SecurityTab — 2FA disable', () => {
  it('clicking "Disable 2FA" resets the badge to "Disabled"', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<SecurityTab />)

    // Enable first
    await user.click(screen.getByRole('button', { name: /enable 2fa/i }))
    const input = document.getElementById('2fa-verification-code') as HTMLInputElement
    await user.type(input, '123456')
    await user.click(document.getElementById('verify-2fa-btn')!)
    jest.advanceTimersByTime(2500)
    await user.click(document.getElementById('complete-2fa-btn')!)

    // Now disable
    await user.click(document.getElementById('disable-2fa-btn')!)

    const badge = document.getElementById('2fa-status-badge')
    expect(badge!.textContent).toBe('Disabled')
    jest.useRealTimers()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Password visibility toggle
// ─────────────────────────────────────────────────────────────────────────────

describe('SecurityTab — password visibility toggle', () => {
  it('current password field is type="password" by default', () => {
    render(<SecurityTab />)
    const input = document.getElementById('current-password') as HTMLInputElement
    expect(input.type).toBe('password')
  })

  it('clicking the toggle button reveals the password (type="text")', async () => {
    const user = userEvent.setup()
    render(<SecurityTab />)

    const toggleBtn = screen.getByRole('button', { name: /show password/i })
    await user.click(toggleBtn)

    const input = document.getElementById('current-password') as HTMLInputElement
    expect(input.type).toBe('text')
  })

  it('clicking the toggle button a second time hides the password again', async () => {
    const user = userEvent.setup()
    render(<SecurityTab />)

    const toggleBtn = screen.getByRole('button', { name: /show password/i })
    await user.click(toggleBtn)
    await user.click(screen.getByRole('button', { name: /hide password/i }))

    const input = document.getElementById('current-password') as HTMLInputElement
    expect(input.type).toBe('password')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Password change validation
// ─────────────────────────────────────────────────────────────────────────────

describe('SecurityTab — password change validation', () => {
  it('shows "Min 8 characters required" when new password is fewer than 8 chars', async () => {
    const user = userEvent.setup()
    render(<SecurityTab />)

    const newPassInput = document.getElementById('new-password') as HTMLInputElement
    await user.type(newPassInput, 'short')

    expect(screen.getByText(/min 8 characters required/i)).toBeInTheDocument()
  })

  it('shows "Strong password" when new password has 8+ characters', async () => {
    const user = userEvent.setup()
    render(<SecurityTab />)

    const newPassInput = document.getElementById('new-password') as HTMLInputElement
    await user.type(newPassInput, 'strongpassword')

    expect(screen.getByText(/strong password/i)).toBeInTheDocument()
  })

  it('shows "Passwords do not match" when new and confirm differ', async () => {
    const user = userEvent.setup()
    render(<SecurityTab />)

    await user.type(document.getElementById('new-password')!, 'password123')
    await user.type(document.getElementById('confirm-password')!, 'different456')

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
  })

  it('shows "Passwords match" when new and confirm are identical', async () => {
    const user = userEvent.setup()
    render(<SecurityTab />)

    await user.type(document.getElementById('new-password')!, 'password123')
    await user.type(document.getElementById('confirm-password')!, 'password123')

    expect(screen.getByText(/passwords match/i)).toBeInTheDocument()
  })

  it('Update Password button is disabled when new password is too short', async () => {
    const user = userEvent.setup()
    render(<SecurityTab />)

    await user.type(document.getElementById('current-password')!, 'oldpass')
    await user.type(document.getElementById('new-password')!, 'short')
    await user.type(document.getElementById('confirm-password')!, 'short')

    const btn = document.getElementById('change-password-btn') as HTMLButtonElement
    expect(btn).toBeDisabled()
  })

  it('Update Password button is disabled when passwords do not match', async () => {
    const user = userEvent.setup()
    render(<SecurityTab />)

    await user.type(document.getElementById('current-password')!, 'oldpassword')
    await user.type(document.getElementById('new-password')!, 'newpassword1')
    await user.type(document.getElementById('confirm-password')!, 'newpassword2')

    const btn = document.getElementById('change-password-btn') as HTMLButtonElement
    expect(btn).toBeDisabled()
  })

  it('Update Password button is enabled when all fields are valid and passwords match', async () => {
    const user = userEvent.setup()
    render(<SecurityTab />)

    await user.type(document.getElementById('current-password')!, 'oldpassword')
    await user.type(document.getElementById('new-password')!, 'newpassword1')
    await user.type(document.getElementById('confirm-password')!, 'newpassword1')

    const btn = document.getElementById('change-password-btn') as HTMLButtonElement
    expect(btn).not.toBeDisabled()
  })

  it('clicking Update Password disables the button while saving', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<SecurityTab />)

    await user.type(document.getElementById('current-password')!, 'oldpassword')
    await user.type(document.getElementById('new-password')!, 'newpassword1')
    await user.type(document.getElementById('confirm-password')!, 'newpassword1')

    const btn = document.getElementById('change-password-btn') as HTMLButtonElement
    await user.click(btn)

    expect(btn).toBeDisabled()

    jest.runAllTimers()
    jest.useRealTimers()
  })

  it('after successful password change fields are cleared', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<SecurityTab />)

    await user.type(document.getElementById('current-password')!, 'oldpassword')
    await user.type(document.getElementById('new-password')!, 'newpassword1')
    await user.type(document.getElementById('confirm-password')!, 'newpassword1')

    const btn = document.getElementById('change-password-btn') as HTMLButtonElement
    await user.click(btn)

    jest.advanceTimersByTime(2000)

    expect((document.getElementById('current-password') as HTMLInputElement).value).toBe('')
    expect((document.getElementById('new-password') as HTMLInputElement).value).toBe('')
    expect((document.getElementById('confirm-password') as HTMLInputElement).value).toBe('')

    jest.useRealTimers()
  })
})
