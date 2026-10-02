import { render, screen } from '@testing-library/react'
import { OnboardingChecklist, type OnboardingProgress } from '../onboarding-checklist'

const none: OnboardingProgress = { wallet: false, charge: false, payment: false, cashout: false }

describe('OnboardingChecklist', () => {
  it('lists every step with a link to the page that completes it', () => {
    render(<OnboardingChecklist progress={none} />)

    expect(screen.getByRole('link', { name: 'Set up your wallet' })).toHaveAttribute(
      'href',
      '/wallet'
    )
    expect(screen.getByRole('link', { name: 'Create your first charge' })).toHaveAttribute(
      'href',
      '/charge'
    )
    expect(screen.getByRole('link', { name: 'Receive your first payment' })).toHaveAttribute(
      'href',
      '/transactions'
    )
    expect(screen.getByRole('link', { name: 'Cash out to your bank' })).toHaveAttribute(
      'href',
      '/withdraw'
    )
    expect(screen.getByText('0 of 4 done')).toBeInTheDocument()
  })

  it('ticks off the steps the merchant has actually done', () => {
    render(<OnboardingChecklist progress={{ ...none, wallet: true, charge: true }} />)

    expect(screen.getByRole('link', { name: 'Set up your wallet (done)' })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Create your first charge (done)' })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Receive your first payment' })).toBeInTheDocument()
    expect(screen.getByText('2 of 4 done')).toBeInTheDocument()
  })

  it('is hidden once every step is done', () => {
    const { container } = render(
      <OnboardingChecklist
        progress={{ wallet: true, charge: true, payment: true, cashout: true }}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })
})
