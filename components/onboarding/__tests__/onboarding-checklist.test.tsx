import { render, screen } from '@testing-library/react'
import { OnboardingChecklist } from '../onboarding-checklist'

describe('OnboardingChecklist', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  it('renders the merchant onboarding steps when the wallet has not been created yet', () => {
    render(<OnboardingChecklist />)

    expect(screen.getByText('Get started with your first Aframp wallet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Create wallet/i })).toHaveAttribute('href', '/wallet-setup')
    expect(screen.getByRole('link', { name: /Create first charge/i })).toHaveAttribute('href', '/bills')
    expect(screen.getByRole('link', { name: /Receive first payment/i })).toHaveAttribute('href', '/receive')
    expect(screen.getByRole('link', { name: /Cash out/i })).toHaveAttribute('href', '/offramp')
  })

  it('hides the checklist when the wallet has already been created', () => {
    window.sessionStorage.setItem('walletAddress', 'GAXYZABC123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789ABCDEFG')

    render(<OnboardingChecklist />)

    expect(screen.queryByText('Get started with your first Aframp wallet')).not.toBeInTheDocument()
  })

  it('hides the checklist when all steps are marked complete', () => {
    window.localStorage.setItem(
      'aframp-merchant-checklist',
      JSON.stringify({ wallet: true, charge: true, payment: true, cashout: true })
    )

    render(<OnboardingChecklist />)

    expect(screen.queryByText('Get started with your first Aframp wallet')).not.toBeInTheDocument()
  })
})
