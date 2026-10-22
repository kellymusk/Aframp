import type React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import RootLayout, { metadata, viewport } from '../layout'

const headerValues = new Map<string, string>()

jest.mock('next/headers', () => ({
  headers: () => Promise.resolve({ get: (name: string) => headerValues.get(name) ?? null }),
}))

const themeProps: Record<string, unknown>[] = []
jest.mock('@/components/theme-provider', () => ({
  ThemeProvider: ({ children, ...props }: { children: React.ReactNode }) => {
    themeProps.push(props)
    return <>{children}</>
  },
}))

jest.mock('@/components/session-provider', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

beforeEach(() => {
  headerValues.clear()
  themeProps.length = 0
})

async function renderLayout() {
  return renderToStaticMarkup(await RootLayout({ children: <p>page body</p> }))
}

describe('RootLayout', () => {
  it('applies the proxy nonce to the inline script and the theme provider', async () => {
    headerValues.set('x-nonce', 'abc123')
    const html = await renderLayout()

    expect(html).toContain('page body')
    expect(html).toMatch(/<script nonce="abc123">/)
    expect(html).toContain("navigator.serviceWorker.register('/sw.js')")
    expect(themeProps[0]).toMatchObject({ nonce: 'abc123', attribute: 'class' })
  })

  it('renders without a nonce when the proxy did not set one', async () => {
    const html = await renderLayout()

    expect(html).toContain('<html lang="en"')
    expect(html).not.toContain('nonce=')
    expect(themeProps[0].nonce).toBeUndefined()
  })

  it('exports the site metadata and theme colour', () => {
    expect(metadata.title).toMatch(/^Aframp/)
    expect(viewport.themeColor).toBe('#10b981')
  })
})
