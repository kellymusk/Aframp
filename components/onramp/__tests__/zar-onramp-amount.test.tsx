import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ZarOnramp } from '../zar-onramp'

jest.mock('@/lib/api', () => ({
  api: {
    createOzowPayment: jest.fn(),
  },
}))

describe('ZarOnramp amount validation', () => {
  it('rejects amounts above the configured Ozow maximum', async () => {
    const user = userEvent.setup()
    render(<ZarOnramp token="test-token" />)
    await user.type(screen.getByLabelText('Amount (ZAR)'), '500001')

    expect(screen.getByText('Maximum amount is R500,000.00.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue to ozow/i })).toBeDisabled()
  })
})
