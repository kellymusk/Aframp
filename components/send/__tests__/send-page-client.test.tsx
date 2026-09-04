import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SendPageClient } from '../send-page-client'
import { useRouter } from 'next/navigation'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

describe('SendPageClient', () => {
  const mockPush = jest.fn()
  const mockBack = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      back: mockBack,
    })
  })

  it('keeps the amount display above the keypad on short screens', () => {
    render(<SendPageClient />)

    fireEvent.change(screen.getByPlaceholderText('G... or @username'), {
      target: { value: 'GABCDEF123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    const amountDisplay = screen.getByText('0', { selector: 'span' }).parentElement?.parentElement
    const keypad = screen.getByRole('button', { name: '1' }).parentElement

    expect(amountDisplay).toHaveClass('flex-1')
    expect(amountDisplay).toHaveClass('shrink-0')
    expect(keypad).toHaveClass('mt-auto')
  })
})
