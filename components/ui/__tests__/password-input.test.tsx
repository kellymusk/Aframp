import { fireEvent, render, screen } from '@testing-library/react'
import { PasswordInput } from '../password-input'

describe('PasswordInput', () => {
  it('hides the password until the toggle is pressed', () => {
    render(<PasswordInput aria-label="Password" defaultValue="hunter22" />)
    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('type', 'password')

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(input).toHaveAttribute('type', 'text')

    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(input).toHaveAttribute('type', 'password')
  })
})
