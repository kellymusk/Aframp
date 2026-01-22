import { Suspense } from "react"
import { DashboardPageClient } from "@/components/dashboard/dashboard-page-client"

interface DashboardPageProps {
  searchParams: {
    wallet?: string
    address?: string
  }
}

export default function DashboardPage({ searchParams }: DashboardPageProps) {
  const { wallet, address } = searchParams

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      }
    >
      <DashboardPageClient initialWallet={wallet} initialAddress={address} />
    </Suspense>
  )
}

