/**
 * Tests for the PaymentMethodSelector component.
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { PaymentMethodSelector } from '../payment-method-selector'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderSelector(
  props: Partial<React.ComponentProps<typeof PaymentMethodSelector>> = {}
) {
  const onSelect = jest.fn()
  const onMobileMoneyDetails = jest.fn()
  render(
    <PaymentMethodSelector
      selected="card"
      onSelect={onSelect}
      onMobileMoneyDetails={onMobileMoneyDetails}
      {...props}
    />
  )
  return { onSelect, onMobileMoneyDetails }
}

// ---------------------------------------------------------------------------
// Static methods always present
// ---------------------------------------------------------------------------

describe('PaymentMethodSelector — static methods', () => {
  it('renders Card Payment, Bank Transfer, and Aframp Wallet', () => {
    renderSelector()
    expect(screen.getByText('Card Payment')).toBeInTheDocument()
    expect(screen.getByText('Bank Transfer')).toBeInTheDocument()
    expect(screen.getByText('Aframp Wallet')).toBeInTheDocument()
  })

  it('calls onSelect with the correct method when a static option is clicked', () => {
    const { onSelect } = renderSelector({ selected: 'card' })
    fireEvent.click(screen.getByText('Bank Transfer'))
    expect(onSelect).toHaveBeenCalledWith('bank_transfer')
  })
})

// ---------------------------------------------------------------------------
// Regional filtering
// ---------------------------------------------------------------------------

describe('PaymentMethodSelector — regional filtering', () => {
  it('shows M-Pesa only for Kenya (KE)', () => {
    renderSelector({ countryCode: 'KE' })
    expect(screen.getByText('M-Pesa')).toBeInTheDocument()
    expect(screen.queryByText('MTN MoMo')).not.toBeInTheDocument()
  })

  it('shows both M-Pesa and MTN MoMo for Ghana (GH)', () => {
    renderSelector({ countryCode: 'GH' })
    const mpesaItems = screen.getAllByText('M-Pesa')
    expect(mpesaItems.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('MTN MoMo')).toBeInTheDocument()
  })

  it('shows both M-Pesa and MTN MoMo for Uganda (UG)', () => {
    renderSelector({ countryCode: 'UG' })
    const mpesaItems = screen.getAllByText('M-Pesa')
    expect(mpesaItems.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('MTN MoMo')).toBeInTheDocument()
  })

  it('shows the "Not available in your region" placeholder for unsupported countries', () => {
    renderSelector({ countryCode: 'US' })
    expect(screen.getByText('Not available in your region')).toBeInTheDocument()
    expect(screen.queryByText('M-Pesa')).not.toBeInTheDocument()
    expect(screen.queryByText('MTN MoMo')).not.toBeInTheDocument()
  })

  it('shows no mobile money options when countryCode is not provided', () => {
    renderSelector({ countryCode: undefined })
    expect(screen.queryByText('M-Pesa')).not.toBeInTheDocument()
    expect(screen.queryByText('MTN MoMo')).not.toBeInTheDocument()
    expect(screen.queryByText('Not available in your region')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Phone input appears on selection
// ---------------------------------------------------------------------------

describe('PaymentMethodSelector — phone input', () => {
  it('shows phone input when M-Pesa is selected', () => {
    renderSelector({ countryCode: 'KE', selected: 'mpesa' })
    expect(screen.getByRole('textbox', { name: /mobile number/i })).toBeInTheDocument()
  })

  it('shows phone input when MTN MoMo is selected', () => {
    renderSelector({ countryCode: 'GH', selected: 'mtn_momo' })
    expect(screen.getByRole('textbox', { name: /mobile number/i })).toBeInTheDocument()
  })

  it('does not show phone input when a static method is selected', () => {
    renderSelector({ countryCode: 'KE', selected: 'card' })
    expect(screen.queryByRole('textbox', { name: /mobile number/i })).not.toBeInTheDocument()
  })

  it('calls onMobileMoneyDetails with null when phone is invalid', () => {
    const { onMobileMoneyDetails } = renderSelector({
      countryCode: 'KE',
      selected: 'mpesa',
    })
    const input = screen.getByRole('textbox', { name: /mobile number/i })
    fireEvent.change(input, { target: { value: '0712' } }) // too short
    expect(onMobileMoneyDetails).toHaveBeenCalledWith(null)
  })

  it('calls onMobileMoneyDetails with details when phone is valid E.164', () => {
    const { onMobileMoneyDetails } = renderSelector({
      countryCode: 'KE',
      selected: 'mpesa',
    })
    const input = screen.getByRole('textbox', { name: /mobile number/i })
    fireEvent.change(input, { target: { value: '+254712345678' } })
    expect(onMobileMoneyDetails).toHaveBeenCalledWith({
      provider: 'mpesa',
      phoneNumber: '+254712345678',
    })
  })

  it('shows a validation error message for an invalid phone number', () => {
    renderSelector({ countryCode: 'KE', selected: 'mpesa' })
    const input = screen.getByRole('textbox', { name: /mobile number/i })
    fireEvent.change(input, { target: { value: 'not-a-number' } })
    expect(screen.getByText(/E\.164 format/i)).toBeInTheDocument()
  })
})
