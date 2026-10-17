import { render, screen, within } from '@testing-library/react'

// Mock next/image to avoid issues in test env
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { alt?: string; src?: string; [key: string]: unknown }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={props.alt ?? ''} src={props.src ?? ''} />
  },
}))

// Mock next/navigation for the redirect in app/landing/page.tsx
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

import { Hero } from '@/components/landing-light/hero'
import { HowItWorks } from '@/components/landing-light/how-it-works'
import { Faq } from '@/components/landing-light/faq'
import { SiteFooter } from '@/components/landing-light/site-footer'
import { steps, faqs, footer } from '@/lib/landing-light-data'

// AmountWidget is a client component that may use browser APIs — mock it
jest.mock('@/components/landing-light/amount-widget', () => ({
  AmountWidget: () => <div data-testid="amount-widget">Amount Widget</div>,
}))

// SiteNav may have internal links — mock it for isolation
jest.mock('@/components/landing-light/site-nav', () => ({
  SiteNav: () => <nav data-testid="site-nav">Nav</nav>,
}))

describe('Landing page smoke tests', () => {
  describe('Hero section', () => {
    it('renders the hero section', () => {
      render(<Hero />)
      // The hero renders a heading with the site tagline
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })

    it('renders the AmountWidget CTA', () => {
      render(<Hero />)
      expect(screen.getByTestId('amount-widget')).toBeInTheDocument()
    })

    it('renders the site nav', () => {
      render(<Hero />)
      expect(screen.getByTestId('site-nav')).toBeInTheDocument()
    })
  })

  describe('HowItWorks section', () => {
    it('renders exactly the correct number of steps', () => {
      render(<HowItWorks />)
      const list = screen.getByRole('list')
      const items = within(list).getAllByRole('listitem')
      expect(items).toHaveLength(steps.length)
    })

    it('renders the step titles', () => {
      render(<HowItWorks />)
      for (const step of steps) {
        expect(screen.getByText(step.title)).toBeInTheDocument()
      }
    })

    it('renders the "How it works" heading', () => {
      render(<HowItWorks />)
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
    })
  })

  describe('FAQ section', () => {
    it('renders all FAQ questions', () => {
      render(<Faq />)
      for (const faq of faqs) {
        expect(screen.getByText(faq.q)).toBeInTheDocument()
      }
    })

    it('renders the first FAQ item as open by default', () => {
      render(<Faq />)
      const detailsElements = document.querySelectorAll('details')
      expect(detailsElements.length).toBe(faqs.length)
      expect(detailsElements[0]).toHaveAttribute('open')
    })

    it('renders the + and - toggle indicators', () => {
      render(<Faq />)
      // The span with aria-hidden shows + (closed) and − (open)
      const plusElements = screen.getAllByText('+')
      expect(plusElements.length).toBeGreaterThan(0)
    })
  })

  describe('Footer section', () => {
    it('renders the footer links', () => {
      render(<SiteFooter />)
      for (const link of footer.links) {
        expect(screen.getByText(link)).toBeInTheDocument()
      }
    })

    it('renders the support email link', () => {
      render(<SiteFooter />)
      expect(screen.getByText(footer.support)).toBeInTheDocument()
    })

    it('renders the business email link', () => {
      render(<SiteFooter />)
      expect(screen.getByText(footer.business)).toBeInTheDocument()
    })

    it('renders the footer with contact id', () => {
      render(<SiteFooter />)
      expect(document.querySelector('#contact')).toBeInTheDocument()
    })

    it('renders the Aframp brand name', () => {
      render(<SiteFooter />)
      expect(screen.getByText('Aframp')).toBeInTheDocument()
    })
  })
})
