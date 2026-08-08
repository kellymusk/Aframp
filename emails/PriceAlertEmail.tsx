import * as React from 'react'

export type PriceAlertDirection = 'above' | 'below'

export interface PriceAlertEmailProps {
  asset: string
  direction: PriceAlertDirection
  threshold: number
  actualValue: number
}

/**
 * Sent when a user-configured price alert threshold is crossed.
 */
export function PriceAlertEmail({ asset, direction, threshold, actualValue }: PriceAlertEmailProps) {
  const directionLabel = direction === 'below' ? 'dropped below' : 'risen above'
  const directionEmoji = direction === 'below' ? '📉' : '📈'
  const headerColor = direction === 'below' ? '#dc2626' : '#16a34a'

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>
          Price Alert: {asset} {directionLabel} ₦{threshold.toLocaleString()} – AFRAMP
        </title>
      </head>
      <body style={styles.body}>
        <table style={styles.container} cellPadding={0} cellSpacing={0}>
          {/* Header */}
          <tr>
            <td style={{ ...styles.header, backgroundColor: headerColor }}>
              <h1 style={styles.logo}>AFRAMP</h1>
            </td>
          </tr>

          {/* Body */}
          <tr>
            <td style={styles.content}>
              <h2 style={styles.heading}>
                {directionEmoji} Price Alert Triggered
              </h2>
              <p style={styles.paragraph}>
                The price of <strong>{asset}</strong> has {directionLabel} your configured
                threshold of <strong>₦{threshold.toLocaleString()}</strong>.
              </p>

              <table style={styles.summaryTable} cellPadding={0} cellSpacing={0}>
                <tr>
                  <td style={styles.labelCell}>Asset</td>
                  <td style={styles.valueCell}>{asset}</td>
                </tr>
                <tr>
                  <td style={styles.labelCell}>Your threshold</td>
                  <td style={styles.valueCell}>₦{threshold.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style={styles.labelCell}>Current price</td>
                  <td style={{ ...styles.valueCell, color: headerColor }}>
                    ₦{actualValue.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td style={styles.labelCell}>Direction</td>
                  <td style={styles.valueCell}>{direction === 'below' ? 'Below ↓' : 'Above ↑'}</td>
                </tr>
              </table>

              <a href="https://aframp.com/pricealert" style={{ ...styles.button, backgroundColor: headerColor }}>
                Manage Alerts
              </a>

              <p style={styles.note}>
                You can update or disable this alert from your AFRAMP dashboard.
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

  button: {
    borderRadius: '6px',
    color: '#ffffff',
    display: 'inline-block',
    fontSize: '15px',
    fontWeight: 600,
    padding: '12px 28px',
    textDecoration: 'none',
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

export default PriceAlertEmail
