import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { verifyAccountNumber, saveAccount } from '@/lib/offramp/bank-service'
import { useOfframpForm } from '@/hooks/use-offramp-form'
import { BankAccountForm } from '../bank-account-form'
import type { OfframpAssetOption } from '@/types/offramp'

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}))

jest.mock('@/lib/offramp/bank-service', () => ({
  verifyAccountNumber: jest.fn(),
  checkRateLimit: jest.fn(() => true),
  saveAccount: jest.fn(),
}))

jest.mock('../bank-select', () => ({
  BankSelect: ({
    onSelect,
    disabled,
  }: {
    onSelect: (bank: { code: string; name: string }) => void
    disabled?: boolean
  }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect({ code: '001', name: 'Test Bank' })}
    >
      Choose Test Bank
    </button>
  ),
}))

const assetOptions: OfframpAssetOption[] = [
  {
    id: 'usdc-stellar',
    asset: 'USDC',
    chain: 'Stellar',
    label: 'USDC',
    balance: 25,
    icon: 'coin',
  },
]

beforeEach(() => {
  jest.clearAllMocks()
  localStorage.clear()
})

async function renderOfframpForm() {
  const hook = renderHook(() => useOfframpForm(assetOptions, 1))
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
  return hook
}

describe('offramp form', () => {
  it('reports when the entered amount is below the selected currency minimum', async () => {
    jest.useFakeTimers()
    try {
      const { result } = await renderOfframpForm()
      act(() => result.current.setAmountInput('1'))

      await act(async () => {
        await jest.advanceTimersByTimeAsync(250)
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(result.current.errors.amount).toBe('Minimum withdrawal is 5,000.')
    } finally {
      jest.useRealTimers()
    }
  })

  it('fills the amount with the selected asset balance when Max is used', async () => {
    const { result } = await renderOfframpForm()

    act(() => result.current.setMaxAmount())

    expect(result.current.state.amountInput).toBe('25')
  })
})

describe('bank account verification', () => {
  it('keeps verification disabled until a 10-digit account number is entered', () => {
    render(<BankAccountForm onVerified={jest.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Choose Test Bank' }))

    const accountNumber = screen.getByLabelText(/account number/i)
    const verifyButton = screen.getByRole('button', { name: 'Verify Account' })

    fireEvent.change(accountNumber, { target: { value: '123456789' } })
    expect(verifyButton).toBeDisabled()

    fireEvent.change(accountNumber, { target: { value: '1234567890' } })
    expect(verifyButton).toBeEnabled()
  })

  it('shows an error toast when backend account verification fails', async () => {
    ;(verifyAccountNumber as jest.Mock).mockRejectedValueOnce(new Error('Service unavailable'))
    render(<BankAccountForm onVerified={jest.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Choose Test Bank' }))
    fireEvent.change(screen.getByLabelText(/account number/i), {
      target: { value: '1234567890' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Verify Account' }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Verification failed. Please check the details and try again.'
      )
    })
  })

  it('continues after successful verification and saves the confirmed account', async () => {
    const account = { id: 'account-1', bankName: 'Test Bank' }
    ;(verifyAccountNumber as jest.Mock).mockResolvedValueOnce('Ada Lovelace')
    ;(saveAccount as jest.Mock).mockReturnValueOnce(account)
    const onVerified = jest.fn()
    render(<BankAccountForm onVerified={onVerified} />)
    fireEvent.click(screen.getByRole('button', { name: 'Choose Test Bank' }))
    fireEvent.change(screen.getByLabelText(/account number/i), {
      target: { value: '1234567890' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Verify Account' }))

    await screen.findByText('Ada Lovelace')
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Continue' }))

    expect(saveAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        bankName: 'Test Bank',
        bankCode: '001',
        accountNumber: '1234567890',
        accountName: 'Ada Lovelace',
      })
    )
    expect(onVerified).toHaveBeenCalledWith(account)
  })
})
