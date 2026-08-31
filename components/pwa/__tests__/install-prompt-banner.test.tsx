import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { InstallPromptBanner } from '@/components/pwa/install-prompt-banner'
import { useInstallPrompt } from '@/hooks/use-install-prompt'

jest.mock('@/hooks/use-install-prompt', () => ({
  useInstallPrompt: jest.fn(),
}))

const mockUseInstallPrompt = useInstallPrompt as jest.Mock

describe('InstallPromptBanner', () => {
  it('renders nothing when not eligible', () => {
    mockUseInstallPrompt.mockReturnValue({
      eligible: false,
      platform: null,
      install: jest.fn(),
      dismiss: jest.fn(),
    })

    const { container } = render(<InstallPromptBanner />)

    expect(container).toBeEmptyDOMElement()
  })

  it('shows an Install button and triggers install on android', async () => {
    const install = jest.fn()
    mockUseInstallPrompt.mockReturnValue({
      eligible: true,
      platform: 'android',
      install,
      dismiss: jest.fn(),
    })

    render(<InstallPromptBanner />)
    await userEvent.click(screen.getByRole('button', { name: 'Install' }))

    expect(install).toHaveBeenCalledTimes(1)
  })

  it('shows instructions instead of an Install button on iOS', () => {
    mockUseInstallPrompt.mockReturnValue({
      eligible: true,
      platform: 'ios',
      install: jest.fn(),
      dismiss: jest.fn(),
    })

    render(<InstallPromptBanner />)

    expect(screen.getByText(/Add to Home Screen/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Install' })).not.toBeInTheDocument()
  })

  it('calls dismiss when the dismiss button is clicked', async () => {
    const dismiss = jest.fn()
    mockUseInstallPrompt.mockReturnValue({
      eligible: true,
      platform: 'android',
      install: jest.fn(),
      dismiss,
    })

    render(<InstallPromptBanner />)
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss install prompt' }))

    expect(dismiss).toHaveBeenCalledTimes(1)
  })
})
