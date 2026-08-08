export type TransferNetwork = 'PUBLIC' | 'TESTNET' | 'FUTURENET'

export interface TransferQrPayload {
  recipient: string
  amount?: string
  asset?: string
  network?: TransferNetwork
}

const DEFAULT_SEND_PATH = '/send'
const FALLBACK_ORIGIN = 'https://aframp.io'

function normalizeOrigin(origin?: string) {
  if (!origin) return FALLBACK_ORIGIN
  return origin.endsWith('/') ? origin.slice(0, -1) : origin
}

export function buildTransferQrUrl(origin: string | undefined, payload: TransferQrPayload) {
  const baseUrl = normalizeOrigin(origin)
  const url = new URL(DEFAULT_SEND_PATH, baseUrl)
  url.searchParams.set('recipient', payload.recipient)

  if (payload.amount) url.searchParams.set('amount', payload.amount)
  if (payload.asset) url.searchParams.set('asset', payload.asset)
  if (payload.network) url.searchParams.set('network', payload.network)

  return url.toString()
}

export function parseTransferQrValue(value: string): TransferQrPayload | null {
  const input = value.trim()
  if (!input) return null

  const extractFromUrl = (raw: string) => {
    const url = new URL(raw, FALLBACK_ORIGIN)
    const recipient = url.searchParams.get('recipient') ?? url.searchParams.get('address')

    if (!recipient) return null

    const payload: TransferQrPayload = { recipient }
    const amount = url.searchParams.get('amount')
    const asset = url.searchParams.get('asset')
    const network = url.searchParams.get('network')

    if (amount) payload.amount = amount
    if (asset) payload.asset = asset
    if (network === 'PUBLIC' || network === 'TESTNET' || network === 'FUTURENET') {
      payload.network = network
    }

    return payload
  }

  try {
    const url = new URL(input, FALLBACK_ORIGIN)
    const looksLikeUrl =
      input.startsWith('http://') ||
      input.startsWith('https://') ||
      input.startsWith('aframp://') ||
      url.pathname === DEFAULT_SEND_PATH

    if (looksLikeUrl) {
      const payload = extractFromUrl(url.toString())
      if (payload) return payload
    }
  } catch {
    // fall through to raw address parsing
  }

  if (/^G[A-Z2-7]{55}$/.test(input)) {
    return { recipient: input }
  }

  const queryLike = input.includes('recipient=') || input.includes('address=')
  if (queryLike) {
    const params = new URLSearchParams(input.replace(/^[?#]/, ''))
    const recipient = params.get('recipient') ?? params.get('address')
    if (!recipient) return null

    const payload: TransferQrPayload = { recipient }
    const amount = params.get('amount')
    const asset = params.get('asset')
    const network = params.get('network')

    if (amount) payload.amount = amount
    if (asset) payload.asset = asset
    if (network === 'PUBLIC' || network === 'TESTNET' || network === 'FUTURENET') {
      payload.network = network
    }

    return payload
  }

  return null
}
