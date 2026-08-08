import crypto from 'crypto'
import { resolveGateway } from './gateway-config'

export type PaymentGateway = 'paystack' | 'flutterwave'

export interface PaymentGatewayConfig {
  gateway: PaymentGateway
  publicKey: string
  secretKey: string
  encryptionKey?: string
}

export interface PaymentInitiationData {
  email: string
  amount: number
  currency: string
  reference: string
  metadata: {
    billerId: string
    billerName: string
    accountNumber: string
    customerName?: string
    [key: string]: unknown
  }
  callback_url?: string
}

export interface PaymentVerificationResponse {
  success: boolean
  reference: string
  amount: number
  currency: string
  status: 'success' | 'failed' | 'pending'
  paidAt?: string
  gateway: PaymentGateway
  gatewayReference?: string
}

/** Common interface implemented by every payment gateway integration. */
export interface PaymentGatewayService {
  initiatePayment(data: PaymentInitiationData): Promise<{ authorization_url: string; reference: string }>
  verifyPayment(reference: string): Promise<PaymentVerificationResponse>
}

export class PaystackGateway implements PaymentGatewayService {
  constructor(private readonly config: PaymentGatewayConfig) {}

  async initiatePayment(data: PaymentInitiationData) {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: data.email,
        amount: Math.round(data.amount * 100), // Convert to kobo
        currency: data.currency,
        reference: data.reference,
        metadata: data.metadata,
        callback_url: data.callback_url,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to initialize Paystack payment')
    }

    const result = await response.json()
    return {
      authorization_url: result.data.authorization_url,
      reference: result.data.reference,
    }
  }

  async verifyPayment(reference: string): Promise<PaymentVerificationResponse> {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${this.config.secretKey}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to verify Paystack payment')
    }

    const result = await response.json()
    const data = result.data

    return {
      success: data.status === 'success',
      reference: data.reference,
      amount: data.amount / 100, // Convert from kobo
      currency: data.currency,
      status: data.status === 'success' ? 'success' : data.status === 'failed' ? 'failed' : 'pending',
      paidAt: data.paid_at,
      gateway: 'paystack',
      gatewayReference: data.id,
    }
  }
}

export class FlutterwaveGateway implements PaymentGatewayService {
  constructor(private readonly config: PaymentGatewayConfig) {}

  async initiatePayment(data: PaymentInitiationData) {
    const response = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: data.reference,
        amount: data.amount,
        currency: data.currency,
        redirect_url: data.callback_url,
        customer: {
          email: data.email,
        },
        customizations: {
          title: `${data.metadata.billerName} Payment`,
          description: `Payment for ${data.metadata.billerName}`,
        },
        meta: data.metadata,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to initialize Flutterwave payment')
    }

    const result = await response.json()
    return {
      authorization_url: result.data.link,
      reference: data.reference,
    }
  }

  async verifyPayment(reference: string): Promise<PaymentVerificationResponse> {
    const response = await fetch(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${reference}`,
      {
        headers: {
          Authorization: `Bearer ${this.config.secretKey}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error('Failed to verify Flutterwave payment')
    }

    const result = await response.json()
    const data = result.data

    return {
      success: data.status === 'successful',
      reference: data.tx_ref,
      amount: data.amount,
      currency: data.currency,
      status: data.status === 'successful' ? 'success' : data.status === 'failed' ? 'failed' : 'pending',
      paidAt: data.created_at,
      gateway: 'flutterwave',
      gatewayReference: data.id,
    }
  }

  /**
   * Verify a Flutterwave webhook request came from Flutterwave.
   *
   * Flutterwave's documented mechanism sends the dashboard-configured secret
   * hash verbatim in the `verif-hash` header (constant-time string compare).
   * Some integrations instead expect an HMAC-SHA256 signature — computed over
   * the raw request body using the secret hash as key — in a signature
   * header (e.g. `flw-secret-hash`); both are supported here.
   */
  static verifyWebhookSignature(
    rawBody: string,
    headers: { verifHash?: string | null; signature?: string | null },
    secretHash: string
  ): boolean {
    if (!secretHash) return false

    if (headers.verifHash) {
      return timingSafeEqualStrings(headers.verifHash, secretHash)
    }

    if (headers.signature) {
      const expected = crypto.createHmac('sha256', secretHash).update(rawBody).digest('hex')
      return timingSafeEqualStrings(headers.signature, expected)
    }

    return false
  }
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

export function getPaymentGatewayService(
  gateway?: PaymentGateway,
  countryCode?: string
): PaymentGatewayService {
  const resolvedGateway = resolveGateway(gateway, countryCode)

  const config: PaymentGatewayConfig = {
    gateway: resolvedGateway,
    publicKey:
      resolvedGateway === 'paystack'
        ? process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || ''
        : process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || '',
    secretKey:
      resolvedGateway === 'paystack'
        ? process.env.PAYSTACK_SECRET_KEY || ''
        : process.env.FLUTTERWAVE_SECRET_KEY || '',
    encryptionKey: resolvedGateway === 'flutterwave' ? process.env.FLUTTERWAVE_ENCRYPTION_KEY : undefined,
  }

  return resolvedGateway === 'paystack' ? new PaystackGateway(config) : new FlutterwaveGateway(config)
}
