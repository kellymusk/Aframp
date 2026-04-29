'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Country {
  code: string
  name: string
  currency: string
}

const countries: Country[] = [
  { code: 'NG', name: 'Nigeria', currency: '₦' },
  { code: 'KE', name: 'Kenya', currency: 'KSh' },
  { code: 'GH', name: 'Ghana', currency: '₵' },
]

interface CountrySelectorProps {
  selectedCountry: string
  onCountryChange: (code: string) => void
}

export function CountrySelector({ selectedCountry, onCountryChange }: CountrySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  useEffect(() => {
    // Load saved preference
    const savedCountry = localStorage.getItem('preferredCountry')
    if (savedCountry && savedCountry !== selectedCountry) {
      onCountryChange(savedCountry)
    }
  }, [selectedCountry, onCountryChange])

  const selected = countries.find((c) => c.code === selectedCountry) || countries[0]

  const handleSelect = (country: Country) => {
    onCountryChange(country.code)
    localStorage.setItem('preferredCountry', country.code)
    setIsOpen(false)
  }

  if (!mounted) {
    return <div className="w-32 h-10 rounded-lg bg-muted animate-pulse"></div>
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-32 justify-between gap-2 h-10 rounded-lg border-border bg-background hover:bg-accent"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2">
          <CountryFlag code={selected.code} />
          <span className="font-medium">{selected.code}</span>
        </span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              className="absolute right-0 top-12 z-50 w-64 rounded-xl border border-border bg-card shadow-xl p-2"
              role="listbox"
            >
              {countries.map((country) => (
                <button
                  key={country.code}
                  onClick={() => handleSelect(country)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
                    selectedCountry === country.code && 'bg-primary/10 text-primary'
                  )}
                  role="option"
                  aria-selected={selectedCountry === country.code}
                >
                  <CountryFlag code={country.code} className="h-5 w-5" />
                  <div className="flex-1">
                    <div className="font-medium">{country.name}</div>
                    <div className="text-xs text-muted-foreground">{country.currency}</div>
                  </div>
                  {selectedCountry === country.code && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function CountryFlag({ code, className }: { code: string; className?: string }) {
  const baseClass = cn('h-4 w-4 overflow-hidden rounded-[2px] border border-border/60', className)

  if (code === 'NG') {
    return (
      <svg viewBox="0 0 24 24" className={baseClass} aria-hidden="true">
        <rect width="8" height="24" x="0" y="0" fill="#128A49" />
        <rect width="8" height="24" x="8" y="0" fill="#FFFFFF" />
        <rect width="8" height="24" x="16" y="0" fill="#128A49" />
        <rect width="0.75" height="24" x="8" y="0" fill="#D1D5DB" />
        <rect width="0.75" height="24" x="15.25" y="0" fill="#D1D5DB" />
        <rect width="24" height="24" x="0" y="0" fill="none" stroke="#9CA3AF" strokeWidth="0.6" />
      </svg>
    )
  }

  if (code === 'KE') {
    return (
      <svg viewBox="0 0 24 24" className={baseClass} aria-hidden="true">
        <rect width="24" height="8" x="0" y="0" fill="#111827" />
        <rect width="24" height="1" x="0" y="8" fill="#FFFFFF" />
        <rect width="24" height="6" x="0" y="9" fill="#B91C1C" />
        <rect width="24" height="1" x="0" y="15" fill="#FFFFFF" />
        <rect width="24" height="8" x="0" y="16" fill="#15803D" />
      </svg>
    )
  }

  if (code === 'GH') {
    return (
      <svg viewBox="0 0 24 24" className={baseClass} aria-hidden="true">
        <rect width="24" height="8" x="0" y="0" fill="#DC2626" />
        <rect width="24" height="8" x="0" y="8" fill="#EAB308" />
        <rect width="24" height="8" x="0" y="16" fill="#15803D" />
        <polygon points="12,9 13.1,11.2 15.6,11.5 13.8,13.3 14.2,15.8 12,14.6 9.8,15.8 10.2,13.3 8.4,11.5 10.9,11.2" fill="#111827" />
      </svg>
    )
  }

  return (
    <span className={cn('inline-flex items-center justify-center text-[10px] font-semibold', baseClass)}>
      {code}
    </span>
  )
}
