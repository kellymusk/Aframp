'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function FirstPurchaseTutorial() {
  const router = useRouter()
  const [isAnimating, setIsAnimating] = useState(false)

  const handleContinue = () => {
    setIsAnimating(true)
    setTimeout(() => router.push('/onramp'), 300)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Chart Illustration */}
        <div className="relative mx-auto w-full max-w-sm">
          <div className="rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 p-8 border border-primary/20">
            <div className="relative h-48">
              {/* Animated Chart */}
              <svg
                viewBox="0 0 300 150"
                className="w-full h-full"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Grid lines */}
                <line x1="0" y1="120" x2="300" y2="120" stroke="currentColor" strokeWidth="1" className="text-border opacity-30" />
                <line x1="0" y1="90" x2="300" y2="90" stroke="currentColor" strokeWidth="1" className="text-border opacity-30" />
                <line x1="0" y1="60" x2="300" y2="60" stroke="currentColor" strokeWidth="1" className="text-border opacity-30" />
                
                {/* Upward trend line */}
                <path
                  d="M 20 130 Q 80 110, 120 80 T 220 40 T 280 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="text-primary draw-line"
                />
                
                {/* Glow effect */}
                <path
                  d="M 20 130 Q 80 110, 120 80 T 220 40 T 280 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className="text-primary opacity-20 blur-sm"
                />
              </svg>
              
              {/* Floating icon */}
              <div className="absolute top-4 right-4 animate-float">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Price Example */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <span className="text-2xl">₿</span>
            <span className="font-semibold text-foreground">Bitcoin</span>
          </div>
          <div className="text-4xl font-bold text-foreground count-up">
            $84,247
          </div>
          <div className="flex items-center justify-center gap-1 text-primary">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">+5.2% today</span>
          </div>
        </div>

        {/* Main Message */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground">
            Ready for your first trade?
          </h1>
          <p className="text-muted-foreground">
            Start with as little as ₦1,000 and watch your crypto portfolio grow
          </p>
        </div>

        {/* Tutorial Steps */}
        <div className="space-y-3 text-left bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">1</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Choose your amount</p>
              <p className="text-xs text-muted-foreground">Select how much you want to invest</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">2</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Pick your payment method</p>
              <p className="text-xs text-muted-foreground">Bank transfer, card, or mobile money</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">3</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Complete your purchase</p>
              <p className="text-xs text-muted-foreground">Crypto arrives in your wallet instantly</p>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <Button
          onClick={handleContinue}
          disabled={isAnimating}
          className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shimmer-btn group"
        >
          Buy BTC
          <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>

        {/* Skip Option */}
        <button
          onClick={() => router.push('/dashboard')}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}
