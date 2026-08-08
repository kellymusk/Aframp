'use client'

import { useState, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, AlertCircle, CheckCircle2, ChevronRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BillerSchema } from '@/lib/biller-schemas'
import { csrfHeaders } from '@/lib/security/csrf-client'
import {
  PaymentMethod,
  PaymentMethodSelector,
  MobileMoneyPaymentDetails,
} from './payment-method-selector'
import { FeeBreakdown } from './fee-breakdown'
import { QRInvoiceModal } from './qr-invoice-modal'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { generateInvoiceId, type QRInvoiceData } from '@/lib/bills/qr-invoice'
import { useWalletStore } from '@/lib/wallet/walletStore'

interface PaymentFormProps {
  schema: BillerSchema
  /** ISO 3166-1 alpha-2 country code for regional payment method filtering */
  countryCode?: string
}

export function PaymentForm({ schema, countryCode }: PaymentFormProps) {
  const [isValidating, setIsValidating] = useState(false)
  const [validatedAccount, setValidatedAccount] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card')
  const [mobileMoneyDetails, setMobileMoneyDetails] = useState<MobileMoneyPaymentDetails | null>(
    null
  )
  const [isProcessing, setIsProcessing] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [invoice, setInvoice] = useState<QRInvoiceData | null>(null)
  const publicKey = useWalletStore((s) => s.publicKey)

  const formSchemaObject: Record<string, z.ZodTypeAny> = {}
  schema.fields.forEach((field) => {
    let validator: z.ZodString | z.ZodNumber = z.string()
    if (field.validation.required) {
      validator = validator.min(1, field.validation.message || `${field.label} is required`)
    }
    if (field.validation.pattern) {
      validator = (validator as z.ZodString).regex(
        new RegExp(field.validation.pattern),
        field.validation.message
      )
    }
    if (field.validation.min !== undefined) {
      const minValue = field.validation.min
      validator = (validator as z.ZodString).refine((val) => Number(val) >= minValue, {
        message: field.validation.message || `Minimum value is ${minValue}`,
      }) as unknown as z.ZodString
    }
    formSchemaObject[field.name] = validator
  })

  const formSchema = z.object(formSchemaObject)
  type FormValues = z.infer<typeof formSchema>

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
  })

  const watchedValues = useWatch({ control })

  const amountField = schema.fields.find((f) => f.name === 'amount' || f.type === 'number')
  const amountValue = watchedValues[amountField?.name as keyof FormValues] as string
  const parsedAmount = parseFloat(amountValue || '0') || 0

  const primaryFieldName = schema.fields[0]?.name || ''
  const accountValue = (watchedValues[primaryFieldName as keyof FormValues] as string) || ''

  useEffect(() => {
    // Only trigger validation if we have a valid-ish account and no errors
    if (accountValue && accountValue.length >= 10 && !errors[primaryFieldName]) {
      const delayDebounceFn = setTimeout(() => {
        const validate = async () => {
          setIsValidating(true)
          await new Promise((resolve) => setTimeout(resolve, 1500))
          setIsValidating(false)
          const mockNames = ['John Doe', 'Sarah Williams', 'Emeka Azikiwe', 'Kofi Mensah']
          setValidatedAccount(mockNames[Math.floor(Math.random() * mockNames.length)])
        }
        validate()
      }, 1000)

      return () => clearTimeout(delayDebounceFn)
    }

    // Reset state only when the account value is actually cleared/invalid
    if (validatedAccount !== null && (!accountValue || accountValue.length < 10)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValidatedAccount(null)
    }
  }, [accountValue, errors, primaryFieldName, validatedAccount])
  const onSubmit = async (data: FormValues) => {
    setIsProcessing(true)

    try {
      if (paymentMethod === 'mpesa' || paymentMethod === 'mtn_momo') {
        if (!mobileMoneyDetails) {
          toast.error('Please enter a valid mobile number before paying.')
          setIsProcessing(false)
          return
        }

        // Initiate mobile money payment
        const initiateRes = await fetch('/api/payments/mobile-money/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
          body: JSON.stringify({
            provider: mobileMoneyDetails.provider,
            phoneNumber: mobileMoneyDetails.phoneNumber,
            amount: parsedAmount,
            currency: 'KES', // TODO: derive from countryCode
            accountReference: schema.id.slice(0, 12),
            transactionDesc: `Pay ${schema.name}`.slice(0, 13),
            externalId: crypto.randomUUID(),
            kind: 'billpay',
            // Lets AML screening key this payment to the customer's account
            // rather than to their handset alone.  Omitted when no wallet is
            // connected; the route falls back to a hashed MSISDN.
            userId: publicKey ?? undefined,
          }),
        })

        if (!initiateRes.ok) {
          const err = (await initiateRes.json().catch(() => ({}))) as {
            error?: string
            message?: string
          }
          // Prefer `message`: compliance holds return a customer-safe string
          // there, while `error` is a machine code (COMPLIANCE_BLOCKED).
          throw new Error(err.message ?? err.error ?? 'Payment initiation failed')
        }

        const { transactionId, provider } = (await initiateRes.json()) as {
          transactionId: string
          provider: string
        }

        toast.info('Check your phone', {
          description: 'A payment prompt has been sent to your mobile number.',
        })

        // Poll for confirmation (up to ~60 s)
        let confirmed = false
        for (let i = 0; i < 20; i++) {
          await new Promise((r) => setTimeout(r, 3_000))

          const statusRes = await fetch(
            `/api/payments/mobile-money/status/${transactionId}?provider=${provider}`
          )
          const statusData = (await statusRes.json()) as { status: string; error?: string }

          if (statusData.status === 'SUCCESSFUL') {
            confirmed = true
            break
          }
          if (
            statusData.status === 'FAILED' ||
            statusData.status === 'CANCELLED' ||
            statusData.status === 'INSUFFICIENT_FUNDS'
          ) {
            throw new Error(statusData.error ?? `Payment ${statusData.status.toLowerCase()}`)
          }
        }

        if (!confirmed) {
          throw new Error('Payment timed out. Please try again.')
        }
      } else {
        // Existing mock flow for card / bank_transfer / wallet
        await new Promise((resolve) => setTimeout(resolve, 3000))
      }

      toast.success('Payment Successful!', {
        description: `Your payment to ${schema.name} has been processed.`,
      })
    } catch (err) {
      toast.error('Payment failed', {
        description: err instanceof Error ? err.message : 'An unexpected error occurred.',
      })
    } finally {
      setIsProcessing(false)
    }
    await new Promise((resolve) => setTimeout(resolve, 3000))
    setIsProcessing(false)

    const reference = `REF${Date.now()}`
    const fee = schema.feeStructure.baseFee + parsedAmount * (schema.feeStructure.percentageFee / 100)
    const newInvoice: QRInvoiceData = {
      invoiceId: generateInvoiceId(reference),
      biller: schema.name,
      billerCategory: 'Bills',
      accountLabel: validatedAccount ?? (accountValue || 'N/A'),
      amount: parsedAmount,
      currency: 'NGN',
      fee,
      reference,
      createdAt: new Date().toISOString(),
      paymentMethod,
    }
    setInvoice(newInvoice)
    toast.success('Payment Successful!', {
      description: `Your payment to ${schema.name} has been processed.`,
    })
  }

  return (
    <>
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Live region: announces validation status changes to screen readers */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {isValidating && 'Validating account, please wait.'}
        {validatedAccount && `Account verified: ${validatedAccount}`}
      </div>

      <div className="space-y-5">
        {schema.fields.map((field) => {
          const errorId = `${field.id}-error`
          const isPrimaryField = field.id === schema.fields[0]?.id
          return (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={field.id} className="text-sm font-medium">
                {field.label}
              </Label>

              {field.type === 'select' ? (
                <Select
                  onValueChange={(val: string) =>
                    setValue(field.name as unknown as string, val, { shouldValidate: true })
                  }
                >
                  <SelectTrigger
                    id={field.id}
                    aria-labelledby={field.id}
                    aria-describedby={errors[field.name] ? errorId : undefined}
                    aria-invalid={!!errors[field.name]}
                    className="h-12 rounded-2xl bg-muted/30 focus:ring-primary"
                  >
                    <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="relative">
                  <Input
                    id={field.id}
                    type={field.type}
                    placeholder={field.placeholder}
                    aria-describedby={
                      [
                        errors[field.name] ? errorId : null,
                        isPrimaryField && (isValidating || validatedAccount)
                          ? `${field.id}-status`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' ') || undefined
                    }
                    aria-invalid={!!errors[field.name]}
                    className={cn(
                      'h-12 rounded-2xl bg-muted/30 focus:ring-primary',
                      isValidating && isPrimaryField && 'pr-10'
                    )}
                    {...register(field.name as unknown as string)}
                  />
                  {isValidating && isPrimaryField && (
                    <div
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      aria-hidden="true"
                    >
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  )}
                  {validatedAccount && isPrimaryField && (
                    <motion.div
                      id={`${field.id}-status`}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 text-xs flex items-center gap-1.5 text-green-600 font-medium bg-green-50 p-2 rounded-xl"
                      aria-hidden="true"
                    >
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                      Account Verified: {validatedAccount}
                    </motion.div>
                  )}
                </div>
              )}
              {errors[field.name] && (
                <p
                  id={errorId}
                  role="alert"
                  className="text-xs text-destructive flex items-center gap-1 mt-1"
                >
                  <AlertCircle className="w-3 h-3" aria-hidden="true" />
                  {errors[field.name]?.message as string}
                </p>
              )}
            </div>
          )
        })}

        <div className="pt-4">
          <PaymentMethodSelector
            selected={paymentMethod}
            onSelect={setPaymentMethod}
            countryCode={countryCode}
            onMobileMoneyDetails={setMobileMoneyDetails}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-2 bg-muted/20 p-4 rounded-2xl border border-border/50">
            <Checkbox id="saveDetails" className="rounded-lg" />
            <label
              htmlFor="saveDetails"
              className="text-sm font-medium cursor-pointer text-muted-foreground"
            >
              Save details for future payments
            </label>
          </div>

          <div className="space-y-4 border border-border/50 rounded-2xl p-4 bg-muted/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <span id="schedule-label" className="text-sm font-medium text-foreground">
                  Schedule for later
                </span>
              </div>
              <Checkbox
                id="schedule"
                aria-labelledby="schedule-label"
                aria-expanded={showSchedule}
                aria-controls="schedule-date-section"
                checked={showSchedule}
                onCheckedChange={(checked: boolean) => setShowSchedule(!!checked)}
              />
            </div>

            <AnimatePresence>
              {showSchedule && (
                <motion.div
                  id="schedule-date-section"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden pt-2"
                >
                  <Label htmlFor="schedule-date" className="sr-only">
                    Payment date
                  </Label>
                  <Input
                    id="schedule-date"
                    type="date"
                    aria-label="Payment date"
                    className="h-11 rounded-xl bg-card border-border"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {parsedAmount > 0 && (
          <div className="pt-4">
            <FeeBreakdown
              amount={parsedAmount}
              baseFee={schema.feeStructure.baseFee}
              percentageFee={schema.feeStructure.percentageFee}
            />
          </div>
        )}
      </div>

      <Button
        type="submit"
        disabled={
          !isValid || isProcessing || (schema.fields[0].validation.required && !validatedAccount)
        }
        aria-label={isProcessing ? 'Processing payment, please wait' : `Pay now to ${schema.name}`}
        aria-busy={isProcessing}
        className="w-full h-14 rounded-2xl text-lg font-semibold"
      >
        {isProcessing ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            <span aria-hidden="true">Processing...</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span aria-hidden="true">Pay Now</span>
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </div>
        )}
      </Button>
    </form>
    {invoice && <QRInvoiceModal invoice={invoice} onClose={() => setInvoice(null)} />}
  </>
  )
}
