import { renderHook, act } from '@testing-library/react'
import { useOnrampForm } from '../use-onramp-form'

describe('useOnrampForm - Form State Persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('persists form state to localStorage', () => {
    const { result } = renderHook(() => useOnrampForm(0.0012, true))

    act(() => {
      result.current.updateFiatCurrency('KES')
      result.current.updateCryptoAsset('USDC')
      result.current.updatePaymentMethod('card')
    })

    const stored = localStorage.getItem('onramp:form-state')
    expect(stored).toBeTruthy()
    const parsed = JSON.parse(stored!)
    expect(parsed.fiatCurrency).toBe('KES')
    expect(parsed.cryptoAsset).toBe('USDC')
    expect(parsed.paymentMethod).toBe('card')
  })

  it('restores form state from localStorage', () => {
    localStorage.setItem(
      'onramp:form-state',
      JSON.stringify({
        fiatCurrency: 'GHS',
        cryptoAsset: 'cKES',
        paymentMethod: 'mobile_money',
        amount: '5000',
      })
    )

    const { result } = renderHook(() => useOnrampForm(0.0012, true))

    expect(result.current.state.fiatCurrency).toBe('GHS')
    expect(result.current.state.cryptoAsset).toBe('cKES')
    expect(result.current.state.paymentMethod).toBe('mobile_money')
  })

  it('validates form completeness', () => {
    const { result } = renderHook(() => useOnrampForm(0.0012, true))

    expect(result.current.isValid).toBe(false)

    act(() => {
      result.current.updateAmount('10000')
    })

    expect(result.current.isValid).toBe(true)
  })
})
