import Link from 'next/link'

export default function TermsOfServicePage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Terms of Service</h1>
          <p className="text-muted-foreground mt-2">
            Last updated: <span>2026-06-30</span>
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Acceptance of these Terms</h2>
          <p className="text-sm text-muted-foreground">
            By accessing or using Aframp, you agree to these Terms of Service (“Terms”).
            If you do not agree, do not use the service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Eligible users & verification</h2>
          <p className="text-sm text-muted-foreground">
            Aframp may require account verification (KYC) and other compliance checks.
            You agree to provide accurate information and to keep it updated.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. Services</h2>
          <p className="text-sm text-muted-foreground">
            Aframp provides fintech functionality including buying crypto (e.g., cNGN where offered), paying bills, and sending money across supported countries.
            Availability, fees, and supported features may change.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Fees, limits, and settlement</h2>
          <p className="text-sm text-muted-foreground">
            Fees and limits are shown during transactions and may apply based on the selected product, corridor, or payment method.
            Transaction completion is subject to verification and payment confirmation.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Privacy</h2>
          <p className="text-sm text-muted-foreground">
            Aframp’s Privacy Policy explains how we collect, use, share, and protect personal information.
            <span> </span>
            <Link href="/legal/privacy" className="underline">
              View Privacy Policy
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. Prohibited uses</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
            <li>Using Aframp for unlawful activities or fraud.</li>
            <li>Providing false or misleading information.</li>
            <li>Attempting to interfere with the operation of the service.</li>
            <li>Abusing transaction features, chargebacks, or payment instruments.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. Disclaimers</h2>
          <p className="text-sm text-muted-foreground">
            Aframp is provided “as is” and “as available”. We do not guarantee uninterrupted or error-free operation.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Limitation of liability</h2>
          <p className="text-sm text-muted-foreground">
            To the maximum extent permitted by law, Aframp and its affiliates are not liable for indirect or consequential damages.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">9. Changes to the Terms</h2>
          <p className="text-sm text-muted-foreground">
            We may update these Terms from time to time. Continued use after changes become effective means you accept the updated Terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">10. Contact</h2>
          <p className="text-sm text-muted-foreground">
            For questions about these Terms, contact our support team.
          </p>
        </section>

        <footer className="pt-6 text-sm text-muted-foreground">
          <Link href="/legal/privacy" className="underline">
            Read Privacy Policy
          </Link>
        </footer>
      </div>
    </main>
  )
}

