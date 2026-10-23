import { fireEvent, render, screen } from '@testing-library/react'
import { AmountWidget } from '../amount-widget'

const replace = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}))

beforeEach(() => replace.mockReset())

function amountInput() {
  return screen.getByLabelText('Amount in naira')
}

describe('AmountWidget', () => {
  it('starts on Spend with Continue disabled', () => {
    render(<AmountWidget />)
    expect(screen.getByRole('tab', { name: 'Spend' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('button', { name: 'Continue to spend' })).toBeDisabled()
  })

  it('switches tabs and relabels Continue', () => {
    render(<AmountWidget />)
    fireEvent.click(screen.getByRole('tab', { name: 'Buy' }))
    expect(screen.getByRole('tab', { name: 'Buy' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('button', { name: 'Continue to buy' })).toBeInTheDocument()
  })

  it('accepts a valid amount and continues to sign-in', () => {
    render(<AmountWidget />)
    fireEvent.change(amountInput(), { target: { value: '2500.50' } })
    expect(amountInput()).toHaveValue('2500.50')
    expect(amountInput()).toHaveAttribute('aria-invalid', 'false')

    fireEvent.click(screen.getByRole('button', { name: 'Continue to spend' }))
    expect(replace).toHaveBeenCalledWith('/login')
  })

  it('strips invalid characters and extra decimals, and explains why', () => {
    render(<AmountWidget />)
    fireEvent.change(amountInput(), { target: { value: '1e2.345' } })
    expect(amountInput()).toHaveValue('12.34')
    expect(amountInput()).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent(/numbers only/i)
  })

  it('keeps Continue disabled for zero', () => {
    render(<AmountWidget />)
    fireEvent.change(amountInput(), { target: { value: '0' } })
    expect(screen.getByRole('button', { name: 'Continue to spend' })).toBeDisabled()
  })
})
