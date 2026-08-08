import * as React from 'react'

export interface PaymentReceivedProps {
  orderId: string
  amount: number
  currency: string
  cryptoAsset: string
}

/**
 * Sent to the user when their fiat payment has been confirmed and the crypto
 * transfer is being processed.
 */
export function PaymentReceived({ orderId, amount, currency, cryptoAsset }: PaymentReceivedProps) {
  const shortId = orderId.slice(-8).toUpperCase()

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>Payment Received – AFRAMP</title>
      </head>
      <body style={styles.body}>
        <table style={styles.container} cellPadding={0} cellSpacing={0}>
          {/* Header */}
          <tr>
            <td style={styles.header}>
              <h1 style={styles.logo}>AFRAMP</h1>
            </td>
          </tr>

          {/* Body */}
          <tr>
            <td style={styles.content}>
              <h2 style={styles.heading}>Payment Received 💰</h2>
              <p style={styles.paragraph}>
                We have received your payment for order <strong>#ONR-{shortId}</strong>. Your{' '}
                {cryptoAsset} is now being processed and will arrive in your wallet shortly.
              </p>

              <table style={styles.summaryTable} cellPadding={0} cellSpacing={0}>
                <tr>
                  <td style={styles.labelCell}>Order ID</td>
                  <td style={styles.valueCell}>#ONR-{shortId}</td>
                </tr>
                <tr>
                  <td style={styles.labelCell}>Amount paid</td>
                  <td style={styles.valueCell}>
                    {amount.toLocaleString()} {currency}
                  </td>
                </tr>
                <tr>
                  <td style={styles.labelCell}>Status</td>
                  <td style={styles.valueCell}>Processing ⏳</td>
                </tr>
              </table>

              <p style={styles.note}>
                Average processing time is 2–5 minutes. You will receive another email once the
                transfer is complete.
              </p>
            </td>
          </tr>

          {/* Footer */}
          <tr>
            <td style={styles.footer}>
              <p style={styles.footerText}>
                © {new Date().getFullYear()} AFRAMP · Africa&#39;s Financial Bridge ·{' '}
                <a href="mailto:support@aframp.com" style={styles.footerLink}>
                  support@aframp.com
                </a>
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  )
}

const styles = {
  body: {
    backgroundColor: '#f4f4f5',
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    margin: 0,
    padding: '24px 0',
  } as React.CSSProperties,

  container: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    margin: '0 auto',
    maxWidth: '560px',
    width: '100%',
  } as React.CSSProperties,

  header: {
    backgroundColor: '#2563eb',
    borderRadius: '8px 8px 0 0',
    padding: '24px 32px',
  } as React.CSSProperties,

  logo: {
    color: '#ffffff',
    fontSize: '24px',
    fontWeight: 700,
    letterSpacing: '2px',
    margin: 0,
  } as React.CSSProperties,

  content: {
    padding: '32px',
  } as React.CSSProperties,

  heading: {
    color: '#111827',
    fontSize: '20px',
    fontWeight: 700,
    marginTop: 0,
  } as React.CSSProperties,

  paragraph: {
    color: '#374151',
    fontSize: '15px',
    lineHeight: '1.6',
  } as React.CSSProperties,

  summaryTable: {
    borderCollapse: 'collapse' as const,
    marginBottom: '24px',
    width: '100%',
  } as React.CSSProperties,

  labelCell: {
    borderBottom: '1px solid #e5e7eb',
    color: '#6b7280',
    fontSize: '14px',
    padding: '10px 0',
    width: '50%',
  } as React.CSSProperties,

  valueCell: {
    borderBottom: '1px solid #e5e7eb',
    color: '#111827',
    fontSize: '14px',
    fontWeight: 600,
    padding: '10px 0',
    textAlign: 'right' as const,
    width: '50%',
  } as React.CSSProperties,

  note: {
    color: '#9ca3af',
    fontSize: '13px',
    marginTop: '24px',
  } as React.CSSProperties,

  footer: {
    borderTop: '1px solid #e5e7eb',
    padding: '20px 32px',
  } as React.CSSProperties,

  footerText: {
    color: '#9ca3af',
    fontSize: '12px',
    margin: 0,
    textAlign: 'center' as const,
  } as React.CSSProperties,

  footerLink: {
    color: '#9ca3af',
  } as React.CSSProperties,
}

export default PaymentReceived
