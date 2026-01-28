import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function OfframpBankDetailsPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-lg w-full rounded-3xl border border-border bg-card p-6 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Bank Details</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This step is coming next. We saved your order and will guide you through bank verification.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button asChild variant="outline">
            <Link href="/offramp">Back to Offramp</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
