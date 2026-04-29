'use client'

import { useState } from 'react'
import { Copy, Check, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface VirtualAccountDetails {
  bankName: string
  accountNumber: string
  accountName: string
  amount: string
  amountRaw: number
  reference: string
  currency: string
}

interface VirtualAccountDisplayProps {
  account: VirtualAccountDetails
}

export function VirtualAccountDisplay({ account }: VirtualAccountDisplayProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const fields = [
    { label: 'Bank', value: account.bankName, copyable: false },
    {
      label: 'Account Number',
      value: account.accountNumber,
      copyable: true,
      field: 'accountNumber',
    },
    { label: 'Account Name', value: account.accountName, copyable: true, field: 'accountName' },
    { label: 'Amount', value: account.amount, copyable: true, field: 'amount', highlight: true },
    { label: 'Reference', value: account.reference, copyable: true, field: 'reference' },
  ]

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-4">
        <div className="rounded-full bg-primary/10 p-2">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Virtual Account Details</h3>
          <p className="text-sm text-muted-foreground">
            Transfer to this account to complete your order
          </p>
        </div>
      </div>

      <div className="divide-y divide-border rounded-lg border bg-card">
        {fields.map((field) => (
          <div
            key={field.label}
            className={cn(
              'flex items-center justify-between p-4',
              field.highlight && 'bg-primary/5'
            )}
          >
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{field.label}</p>
              <p className={cn('font-medium', field.highlight && 'text-lg text-primary')}>
                {field.value}
              </p>
            </div>
            {field.copyable && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => copyToClipboard(field.value, field.field!)}
                className="shrink-0"
              >
                {copiedField === field.field ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span className="sr-only">Copy {field.label}</span>
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
