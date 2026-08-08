'use client'

import * as React from 'react'
import { ShieldCheck, Info, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { BankSelect } from './bank-select'
import { CountrySelect } from './country-select'
import {
  Bank,
  BankAccount,
  BankListResult,
  ResolutionUnsupportedError,
  checkRateLimit,
  fetchBanks,
  saveAccount,
  verifyAccountNumber,
} from '@/lib/offramp/bank-service'
import {
  DEFAULT_OFFRAMP_COUNTRY,
  OFFRAMP_COUNTRIES,
  sanitizeAccountNumber,
  validateAccountNumber,
  type OfframpCountryCode,
} from '@/lib/offramp/countries'
import type { FiatCurrency } from '@/types/onramp'
import { toast } from 'sonner'

interface BankAccountFormProps {
  onVerified: (details: BankAccount) => void
  /** Country to open on — normally derived from the currency picked on the calculator. */
  defaultCountry?: OfframpCountryCode
  /** Payout currency of the pending order, used to warn on a country mismatch. */
  orderCurrency?: FiatCurrency
}

/**
 * How the account holder's name is established.
 *
 * `resolve` — the gateway looks it up from the account number, and the customer
 *             confirms what comes back.
 * `manual`  — no lookup exists for this market, so the customer types it.  Also
 *             where a country that normally resolves lands when the gateway
 *             reports the lookup unavailable, rather than blocking the payout.
 */
type NameMode = 'resolve' | 'manual'

export function BankAccountForm({
  onVerified,
  defaultCountry = DEFAULT_OFFRAMP_COUNTRY,
  orderCurrency,
}: BankAccountFormProps) {
  const [countryCode, setCountryCode] = React.useState<OfframpCountryCode>(defaultCountry)
  const [bankList, setBankList] = React.useState<BankListResult | null>(null)
  const [isLoadingBanks, setIsLoadingBanks] = React.useState(true)
  const [selectedBank, setSelectedBank] = React.useState<Bank | null>(null)
  const [manualBankName, setManualBankName] = React.useState('')
  const [accountNumber, setAccountNumber] = React.useState('')
  const [accountError, setAccountError] = React.useState<string | null>(null)
  const [isVerifying, setIsVerifying] = React.useState(false)
  const [verifiedName, setVerifiedName] = React.useState<string | null>(null)
  const [manualName, setManualName] = React.useState('')

  const country = OFFRAMP_COUNTRIES[countryCode]
  const [nameMode, setNameMode] = React.useState<NameMode>(
    country.supportsNameResolution ? 'resolve' : 'manual'
  )

  // The bank list is a country-level directory, so a country change invalidates
  // everything below it: the bank, the account number format and the name.
  React.useEffect(() => {
    let active = true
    setIsLoadingBanks(true)
    setBankList(null)
    setSelectedBank(null)
    setManualBankName('')
    setAccountNumber('')
    setAccountError(null)
    setVerifiedName(null)
    setManualName('')
    setNameMode(OFFRAMP_COUNTRIES[countryCode].supportsNameResolution ? 'resolve' : 'manual')

    fetchBanks(countryCode)
      .then((result) => {
        if (!active) return
        setBankList(result)
      })
      .finally(() => {
        if (active) setIsLoadingBanks(false)
      })

    return () => {
      active = false
    }
  }, [countryCode])

  const banks = bankList?.banks ?? []
  // No directory for this market, so the bank name is typed. Applies to Uganda
  // by design, and to any country whose directory fetch came back empty.
  const usesManualBank = !isLoadingBanks && banks.length === 0
  const bankName = usesManualBank ? manualBankName.trim() : (selectedBank?.name ?? '')
  const bankCode = usesManualBank ? '' : (selectedBank?.code ?? '')
  const hasBank = usesManualBank ? manualBankName.trim().length >= 2 : selectedBank !== null

  const accountIsValid = validateAccountNumber(countryCode, accountNumber) === null
  const currencyMismatch = orderCurrency !== undefined && orderCurrency !== country.currency

  const resetName = () => {
    setVerifiedName(null)
    setNameMode(country.supportsNameResolution ? 'resolve' : 'manual')
  }

  const handleAccountNumberChange = (raw: string) => {
    setAccountNumber(sanitizeAccountNumber(countryCode, raw))
    setAccountError(null)
    resetName()
  }

  const handleAccountNumberBlur = () => {
    if (!accountNumber) return
    setAccountError(validateAccountNumber(countryCode, accountNumber))
  }

  const handleVerify = async () => {
    const formatError = validateAccountNumber(countryCode, accountNumber)
    if (formatError || !hasBank) {
      setAccountError(formatError)
      toast.error(formatError ?? 'Select your bank to continue.')
      return
    }

    if (!checkRateLimit()) {
      toast.error('Maximum verification attempts reached. Please try again in an hour.')
      return
    }

    setIsVerifying(true)
    try {
      const name = await verifyAccountNumber(countryCode, bankCode, accountNumber)
      setVerifiedName(name)
      toast.success('Account verified successfully')
    } catch (error) {
      if (error instanceof ResolutionUnsupportedError) {
        // Not a failure the customer caused or can fix — switch to typing the
        // name rather than dead-ending the withdrawal.
        setNameMode('manual')
      } else {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Verification failed. Please check the details and try again.'
        )
      }
    } finally {
      setIsVerifying(false)
    }
  }

  const handleConfirm = () => {
    const accountName = nameMode === 'resolve' ? verifiedName : manualName.trim()
    if (!hasBank || !accountIsValid || !accountName) return

    const account: Omit<BankAccount, 'id'> = {
      country: countryCode,
      currency: country.currency,
      bankName,
      bankCode,
      accountNumber,
      accountName,
      accountNameSource: nameMode === 'resolve' ? 'resolved' : 'manual',
      bankLogo: selectedBank?.logo,
      lastUsed: new Date(),
    }
    onVerified(saveAccount(account))
  }

  const canConfirmManually = hasBank && accountIsValid && manualName.trim().length >= 2

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="country" className="text-sm font-medium text-foreground ml-1">
            Payout Country
          </Label>
          <CountrySelect
            id="country"
            value={countryCode}
            onChange={setCountryCode}
            disabled={isVerifying}
          />
          <p className="text-[11px] text-muted-foreground ml-1">
            You&apos;ll be paid out in {country.currency}.
          </p>
        </div>

        {currencyMismatch && (
          <Alert className="bg-warning/5 border-warning/20 rounded-xl py-3">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-xs text-muted-foreground">
              Your withdrawal was priced in {orderCurrency}, but this account settles in{' '}
              {country.currency}. Go back and change the currency to keep the quoted rate.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="bank" className="text-sm font-medium text-foreground ml-1">
            {usesManualBank ? 'Bank Name' : 'Select Bank'}
          </Label>

          {usesManualBank ? (
            <>
              <Input
                id="bank"
                placeholder={`e.g. Stanbic Bank ${country.name}`}
                value={manualBankName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setManualBankName(e.target.value)
                  resetName()
                }}
                className="h-14 px-4 bg-background border-border hover:border-primary/50 focus:border-primary rounded-xl transition-all duration-200"
                disabled={isVerifying}
              />
              <p className="text-[11px] text-muted-foreground ml-1">
                We don&apos;t have a verified bank list for {country.name} yet, so please type your
                bank&apos;s full name.
              </p>
            </>
          ) : (
            <>
              <BankSelect
                banks={banks}
                country={countryCode}
                value={selectedBank?.code}
                onSelect={(bank) => {
                  setSelectedBank(bank)
                  resetName()
                }}
                disabled={isVerifying}
                isLoading={isLoadingBanks}
              />
              {bankList?.source === 'static' && (
                <p className="text-[11px] text-muted-foreground ml-1">
                  Showing our offline bank list — it may not include every bank.
                </p>
              )}
            </>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="accountNumber" className="text-sm font-medium text-foreground ml-1">
            {country.account.label}
          </Label>
          <div className="relative group">
            <Input
              id="accountNumber"
              inputMode={country.account.allowsLetters ? 'text' : 'numeric'}
              placeholder={country.account.placeholder}
              value={accountNumber}
              aria-invalid={accountError !== null}
              aria-describedby="accountNumberHint"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleAccountNumberChange(e.target.value)
              }
              onBlur={handleAccountNumberBlur}
              className="h-14 px-4 bg-background border-border hover:border-primary/50 focus:border-primary rounded-xl transition-all duration-200"
              disabled={isVerifying}
            />
          </div>
          <p
            id="accountNumberHint"
            className={`text-[11px] ml-1 ${accountError ? 'text-destructive' : 'text-muted-foreground'}`}
          >
            {accountError ?? country.account.hint}
          </p>
        </div>

        {nameMode === 'manual' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accountName" className="text-sm font-medium text-foreground ml-1">
                Account Holder Name
              </Label>
              <Input
                id="accountName"
                placeholder="Name exactly as it appears on the account"
                value={manualName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualName(e.target.value)}
                className="h-14 px-4 bg-background border-border hover:border-primary/50 focus:border-primary rounded-xl transition-all duration-200 uppercase"
              />
            </div>

            <Alert className="bg-warning/5 border-warning/20 rounded-xl py-4">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertTitle className="text-sm font-semibold text-warning">
                Double-check these details
              </AlertTitle>
              <AlertDescription className="mt-1 text-xs text-muted-foreground">
                We can&apos;t automatically verify account names in {country.name}. A transfer sent
                to the wrong account can&apos;t be reversed.
              </AlertDescription>
            </Alert>

            <Button
              className="w-full h-14 rounded-xl text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all bg-primary text-primary-foreground"
              onClick={handleConfirm}
              disabled={!canConfirmManually}
            >
              Confirm Account Details
            </Button>
          </div>
        ) : !verifiedName ? (
          <Button
            className="w-full h-14 rounded-xl text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all bg-primary text-primary-foreground"
            onClick={handleVerify}
            disabled={isVerifying || !accountIsValid || !hasBank}
          >
            {isVerifying ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verifying...
              </div>
            ) : (
              'Verify Account'
            )}
          </Button>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <Alert className="bg-primary/5 border-primary/20 rounded-xl py-4">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <AlertTitle className="text-sm font-semibold text-primary">
                Account Verified
              </AlertTitle>
              <AlertDescription className="mt-1">
                <span className="block text-base font-bold text-foreground uppercase tracking-wide">
                  {verifiedName}
                </span>
                <span className="text-xs text-muted-foreground mt-1 block">
                  Is this your account? Please confirm to proceed.
                </span>
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-xl border-border hover:bg-accent/50 text-foreground"
                onClick={() => setVerifiedName(null)}
              >
                No, Re-enter
              </Button>
              <Button
                className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/10"
                onClick={handleConfirm}
              >
                Yes, Continue
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-accent/30 p-3 rounded-lg">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>Your bank details are encrypted and secure</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
          <div className="flex items-center gap-1">
            <Info className="h-3 w-3" />
            <span>We never store your account passwords</span>
          </div>
          <button className="underline hover:text-foreground">Privacy Policy</button>
        </div>
      </div>
    </div>
  )
}
