import Link from 'next/link'

export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="text-muted-foreground mt-2">
            Last updated: <span>2026-06-30</span>
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Who we are</h2>
          <p className="text-sm text-muted-foreground">
            Aframp ("Aframp" or "we") provides financial services that enable users to buy crypto, pay bills, and send money.
            This Privacy Policy explains how we collect, use, share, and protect personal information when you use Aframp.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Personal data we collect</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
            <li>Account & identity data: name, phone number, email (if provided), and other profile details you submit.</li>
            <li>Verification & KYC data: government-issued identification and KYC documentation (e.g., ID images/files), and KYC status.</li>
            <li>Transaction data: payment/bill transaction records, order/payment references, timestamps, and status updates.</li>
            <li>Banking & payment data: bank account details and other payment instructions you provide for withdrawals or settlement (where applicable).</li>
            <li>Communication data: messages and support interactions you initiate with us.</li>
            <li>Security data: device/app telemetry and security logs used for fraud prevention and system integrity (if applicable).</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. How we use personal data</h2>
          <p className="text-sm text-muted-foreground">
            We use personal data to operate Aframp and provide services, including:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
            <li>Provide account creation, authentication, and customer support.</li>
            <li>Perform KYC/AML checks and comply with legal obligations.</li>
            <li>Process transactions (buy/sell/transfer/pay bills), payment settlement, and reconciliation.</li>
            <li>Prevent fraud, abuse, and unauthorized access; maintain system security.</li>
            <li>Manage business operations, risk and compliance reporting.</li>
            <li>Respond to legal requests and enforce our terms.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Legal bases (GDPR-style) & regulatory context</h2>
          <p className="text-sm text-muted-foreground">
            Where applicable law recognizes legal bases similar to those under the EU GDPR, we process personal information under one or more of the following:
            (a) performance of a contract with you; (b) compliance with legal obligations (including KYC/AML and record-keeping);
            (c) legitimate interests (e.g., fraud prevention and maintaining service availability); and/or
            (d) consent, where required by applicable law.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Cookies and similar technologies</h2>
          <p className="text-sm text-muted-foreground">
            Aframp may use cookies and similar technologies to make the website/app work, remember preferences, and provide analytics.
            See our Cookie Consent Banner and cookie choices available when you first visit.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. Sharing of personal data</h2>
          <p className="text-sm text-muted-foreground">
            We may share personal data with:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
            <li>Payment service providers, merchants, billers, and counterparties necessary to execute transactions.</li>
            <li>KYC/identity verification vendors and compliance partners used to perform verification checks.</li>
            <li>Cloud infrastructure and hosting providers that process data on our behalf.</li>
            <li>Legal, audit, and professional advisors where required for compliance or governance.</li>
            <li>Regulators, law enforcement, or other authorities when required by law.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. International transfers</h2>
          <p className="text-sm text-muted-foreground">
            We may transfer personal data across borders to service providers and business partners to operate Aframp.
            Where required by applicable law, we implement appropriate safeguards for such transfers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Data retention periods</h2>
          <p className="text-sm text-muted-foreground">
            We retain personal information only for as long as necessary for the purposes described in this policy and as required by applicable law.
            The retention periods below are compliance-oriented ranges.
          </p>

          <div className="space-y-4">
            <div className="rounded-xl border border-border p-4">
              <h3 className="font-semibold">KYC documents</h3>
              <p className="text-sm text-muted-foreground mt-1">
                We retain KYC documentation and verification results for a period consistent with KYC/AML record-keeping obligations.
                Typically, we retain such records for <b>up to 7 years</b> from the end of your business relationship or as required by the relevant regulator.
              </p>
            </div>

            <div className="rounded-xl border border-border p-4">
              <h3 className="font-semibold">Transaction records</h3>
              <p className="text-sm text-muted-foreground mt-1">
                We retain transaction logs and records for accounting, audit, and compliance purposes.
                Typically, we retain such records for <b>up to 7 years</b> from the date of the transaction or as required by applicable law.
              </p>
            </div>

            <div className="rounded-xl border border-border p-4">
              <h3 className="font-semibold">Phone numbers</h3>
              <p className="text-sm text-muted-foreground mt-1">
                We retain phone numbers while your account is active and for a limited period after closure to resolve disputes,
                provide support, and comply with record-keeping obligations.
                Typically, we retain phone numbers for <b>up to 2–3 years</b> after account closure (or longer if required by law).
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">9. Data security</h2>
          <p className="text-sm text-muted-foreground">
            We use reasonable technical and organizational measures designed to protect personal data against unauthorized access, alteration, disclosure, or destruction.
            No method of transmission or storage is completely secure.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">10. Your rights</h2>
          <p className="text-sm text-muted-foreground">
            Depending on your jurisdiction, you may have rights to access, correct, request deletion/erasure, object to processing,
            or request restriction/portability.
          </p>
          <p className="text-sm text-muted-foreground">
            To exercise rights, contact us using the details in the "Contact" section below. We may need to verify your identity before processing a request.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">11. GDPR, Nigeria NDPR, and Kenya DPA documentation</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <b>GDPR principles (where applicable):</b> We aim to process data lawfully, for specified purposes, with data minimization,
              ensure accuracy, retain only for the necessary period, and protect integrity/confidentiality.
            </p>
            <p>
              <b>Nigeria NDPR (where applicable):</b> Aframp intends to comply with principles including transparency, data security,
              and respect for data subject rights such as access/correction and lawful processing.
              Where required, we maintain records and respond to regulatory/breach obligations.
            </p>
            <p>
              <b>Kenya DPA (where applicable):</b> Aframp seeks to follow data processing principles and to enable relevant data subject rights
              as required by applicable Kenya data protection rules.
            </p>
            <p>
              <b>Note:</b> This document is a product/legal disclosure template. For formal compliance certification, consult qualified counsel.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">12. Contact</h2>
          <p className="text-sm text-muted-foreground">
            For privacy questions, data requests, or complaints, contact our privacy team at{' '}
            <a className="underline" href="mailto:privacy@aframps.example">privacy@aframps.example</a>.
          </p>
          <p className="text-sm text-muted-foreground">
            If you are in Nigeria, Kenya, or another jurisdiction, you may also have the right to lodge a complaint with the relevant data protection authority.
          </p>
        </section>

        <footer className="pt-6 text-sm text-muted-foreground">
          <Link href="/legal/terms" className="underline">
            Read Terms of Service
          </Link>
        </footer>
      </div>
    </main>
  )
}

