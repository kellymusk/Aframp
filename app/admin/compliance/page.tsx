import type { Metadata } from 'next'
import { ComplianceConsole } from '@/components/admin/compliance-console'

/**
 * /admin/compliance — internal AML review console.
 *
 * `noindex, nofollow` because this page lists customer names, account
 * identifiers and sanctions determinations.  It is not a substitute for access
 * control (see lib/compliance/admin-auth.ts) — it just stops the URL from
 * turning up in a search index if the route is ever reachable from the public
 * internet.
 *
 * The page itself renders nothing sensitive: everything is fetched client-side
 * with the analyst's bearer token, so an unauthenticated visitor gets a sign-in
 * form rather than a server-rendered page containing case data.
 */
export const metadata: Metadata = {
  title: 'Compliance console · Aframp',
  robots: { index: false, follow: false },
}

export default function ComplianceAdminPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <ComplianceConsole />
    </main>
  )
}
