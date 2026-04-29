import { renderHook, act, waitFor } from '@testing-library/react'
import { useOnrampForm } from '../use-onramp-form'

describe('useOnrampForm - Form State Persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('persists form state to localStorage', async () => {
    const { result } = renderHook(() => useOnrampForm(0.0012, true))

    await waitFor(() => expect(result.current.state).toBeDefined())

    act(() => {
      result.current.setFiatCurrency('KES')
      result.current.setCryptoAsset('USDC')
      result.current.setPaymentMethod('card')
    })

    await waitFor(
      () => {
        const stored = localStorage.getItem('onramp:form')
        expect(stored).toBeTruthy()
        const parsed = JSON.parse(stored!)
        expect(parsed.data.fiatCurrency).toBe('KES')
        expect(parsed.data.cryptoAsset).toBe('USDC')
        expect(parsed.data.paymentMethod).toBe('card')
      },
      { timeout: 3000 }
    )
  })

  it('restores form state from localStorage', async () => {
    localStorage.setItem(
      'onramp:form',
      JSON.stringify({
        data: {
          fiatCurrency: 'GHS',
          cryptoAsset: 'cKES',
          paymentMethod: 'mobile_money',
          amountInput: '5000',
        },
        timestamp: Date.now(),
      })
    )

    const { result } = renderHook(() => useOnrampForm(0.0012, true))

    await waitFor(
      () => {
        expect(result.current.state.fiatCurrency).toBe('GHS')
        expect(result.current.state.cryptoAsset).toBe('cKES')
        expect(result.current.state.paymentMethod).toBe('mobile_money')
      },
      { timeout: 3000 }
    )
  })

  it('validates form completeness', async () => {
    const { result } = renderHook(() => useOnrampForm(0.0012, true))

    await waitFor(() => expect(result.current.state).toBeDefined())

    expect(result.current.isValid).toBe(false)

    act(() => {
      result.current.setAmountInput('10000')
    })

    await waitFor(() => {
      expect(result.current.isValid).toBe(true)
    })
  })
})
