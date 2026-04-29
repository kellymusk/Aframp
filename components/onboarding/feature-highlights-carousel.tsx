'use client'

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { ArrowLeft, ArrowRight, Globe2, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type FeatureHighlightIllustration = 'security' | 'ease' | 'freedom' | 'network'

export interface FeatureHighlightSlide {
  id: string
  title: string
  description: string
  illustration: FeatureHighlightIllustration
}

interface FeatureHighlightsCarouselProps {
  slides?: FeatureHighlightSlide[]
  onComplete: () => void
  onSkip?: () => void
  onBack?: () => void
  autoAdvanceMs?: number
  className?: string
}

const DEFAULT_SLIDES: FeatureHighlightSlide[] = [
  {
    id: 'security',
    title: 'Secure Digital Wallet',
    description:
      'Experience military-grade protection with encrypted storage, multi-factor checks, and recovery safeguards.',
    illustration: 'security',
  },
  {
    id: 'ease',
    title: 'Built for Everyday Ease',
    description:
      'Move from sign-up to your first transaction in minutes with guided flows and familiar actions.',
    illustration: 'ease',
  },
  {
    id: 'freedom',
    title: 'Trade with Total Freedom',
    description:
      'Buy, sell, and move assets across borders with low friction and real-time settlement confidence.',
    illustration: 'freedom',
  },
  {
    id: 'network',
    title: 'Connected Financial Network',
    description:
      'Link local money rails with global digital assets through a trusted, always-on payment network.',
    illustration: 'network',
  },
]

function Illustration({ variant }: { variant: FeatureHighlightIllustration }) {
  const iconByVariant = {
    security: ShieldCheck,
    ease: Sparkles,
    freedom: ArrowRight,
    network: Globe2,
  } as const

  const Icon = iconByVariant[variant]

  return (
    <div className="relative flex h-60 w-full items-center justify-center overflow-hidden rounded-2xl border border-emerald-500/25 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.26),rgba(0,0,0,0.6)_45%,rgba(0,0,0,0.92))]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.24),transparent_55%)]" />
      <div className="absolute top-10 left-12 h-24 w-24 rounded-full border border-emerald-400/25 blur-sm" />
      <div className="absolute right-10 bottom-8 h-20 w-20 rounded-full border border-emerald-400/20 blur-sm" />
      <div className="absolute h-0.5 w-full bg-gradient-to-r from-transparent via-emerald-400/45 to-transparent" />

      {variant === 'network' && (
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute top-8 left-8 h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.7)]" />
          <div className="absolute top-16 right-16 h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.7)]" />
          <div className="absolute right-20 bottom-10 h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.7)]" />
          <div className="absolute bottom-12 left-[4.5rem] h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.7)]" />
          <div className="absolute top-11 left-9 h-px w-56 rotate-12 bg-emerald-400/45" />
          <div className="absolute top-24 left-12 h-px w-48 -rotate-12 bg-emerald-400/45" />
        </div>
      )}

      {variant === 'freedom' && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-75">
          <Zap className="h-5 w-5 text-emerald-300" />
          <div className="h-px w-16 bg-emerald-400/70" />
          <Zap className="h-5 w-5 text-emerald-300" />
        </div>
      )}

      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-300/30 bg-emerald-400/20 shadow-[0_0_24px_rgba(16,185,129,0.75)]">
        <Icon className="h-8 w-8 text-emerald-200" />
      </div>
    </div>
  )
}

export function FeatureHighlightsCarousel({
  slides = DEFAULT_SLIDES,
  onComplete,
  onSkip,
  onBack,
  autoAdvanceMs = 0,
  className,
}: FeatureHighlightsCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', loop: false, dragFree: false })
  const [selectedIndex, setSelectedIndex] = useState(0)

  const slideCount = slides.length
  const isLastSlide = selectedIndex === slideCount - 1
  const currentSlide = slides[selectedIndex]

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev()
  }, [emblaApi])

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext()
  }, [emblaApi])

  const scrollTo = useCallback(
    (index: number) => {
      emblaApi?.scrollTo(index)
    },
    [emblaApi]
  )

  const selectSlide = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    emblaApi.on('select', selectSlide)
    emblaApi.on('reInit', selectSlide)
    return () => {
      emblaApi.off('select', selectSlide)
      emblaApi.off('reInit', selectSlide)
    }
  }, [emblaApi, selectSlide])

  useEffect(() => {
    if (!emblaApi || autoAdvanceMs <= 0) return
    const timer = window.setInterval(() => {
      if (emblaApi.selectedScrollSnap() >= slideCount - 1) {
        window.clearInterval(timer)
        return
      }
      emblaApi.scrollNext()
    }, autoAdvanceMs)
    return () => window.clearInterval(timer)
  }, [autoAdvanceMs, emblaApi, slideCount])

  const handleBack = useCallback(() => {
    if (selectedIndex > 0) {
      scrollPrev()
      return
    }
    onBack?.()
  }, [onBack, scrollPrev, selectedIndex])

  const handleNext = useCallback(() => {
    if (isLastSlide) {
      onComplete()
      return
    }
    scrollNext()
  }, [isLastSlide, onComplete, scrollNext])

  const handleKeyboard = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        handleBack()
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        handleNext()
      }
      if (event.key === 'Home') {
        event.preventDefault()
        scrollTo(0)
      }
      if (event.key === 'End') {
        event.preventDefault()
        scrollTo(slideCount - 1)
      }
    },
    [handleBack, handleNext, scrollTo, slideCount]
  )

  const srProgressLabel = useMemo(
    () => `Slide ${selectedIndex + 1} of ${slideCount}: ${currentSlide?.title ?? ''}`,
    [currentSlide?.title, selectedIndex, slideCount]
  )

  return (
    <section
      className={cn(
        'relative mx-auto flex min-h-screen w-full max-w-sm flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.2),rgba(2,16,10,0.95)_36%,#010b08_74%)] p-6 text-emerald-50',
        className
      )}
      aria-roledescription="carousel"
      aria-label="Feature highlights"
      role="region"
      tabIndex={0}
      onKeyDown={handleKeyboard}
    >
      <header className="mb-7 flex items-center justify-between">
        <Button
          aria-label={selectedIndex > 0 ? 'Previous slide' : 'Back to welcome'}
          variant="ghost"
          size="icon-sm"
          className="rounded-full text-emerald-100 hover:bg-emerald-500/15 hover:text-emerald-50"
          onClick={handleBack}
          type="button"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-sm font-semibold tracking-wide text-emerald-100">Feature Highlights</h1>
        <div className="w-8" aria-hidden />
      </header>

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {slides.map((slide, index) => (
            <article
              key={slide.id}
              className="min-w-0 flex-[0_0_100%]"
              aria-hidden={selectedIndex !== index}
              aria-label={`Slide ${index + 1} of ${slideCount}`}
              aria-roledescription="slide"
              role="group"
            >
              <Illustration variant={slide.illustration} />
              <div className="pt-7">
                <h2 className="text-3xl font-semibold leading-tight text-emerald-50">
                  {slide.title}
                </h2>
                <p className="mt-4 text-sm leading-7 text-emerald-100/75">{slide.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-8">
        <div className="mb-7 flex items-center justify-center gap-2" aria-label="Slide progress">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              aria-label={`Go to slide ${index + 1}`}
              aria-pressed={selectedIndex === index}
              className={cn(
                'h-1.5 rounded-full bg-emerald-400/30 transition-all focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-950',
                selectedIndex === index
                  ? 'w-6 bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.8)]'
                  : 'w-1.5'
              )}
              onClick={() => scrollTo(index)}
              type="button"
            />
          ))}
        </div>

        <Button
          className="h-12 w-full rounded-xl bg-emerald-500 text-emerald-950 shadow-[0_0_26px_rgba(16,185,129,0.42)] hover:bg-emerald-400"
          onClick={handleNext}
          type="button"
        >
          {isLastSlide ? 'Continue to Wallet Setup' : 'Next'}
        </Button>

        <button
          className="mt-4 w-full text-center text-sm text-emerald-200/70 transition hover:text-emerald-100 focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          onClick={onSkip ?? onComplete}
          type="button"
        >
          Skip Introduction
        </button>
      </div>

      <p className="sr-only" aria-live="polite">
        {srProgressLabel}
      </p>
    </section>
  )
}

export { DEFAULT_SLIDES }
