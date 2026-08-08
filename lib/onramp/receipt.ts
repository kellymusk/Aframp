import { OnrampOrder } from '@/types/onramp'

/** Format a number as fiat currency with symbol */
function formatFiat(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    NGN: '₦',
    KES: 'KSh',
    GHS: 'GH₵',
    ZAR: 'R',
    UGX: 'USh',
  }
  const symbol = symbols[currency] || currency
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Format a Unix-timestamp (ms) into a human-readable date+time string */
function formatCompletedAt(timestamp: number): string {
  const d = new Date(timestamp)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[d.getMonth()]
  const day = d.getDate()
  const year = d.getFullYear()
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  const tz = 'WAT' // simplified; Stellar / Africa timezone
  return `${month} ${day}, ${year} at ${hours}:${minutes} ${tz}`
}

/** Calculate human-readable elapsed time from two Unix timestamps (ms) */
function formatTotalTime(createdAt: number, completedAt?: number): string {
  const end = completedAt ?? Date.now()
  const diffMs = Math.max(0, end - createdAt)
  const totalSeconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`
  return `${seconds} second${seconds !== 1 ? 's' : ''}`
}

/** Truncate a transaction hash for display */
function truncateHash(hash?: string): string {
  if (!hash) return 'N/A'
  if (hash.length <= 16) return hash
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`
}

/** Truncate a wallet address for display */
function truncateAddress(addr: string): string {
  if (addr.length <= 16) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`
}

export function generateReceiptPDF(order: OnrampOrder): void {
  const completedAt = order.completedAt ?? order.createdAt
  const explorerUrl = order.transactionHash
    ? `https://stellar.expert/explorer/public/tx/${order.transactionHash}`
    : 'N/A'

  const receiptData = {
    receiptNumber: `RCP-${order.id.slice(-8).toUpperCase()}`,
    date: new Date(completedAt).toLocaleDateString(),
    orderDetails: {
      amount: formatFiat(order.amount, order.fiatCurrency),
      asset: `${order.cryptoAmount} ${order.cryptoAsset}`,
      paymentMethod: order.paymentMethod.replace('_', ' '),
      exchangeRate: `1 ${order.fiatCurrency} = ${order.exchangeRate} ${order.cryptoAsset}`,
      processingFee: order.fees.processingFee === 0 ? 'FREE' : formatFiat(order.fees.processingFee, order.fiatCurrency),
      networkFee: formatFiat(order.fees.networkFee, order.fiatCurrency),
      totalTime: formatTotalTime(order.createdAt, order.completedAt),
      completedAt: formatCompletedAt(completedAt),
    },
    blockchain: {
      transactionHash: truncateHash(order.transactionHash),
      walletAddress: truncateAddress(order.walletAddress),
      network: 'Stellar',
      explorerUrl,
    },
  }

  // Create comprehensive receipt content
  const receiptText = `
═══════════════════════════════════════════════════════════════
                        🌍 AFRAMP RECEIPT
                   Africa's Financial Bridge
═══════════════════════════════════════════════════════════════

Receipt Number: ${receiptData.receiptNumber}
Date: ${receiptData.date}
Status: COMPLETED ✅

═══════════════════════════════════════════════════════════════
                      TRANSACTION SUMMARY
═══════════════════════════════════════════════════════════════

You paid:           ${receiptData.orderDetails.amount}
You received:       ${receiptData.orderDetails.asset}
Exchange rate:      ${receiptData.orderDetails.exchangeRate}
Processing fee:     ${receiptData.orderDetails.processingFee}
Network fee:        ${receiptData.orderDetails.networkFee}
Total time:         ${receiptData.orderDetails.totalTime}
Completed:          ${receiptData.orderDetails.completedAt}

═══════════════════════════════════════════════════════════════
                    BLOCKCHAIN VERIFICATION
═══════════════════════════════════════════════════════════════

Transaction Hash:   ${receiptData.blockchain.transactionHash}
Wallet Address:     ${receiptData.blockchain.walletAddress}
Network:            ${receiptData.blockchain.network}
Explorer URL:       ${receiptData.blockchain.explorerUrl}

═══════════════════════════════════════════════════════════════
                         VERIFICATION
═══════════════════════════════════════════════════════════════

This transaction has been verified on the Stellar blockchain.
You can verify this transaction independently using the 
transaction hash above on any Stellar explorer.

QR Code for Verification: [Transaction Hash]
${receiptData.blockchain.transactionHash}

═══════════════════════════════════════════════════════════════
                      TERMS & CONDITIONS
═══════════════════════════════════════════════════════════════

• All transactions are final and irreversible
• AFRAMP is not responsible for user errors in wallet addresses
• Network fees are determined by the Stellar network
• Exchange rates are locked at time of order creation
• For support, contact: support@aframp.com

═══════════════════════════════════════════════════════════════
                         SUPPORT
═══════════════════════════════════════════════════════════════

Need help? Contact us:
Email: support@aframp.com
Website: https://aframp.com
Verification Portal: https://verify.aframp.com

═══════════════════════════════════════════════════════════════

Built for Africa, Verified by Blockchain.
Onramp to the future. Offramp to opportunity. 🔗🌍

Thank you for using AFRAMP!

═══════════════════════════════════════════════════════════════
  `.trim()

  // Create and download the receipt
  const blob = new Blob([receiptText], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `aframp-receipt-${receiptData.receiptNumber}.txt`
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  // Log successful receipt generation for analytics
  console.warn('Receipt generated:', {
    receiptNumber: receiptData.receiptNumber,
    orderId: order.id,
    timestamp: new Date().toISOString(),
  })
}
