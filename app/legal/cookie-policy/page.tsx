import Link from 'next/link'

export default function CookiePolicyPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Cookie Policy</h1>
          <p className="text-muted-foreground mt-2">
            Last updated: <span>2026-06-30</span>
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Overview</h2>
          <p className="text-sm text-muted-foreground">
            This Cookie Policy explains how Aframp uses cookies and similar technologies when you visit our website or use our
            services.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Cookies we use</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
            <li>
              <b>Essential cookies</b>: enable core functionality such as security and authentication.
            </li>
            <li>
              <b>Analytics cookies</b>: help us understand how visitors use the service so we can improve it.
            </li>
            <li>
              <b>Marketing cookies</b>: used to deliver relevant content and measure campaign performance.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Your choices</h2>
          <p className="text-sm text-muted-foreground">
            You can manage your cookie preferences using the cookie consent banner that appears when you first visit. Your choices
            are stored in your browser.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Learn more</h2>
          <p className="text-sm text-muted-foreground">
            For details on how we handle personal data, see our{' '}
            <Link href="/legal/privacy" className="underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  )
}

