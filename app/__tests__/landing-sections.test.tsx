import { render, screen } from '@testing-library/react'
import Home from '../page'
import { Features } from '@/components/landing-light/features'
import { Trust } from '@/components/landing-light/trust'
import {
  FaqSkeleton,
  SiteFooterSkeleton,
  UseCasesSkeleton,
} from '@/components/landing-light/section-skeletons'
import { features, trust } from '@/lib/landing-light-data'

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { alt?: string; src?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt ?? ''} src={props.src ?? ''} />
  ),
}))

jest.mock('@/components/landing-light/amount-widget', () => ({
  AmountWidget: () => <div data-testid="amount-widget" />,
}))

jest.mock('@/components/landing-light/site-nav', () => ({
  SiteNav: () => <nav aria-label="Site" />,
}))

describe('Features', () => {
  it('renders every feature card', () => {
    render(<Features />)
    expect(
      screen.getByRole('heading', { name: 'Built for how Africa actually pays' })
    ).toBeInTheDocument()
    for (const { title } of features) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    }
  })
})

describe('Trust', () => {
  it('links every claim to its primary source', () => {
    render(<Trust />)
    expect(screen.getByRole('heading', { name: trust.title })).toBeInTheDocument()
    for (const { linkLabel, href } of trust.items) {
      expect(screen.getByRole('link', { name: new RegExp(linkLabel) })).toHaveAttribute(
        'href',
        href
      )
    }
  })

  it('points the source links at this repository', () => {
    const github = trust.items.filter(({ href }) => href.includes('github.com'))
    expect(github.length).toBeGreaterThan(0)
    for (const { href } of github) expect(href).toMatch(/^https:\/\/github\.com\/kellymusk\/Aframp/)
  })
})

describe('section skeletons', () => {
  it.each([
    ['use cases', UseCasesSkeleton],
    ['FAQ', FaqSkeleton],
    ['footer', SiteFooterSkeleton],
  ])('the %s placeholder is hidden from assistive tech', (_, Skeleton) => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('Home', () => {
  it('renders the landing page sections once each', () => {
    render(<Home />)
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(
      screen.getAllByRole('heading', { name: 'Built for how Africa actually pays' })
    ).toHaveLength(1)
    expect(screen.getAllByRole('heading', { name: trust.title })).toHaveLength(1)
  })
})
