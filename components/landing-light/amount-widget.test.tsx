import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { AmountWidget } from './amount-widget'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

describe('AmountWidget', () => {
  const replace = jest.fn()

  beforeEach(() => {
    replace.mockReset()
    ;(useRouter as jest.Mock).mockReturnValue({ replace })
  })

  it('continues with the selected payment direction', async () => {
    const user = userEvent.setup()
    render(<AmountWidget />)

    expect(screen.getByRole('button', { name: 'Spend' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Buy' })).toHaveAttribute('aria-pressed', 'false')
    await user.type(screen.getByLabelText('Amount in naira'), '2500')
    await user.click(screen.getByRole('button', { name: 'Continue to spend' }))
    expect(replace).toHaveBeenLastCalledWith('/login?intent=spend')

    await user.click(screen.getByRole('button', { name: 'Buy' }))
    expect(screen.getByRole('button', { name: 'Spend' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Buy' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Continue to buy' }))
    expect(replace).toHaveBeenLastCalledWith('/login?intent=buy')
  })
})
