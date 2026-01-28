import { SettlementStatus } from "@/components/offramp/settlement-status"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { SmoothScroll } from "@/components/smooth-scroll"

interface PageProps {
    params: Promise<{ orderId: string }>
}

export default async function SettlementProcessingPage({ params }: PageProps) {
    const { orderId } = await params

    return (
        <SmoothScroll>
            <main className="min-h-screen bg-background relative overflow-hidden" suppressHydrationWarning>
                {/* Decorative background gradients */}
                <div className="absolute top-0 left-1/4 -translate-x-1/2 w-full max-w-[800px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-full max-w-[600px] h-[400px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

                <Navbar />

                <div className="pt-24 pb-12">
                    <SettlementStatus orderId={orderId} />
                </div>

                <Footer />
            </main>
        </SmoothScroll>
    )
}
