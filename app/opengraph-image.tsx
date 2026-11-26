import { ImageResponse } from 'next/og'

export const alt = "Aframp — Africa's gateway to global decentralized finance"
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 80,
          background: '#0a0a0a',
          color: '#ffffff',
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 700, color: '#10b981' }}>Aframp</div>
        <div style={{ fontSize: 48, marginTop: 24, lineHeight: 1.25 }}>
          Africa&apos;s gateway to global decentralized finance
        </div>
        <div style={{ fontSize: 30, marginTop: 32, color: '#a1a1aa' }}>
          Send money to anyone in Africa instantly.
        </div>
      </div>
    ),
    size,
  )
}
