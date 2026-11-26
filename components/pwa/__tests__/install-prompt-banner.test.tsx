import { render, screen, fireEvent } from '@testing-library/react'
import { InstallPromptBanner } from '../install-prompt-banner'
import { useInstallPrompt } from '@/hooks/use-install-prompt'

jest.mock('@/hooks/use-install-prompt')
const mocked = useInstallPrompt as jest.Mock

it('renders nothing when install is unavailable', () => {
  mocked.mockReturnValue({ canInstall: false, install: jest.fn(), dismiss: jest.fn() })
  const { container } = render(<InstallPromptBanner />)
  expect(container).toBeEmptyDOMElement()
})

it('wires Install and Dismiss buttons', () => {
  const install = jest.fn()
  const dismiss = jest.fn()
  mocked.mockReturnValue({ canInstall: true, install, dismiss })
  render(<InstallPromptBanner />)
  fireEvent.click(screen.getByRole('button', { name: 'Install' }))
  fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
  expect(install).toHaveBeenCalled()
  expect(dismiss).toHaveBeenCalled()
})
