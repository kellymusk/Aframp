import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function BillsPayPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-lg w-full rounded-3xl border border-border bg-card p-6 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Repeat Payment</h1>
        <p className="mt-2 text-sm text-muted-foreground">This flow is coming soon.</p>
        <Button className="mt-4" asChild>
          <Link href="/bills">Back to Bills</Link>
        </Button>
      </div>
    </div>
  )
}
