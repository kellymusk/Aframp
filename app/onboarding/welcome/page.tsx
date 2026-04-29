// Aframp/app/onboarding/welcome/page.tsx
'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button' // Assuming Button component is available

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow/Particles Effect (Placeholder) */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-950 opacity-90" />
      <div className="absolute inset-0 z-0 opacity-20 animate-pulse-slow">
        {/* Replace with actual particle/glow effect if implemented */}
        <div className="w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2" />
        <div className="w-80 h-80 bg-blue-500/10 rounded-full blur-3xl absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative z-10 max-w-md text-center space-y-8"
      >
        {/* Aframp Title/Logo */}
        <div className="flex flex-col items-center justify-center space-y-4">
          {/* Placeholder for actual logo */}
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-4xl font-bold text-primary-foreground">
            A
          </div>
          <h1 className="text-5xl font-bold tracking-tight font-cal-sans text-primary-foreground">
            Aframp
          </h1>
        </div>

        {/* Tagline & Supporting Text */}
        <div className="space-y-4">
          <p className="text-2xl font-semibold text-white/90">
            Welcome to the future of finance
          </p>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Experience secure transactions with military-grade encryption and multi-factor
            authentication. Empowering your financial freedom with confidence.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-4">
          <Button
            asChild
            size="lg"
            className="w-full h-14 rounded-full text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30 transition-all duration-300 group"
          >
            <Link href="/onboarding/feature-highlights">
              Get Started <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="w-full h-12 rounded-full text-base text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-300"
          >
            <Link href="/dashboard">
              Skip Introduction
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
