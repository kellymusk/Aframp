/**
 * Tests for the offramp bank details form.
 *
 * The point of these is the per-country behaviour: the form used to assume a
 * Nigerian NUBAN and a naira payout, so each case here checks something that
 * would have been wrong for a non-Nigerian customer.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { BankAccountForm } from '../bank-account-form'
import { NIGERIAN_BANKS } from '@/lib/offramp/bank-directory'
import type { BankListResult } from '@/lib/offramp/bank-service'

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

// jsdom ships neither of these, and the bank picker (cmdk inside a Radix
// popover) reaches for both as soon as it opens.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
Element.prototype.scrollIntoView = jest.fn()

/** Bank lists keyed by the country query the form asks for. */
const bankLists: Record<string, BankListResult> = {
  NG: { country: 'NG', currency: 'NGN', source: 'static', banks: NIGERIAN_BANKS },
  GH: {
    country: 'GH',
    currency: 'GHS',
    source: 'paystack',
    banks: [
      { id: 'gh-130100', name: 'Ecobank Ghana', code: '130100', type: 'bank', country: 'GH' },
    ],
  },
  KE: {
    country: 'KE',
    currency: 'KES',
    source: 'paystack',
    banks: [{ id: 'ke-68', name: 'Equity Bank Kenya', code: '68', type: 'bank', country: 'KE' }],
  },
  // Uganda has no bank directory — the form must fall back to a typed bank name.
  UG: { country: 'UG', currency: 'UGX', source: 'unavailable', banks: [] },
}

let resolvedName: string | null = 'CHUKWUEMEKA OKAFOR'

beforeEach(() => {
  localStorage.clear()
  resolvedName = 'CHUKWUEMEKA OKAFOR'

  global.fetch = jest.fn((input: RequestInfo | URL) => {
    const url = String(input)

    if (url.startsWith('/api/offramp/banks')) {
      const country = new URL(url, 'http://localhost').searchParams.get('country') ?? 'NG'
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(bankLists[country]),
      })
    }

    if (url.startsWith('/api/offramp/resolve-account')) {
      if (resolvedName === null) {
        return Promise.resolve({
          ok: false,
          status: 422,
          json: () => Promise.resolve({ error: 'RESOLUTION_UNSUPPORTED' }),
        })
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ accountName: resolvedName }),
      })
    }

    return Promise.reject(new Error(`unexpected fetch: ${url}`))
  }) as unknown as typeof fetch
})

function renderForm(props: Partial<React.ComponentProps<typeof BankAccountForm>> = {}) {
  const onVerified = jest.fn()
  render(<BankAccountForm onVerified={onVerified} {...props} />)
  return { onVerified }
}

const countrySelect = () => screen.getByLabelText('Payout country')
const accountInput = () => screen.getByLabelText(/Account Number/i)

/**
 * The bank picker's trigger. Both it and the country select expose role
 * combobox, so pick out the button.
 */
const bankTriggers = () => screen.queryAllByRole('combobox').filter((el) => el.tagName === 'BUTTON')

const bankTrigger = () => bankTriggers()[0]

/** Opens the bank popover and picks a bank by name. */
async function chooseBank(name: string) {
  await waitFor(() => expect(bankTrigger()).toBeEnabled())
  fireEvent.click(bankTrigger())
  fireEvent.click(await screen.findByText(name))
}

async function selectCountry(code: string) {
  fireEvent.change(countrySelect(), { target: { value: code } })
  await settle()
}

/** Waits for the mount-time bank list fetch to land. */
async function settle() {
  await waitFor(() => expect(screen.queryByText(/Loading .* banks/)).not.toBeInTheDocument())
}

describe('country selection', () => {
  it('offers every supported payout country', async () => {
    renderForm()
    const options = Array.from(countrySelect().querySelectorAll('option')).map((o) => o.value)
    expect(options).toEqual(['NG', 'GH', 'KE', 'ZA', 'UG'])
    await settle()
  })

  it('opens on the country matching the currency the withdrawal was priced in', async () => {
    renderForm({ defaultCountry: 'GH' })
    expect(countrySelect()).toHaveValue('GH')
    expect(screen.getByText(/paid out in GHS/)).toBeInTheDocument()
    await settle()
  })

  it('loads the bank list for the selected country', async () => {
    renderForm()
    await chooseBank('Access Bank')
    expect(bankTrigger()).toHaveTextContent('Access Bank')

    await selectCountry('KE')
    // The Nigerian selection is cleared and the Kenyan list takes its place.
    expect(bankTrigger()).not.toHaveTextContent('Access Bank')
    await chooseBank('Equity Bank Kenya')
    expect(bankTrigger()).toHaveTextContent('Equity Bank Kenya')
  })

  it('warns when the chosen country does not settle in the quoted currency', async () => {
    renderForm({ defaultCountry: 'NG', orderCurrency: 'NGN' })
    expect(screen.queryByText(/priced in/)).not.toBeInTheDocument()

    await selectCountry('KE')
    expect(screen.getByText(/priced in NGN/)).toBeInTheDocument()
  })
})

describe('account number validation', () => {
  it('requires exactly 10 digits in Nigeria', async () => {
    renderForm({ defaultCountry: 'NG' })
    await chooseBank('Access Bank')

    fireEvent.change(accountInput(), { target: { value: '012345678' } })
    expect(screen.getByRole('button', { name: /Verify Account/i })).toBeDisabled()

    fireEvent.change(accountInput(), { target: { value: '0123456789' } })
    expect(screen.getByRole('button', { name: /Verify Account/i })).toBeEnabled()
  })

  it('accepts a longer Ghanaian account number that a NUBAN field would reject', async () => {
    renderForm({ defaultCountry: 'GH' })
    await chooseBank('Ecobank Ghana')

    fireEvent.change(accountInput(), { target: { value: '1234567890123' } })
    expect(accountInput()).toHaveValue('1234567890123')
    expect(screen.getByRole('button', { name: /Verify Account/i })).toBeEnabled()
  })

  it('strips characters the country format does not allow', async () => {
    renderForm({ defaultCountry: 'NG' })
    fireEvent.change(accountInput(), { target: { value: '01-23 45a678 9' } })
    expect(accountInput()).toHaveValue('0123456789')

    // Kenya permits letters, so they survive — upper-cased.
    await selectCountry('KE')
    fireEvent.change(accountInput(), { target: { value: 'ke-12345' } })
    expect(accountInput()).toHaveValue('KE12345')
  })

  it('shows the country-specific error on blur', async () => {
    renderForm({ defaultCountry: 'NG' })
    fireEvent.change(accountInput(), { target: { value: '12345' } })
    fireEvent.blur(accountInput())
    expect(screen.getByText('Nigeria account numbers are 10 digits.')).toBeInTheDocument()
    await settle()
  })
})

describe('account holder name', () => {
  it('resolves and confirms the name where the gateway supports it', async () => {
    const { onVerified } = renderForm({ defaultCountry: 'NG' })
    await chooseBank('Access Bank')
    fireEvent.change(accountInput(), { target: { value: '0123456789' } })

    fireEvent.click(screen.getByRole('button', { name: /Verify Account/i }))
    await waitFor(() => expect(screen.getByText('CHUKWUEMEKA OKAFOR')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /Yes, Continue/i }))
    expect(onVerified).toHaveBeenCalledWith(
      expect.objectContaining({
        country: 'NG',
        currency: 'NGN',
        bankCode: '044',
        accountName: 'CHUKWUEMEKA OKAFOR',
        accountNameSource: 'resolved',
      })
    )
  })

  it('asks the customer to type the name where no lookup exists', async () => {
    const { onVerified } = renderForm({ defaultCountry: 'KE' })
    await chooseBank('Equity Bank Kenya')
    fireEvent.change(accountInput(), { target: { value: '01234567890' } })

    // No verify step at all — Paystack cannot resolve Kenyan accounts.
    expect(screen.queryByRole('button', { name: /Verify Account/i })).not.toBeInTheDocument()
    expect(
      screen.getByText(/can't automatically verify account names in Kenya/)
    ).toBeInTheDocument()

    const confirm = screen.getByRole('button', { name: /Confirm Account Details/i })
    expect(confirm).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Account Holder Name'), {
      target: { value: 'ASHA WANJIKU' },
    })
    fireEvent.click(confirm)

    expect(onVerified).toHaveBeenCalledWith(
      expect.objectContaining({
        country: 'KE',
        currency: 'KES',
        accountName: 'ASHA WANJIKU',
        accountNameSource: 'manual',
      })
    )
  })

  it('falls back to typing the name when the gateway reports no lookup', async () => {
    resolvedName = null
    renderForm({ defaultCountry: 'NG' })
    await chooseBank('Access Bank')
    fireEvent.change(accountInput(), { target: { value: '0123456789' } })

    fireEvent.click(screen.getByRole('button', { name: /Verify Account/i }))
    await waitFor(() => expect(screen.getByLabelText('Account Holder Name')).toBeInTheDocument())
  })
})

describe('countries with no bank directory', () => {
  it('asks for the bank name instead of showing a guessed list', async () => {
    const { onVerified } = renderForm({ defaultCountry: 'UG' })
    await waitFor(() => expect(screen.getByLabelText('Bank Name')).toBeInTheDocument())
    // No picker at all, rather than a picker backed by codes we guessed.
    expect(bankTriggers()).toHaveLength(0)
    expect(screen.getByText(/don't have a verified bank list for Uganda/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Bank Name'), { target: { value: 'Stanbic Bank' } })
    fireEvent.change(accountInput(), { target: { value: '1234567890123' } })
    fireEvent.change(screen.getByLabelText('Account Holder Name'), {
      target: { value: 'OKELLO MOSES' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Confirm Account Details/i }))

    expect(onVerified).toHaveBeenCalledWith(
      expect.objectContaining({
        country: 'UG',
        currency: 'UGX',
        bankName: 'Stanbic Bank',
        bankCode: '',
      })
    )
  })
})
