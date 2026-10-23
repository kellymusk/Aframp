import { NextResponse } from 'next/server'

export const revalidate = 86400

// Bundled fallback list so the bank list always loads even when Paystack is down.
const BANKS: { name: string; code: string }[] = [
  { name: 'Access Bank', code: '044' },
  { name: 'Citibank Nigeria', code: '023' },
  { name: 'Ecobank Nigeria', code: '050' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'First Bank of Nigeria', code: '011' },
  { name: 'First City Monument Bank', code: '214' },
  { name: 'Guaranty Trust Bank', code: '058' },
  { name: 'Heritage Bank', code: '030' },
  { name: 'Keystone Bank', code: '082' },
  { name: 'Kuda Bank', code: '50211' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'Providus Bank', code: '101' },
  { name: 'Stanbic IBTC Bank', code: '221' },
  { name: 'Standard Chartered Bank', code: '068' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'Union Bank of Nigeria', code: '032' },
  { name: 'United Bank for Africa', code: '033' },
  { name: 'Unity Bank', code: '215' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Zenith Bank', code: '057' },
]

// Last-good response from Paystack, kept in memory for the lifetime of the server.
let lastGood: { name: string; code: string }[] | null = null

function fallbackResponse() {
  const banks = lastGood && lastGood.length > 0 ? lastGood : BANKS
  return NextResponse.json(
    {
      status: true,
      message: 'Banks retrieved',
      data: banks,
      source: lastGood ? 'cache' : 'fallback',
    },
    { status: 200 }
  )
}

export async function GET() {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (process.env.PAYSTACK_SECRET_KEY) {
      headers['Authorization'] = `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
    }

    const response = await fetch('https://api.paystack.co/bank?country=nigeria', {
      headers,
      next: { revalidate: 86400 },
    })

    if (!response.ok) {
      console.error(`[api/banks] Paystack responded with ${response.status}`)
      return fallbackResponse()
    }

    const data = await response.json()

    // Never cache an empty list: it would replace the bundled fallback.
    if (Array.isArray(data?.data) && data.data.length > 0) {
      lastGood = data.data
    }

    return NextResponse.json({ ...data, source: 'paystack' })
  } catch (error) {
    console.error('[api/banks] Failed to fetch banks from Paystack:', error)
    return fallbackResponse()
  }
}
