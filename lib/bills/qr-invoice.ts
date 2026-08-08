export interface QRInvoiceData {
  invoiceId: string
  biller: string
  billerCategory: string
  accountLabel: string
  amount: number
  currency: string
  fee: number
  reference: string
  createdAt: string
  paymentMethod: string
}

/** Encode invoice data into a compact base64url string for the QR code. */
export function encodeInvoice(data: QRInvoiceData): string {
  const json = JSON.stringify(data)
  if (typeof window !== 'undefined') {
    return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }
  return Buffer.from(json).toString('base64url')
}

/** Decode a base64url invoice string back to QRInvoiceData. Returns null on failure. */
export function decodeInvoice(encoded: string): QRInvoiceData | null {
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const json = typeof window !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString()
    return JSON.parse(json) as QRInvoiceData
  } catch {
    return null
  }
}

/** Build the shareable invoice URL for a given invoiceId. */
export function buildInvoiceUrl(invoiceId: string): string {
  const base =
    typeof window !== 'undefined'
      ? `${window.location.origin}`
      : process.env.NEXT_PUBLIC_APP_URL ?? ''
  return `${base}/bills/invoice/${invoiceId}`
}

/** Generate a unique invoice ID from a reference string. */
export function generateInvoiceId(reference: string): string {
  return `inv_${reference}_${Date.now()}`
}
