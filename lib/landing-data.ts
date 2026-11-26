/**
 * Copy and figures for the marketing home page, transcribed from
 * designs/Aframp landing Page.png. Kept out of the components so the
 * content can move to a CMS without touching layout.
 */

import { STELLAR_ASSETS } from '@/lib/assets'
import { STELLAR_NETWORK } from '@/lib/config/network'

export const nav = [
  { label: 'Features', href: '#features' },
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Business', href: '#business' },
]

export const hero = {
  eyebrow: 'Powered by cNGN on Stellar (XLM)',
  titleTop: 'Pay, Send & Buy',
  titleAccent: 'Crypto in Africa',
  minBuy: '2,000 cNGN',
  stats: [
    { value: '50K+', label: 'Active Users' },
    { value: '$2M+', label: 'Processed Daily' },
    { value: '12', label: 'Countries' },
  ],
  card: {
    balanceLabel: 'cNGN Balance',
    balance: '₦2,450,000',
    purchase: { label: 'BTC Purchase', amount: '0.0025 BTC', sub: '≈ 2,000 cNGN' },
    toast: {
      title: 'DSTV Subscription',
      amount: '₦15,000',
      status: 'Paid successfully',
      token: 'cNGN',
    },
  },
}

export const partners = [
  { name: 'Binance', badge: 'B' },
  { name: 'Flutterwave', badge: 'F' },
  { name: 'Paystack', badge: 'P' },
  { name: 'MTN MoMo', badge: 'M' },
  { name: 'Chipper', badge: 'C' },
  { name: 'Luno', badge: 'L' },
  { name: 'Kuda Bank', badge: 'K' },
  { name: 'OPay', badge: 'O' },
]

export type Network = {
  name: string
  ticker: string
  blurb: string
}

/**
 * The chains the app can actually settle on. `config/network.ts` models
 * Stellar exclusively, so Stellar is the only chain the landing page may
 * advertise. Each ticker is resolved against `assets.ts` before it is
 * exposed, which keeps the marketing copy in step with the supported assets.
 */
const SUPPORTED_NETWORKS: readonly Network[] = [
  {
    name: 'Stellar',
    ticker: 'XLM',
    blurb: 'Fast, low-cost cross-border payments',
  },
]

// `config/network.ts` normalizes `PUBLIC` to `MAINNET`, but the exported type
// still includes it, so accept every Stellar variant the app models.
const STELLAR_NETWORKS = ['MAINNET', 'PUBLIC', 'TESTNET', 'FUTURENET'] as const

export const networks: Network[] = SUPPORTED_NETWORKS.filter(({ name, ticker }) => {
  const networkIsSupported = name === 'Stellar' && STELLAR_NETWORKS.includes(STELLAR_NETWORK)
  const assetIsSupported = STELLAR_ASSETS.some(({ code }) => code === ticker)
  return networkIsSupported && assetIsSupported
})

export const steps = [
  {
    title: 'Download & Sign Up',
    blurb:
      'Get the Aframp app and create your account in under 2 minutes with just your phone number.',
  },
  {
    title: 'Fund Your Wallet',
    blurb: 'Add cNGN to your wallet via bank transfer, card, or mobile money. Zero funding fees.',
  },
  {
    title: 'Start Transacting',
    blurb: 'Buy crypto, pay bills, or send money to anyone across Africa instantly.',
  },
  {
    title: 'Grow Your Wealth',
    blurb: 'Earn rewards, access exclusive features, and watch your portfolio grow.',
  },
]

export type Tier = {
  name: string
  audience: string
  price: string
  priceNote: string
  features: string[]
  cta: string
  featured?: boolean
}

export const tiers: Tier[] = [
  {
    name: 'Personal',
    audience: 'For individuals getting started with crypto',
    price: 'Free',
    priceNote: 'No monthly fees',
    features: [
      'Buy crypto from ₦2,000',
      'Pay bills & airtime',
      'Send to 12 countries',
      'Basic analytics',
      'Email support',
    ],
    cta: 'Get Started Free',
  },
  {
    name: 'Business',
    audience: 'For SMEs accepting cNGN payments',
    price: '₦5,000',
    priceNote: '/month',
    features: [
      'Everything in Personal',
      'Accept cNGN payments',
      '0.5% transaction fees',
      'Business dashboard',
      'Priority support',
      'API access',
      'Multi-user access',
    ],
    cta: 'Start Free Trial',
    featured: true,
  },
  {
    name: 'Enterprise',
    audience: 'For large organizations & fintechs',
    price: 'Custom',
    priceNote: 'Contact us',
    features: [
      'Everything in Business',
      'Custom integration',
      'Volume discounts',
      'Dedicated manager',
      'SLA guarantee',
      'White-label options',
      'Compliance support',
    ],
    cta: 'Contact Sales',
  },
]

export const footerColumns = [
  {
    title: 'Product',
    links: ['Buy Crypto', 'Pay Bills', 'Send Money', 'Business', 'API'],
  },
  {
    title: 'Resources',
    links: ['Documentation', 'Help Center', 'Blog', 'Community', 'Status'],
  },
  {
    title: 'Company',
    links: ['About', 'Careers', 'Press', 'Partners', 'Contact'],
  },
  {
    title: 'Legal',
    links: ['Privacy', 'Terms', 'Security', 'Compliance', 'Licenses'],
  },
]

export const socials = ['Twitter', 'LinkedIn', 'Instagram']
