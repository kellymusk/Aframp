export interface BillTransaction {
  id: string
  reference: string
  billerId: string
  biller: string
  billerCategory: string
  accountNumber: string
  accountLabel: string
  amount: number
  fee: number
  currency: string
  paymentMethod: string
  status: 'pending' | 'completed' | 'failed'
  gatewayReference?: string
  gateway?: 'paystack' | 'flutterwave'
  createdAt: string
  updatedAt: string
  customerEmail: string
  customerPhone?: string
  customerSupportEmail: string
  timeline: Array<{
    id: string
    label: string
    status: string
    timestamp?: string
  }>
}

export interface BillPaymentFormData {
  billerId: string
  billerName: string
  accountNumber: string
  amount: number
  customerEmail: string
  customerPhone?: string
  paymentMethod: 'card' | 'bank_transfer' | 'ussd' | 'wallet'
  gateway: 'paystack' | 'flutterwave'
  metadata?: Record<string, unknown>
}
