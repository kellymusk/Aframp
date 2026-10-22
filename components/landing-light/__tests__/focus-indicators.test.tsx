import { render, screen } from '@testing-library/react'

import { Pricing } from '../pricing'
import { AmountWidget } from '../amount-widget'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}))

// #474: elements that suppress the default outline (`outline-none`) must pair
// it with a `focus-visible:` alternative, or keyboard users lose all focus
// feedback on them.
describe('focus-visible indicators on landing inputs (#474)', () => {
  it('the pricing country select pairs outline-none with a focus-visible ring', () => {
    render(<Pricing />)

    const select = screen.getByLabelText('Country')
    expect(select.className).toMatch(/\boutline-none\b/)
    expect(select.className).toMatch(/focus-visible:ring/)
  })

  it('the amount widget input pairs outline-none with a focus-visible ring', () => {
    render(<AmountWidget />)

    const input = screen.getByLabelText('Amount in naira')
    expect(input.className).toMatch(/\boutline-none\b/)
    expect(input.className).toMatch(/focus-visible:ring/)
  })
})
