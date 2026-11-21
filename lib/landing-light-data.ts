/**
 * Copy for the light landing page, transcribed from
 * designs/1920w light(1).png.
 *
 * Note on the FAQ: the design only renders the answer to the first
 * question — the rest are collapsed. The remaining answers below were
 * written from the surrounding page copy and should be reviewed before
 * this page ships.
 */

export const nav = [
  { label: 'About', href: '#use-cases' },
  { label: 'Services', href: '#how-it-works' },
  { label: 'Contact', href: '#contact' },
  { label: 'FAQs', href: '#faq' },
]

export const hero = {
  titleBefore: "Africa's gateway to",
  titleHighlight: 'global decentralized',
  titleAfter: 'finance',
  blurb:
    'Fast, secure, and effortless for everyday spending. Send money to anyone in Africa instantly.',
  amountLabel: 'Enter Payment Amount',
}

// The lead tile in the "Everything You Need to Transact" grid — a wider
// card with a live-rate strip and a sample recent-activity feed.
export const useCasesLead = {
  title: 'Buy USDC from ₦2,000',
  blurb:
    'Start your stablecoin journey with as little as 2,000 naira — buy USDC with instant settlement.',
  rate: { left: '1 USDC', right: '$1.00' },
  ticker: [
    { label: 'USDC Buy', amount: '₦50,000' },
    { label: 'Bank Payout', amount: '₦15,000' },
    { label: 'USDC Sell', amount: '₦120,000' },
  ],
}

export type UseCaseTile = {
  title: string
  blurb: string
  chips?: string[]
  metric?: { value: string; label: string }
}

export const useCaseTiles: UseCaseTile[] = [
  {
    title: 'No Hidden Fees',
    blurb: 'What you send is what they receive. We show the exact rate up front.',
  },
  {
    title: 'Business Payments',
    blurb:
      'Accept USDC payments through Aframp — built for merchants and SMEs expanding across Africa.',
  },
  {
    title: 'Instant Settlement',
    blurb: "Confirm the send; recipient's bank is notified in seconds.",
    metric: { value: '~5s', label: 'Stellar ledger close time' },
  },
  {
    title: 'Bank-Grade Security',
    blurb: 'Aframp is non-custodial — your USDC stays in your wallet until the moment you send it.',
    chips: ['Non-Custodial', 'Encrypted'],
  },
  {
    title: 'Pan-African Reach',
    blurb: 'Send money across supported African countries with zero forex headaches.',
    chips: ['NG', 'GH', 'KE', 'BN'],
  },
]

export const steps = [
  {
    title: 'Enter Amount & Recipient/Your Wallet',
    blurb:
      "Select payout currency and enter recipient bank/mobile money details or your Stellar wallet—depending on if you're buying or sending.",
  },
  {
    title: 'Review Live Rate & Details',
    blurb: "We show the exact rate and calculate what you'll send.",
  },
  {
    title: 'Send or Receive USDC',
    blurb:
      'Buying? Share your Stellar wallet address. Spending? Send USDC (or another supported stablecoin) to Aframp. All flows supported.',
  },
  {
    title: 'Instant Payout or Delivery',
    blurb:
      "Get instant payout to a recipient's bank/mobile money or have USDC land in your wallet. Most settle in seconds!",
  },
]

export const faqs = [
  {
    q: 'How do I buy and save in USDC, or send money to someone in Africa with Aframp?',
    a: 'Just choose how much you want, follow a few prompts, and your USDC or payout is delivered instantly. Aframp lets you buy and save in USDC and other Stellar stablecoins—and send money across Africa (currently Nigeria; Ghana, Kenya, & Benin coming soon) without hassle.',
  },
  {
    q: 'What are the requirements? Is an account or identity verification needed?',
    a: 'You can start with just a phone number. Larger transfers may require identity verification to meet local regulations.',
  },
  {
    q: 'Are there minimums, maximums, or other limits?',
    a: 'Transfers start from a small minimum so you can try the service, with upper limits that scale as your account is verified.',
  },
  {
    q: 'How fast are transactions processed?',
    a: 'Most settle in seconds thanks to the Stellar network. Bank and mobile money payouts depend on the receiving institution, but are typically near-instant.',
  },
  {
    q: 'What wallets can I use with Aframp?',
    a: 'Any Stellar wallet that holds USDC or another supported stablecoin. You keep custody of your own funds.',
  },
  {
    q: 'Are there any hidden fees?',
    a: 'No. What you send is what they receive, and the exact rate is shown before you confirm.',
  },
  {
    q: 'Which countries are supported?',
    a: 'Nigeria today, with Ghana, Kenya and Benin coming soon.',
  },
  {
    q: 'Can I really spend without selling all my crypto?',
    a: 'Yes. Spend only what you need for a given payment and keep the rest of your USDC and other stablecoin holdings intact.',
  },
  {
    q: 'Is Aframp custodial?',
    a: 'No. Aframp is non-custodial — your USDC stays in your wallet until you send it.',
  },
  {
    q: 'What happens if a payout fails? What support is available?',
    a: 'Failed payouts are returned to you automatically, and support is reachable by email at any point in the process.',
  },
]

export const whyUs = [
  {
    title: 'High remittance fees that drain income.',
    blurb:
      'Traditional money transfers often come with high fees that reduce the amount families receive. Aframp provides a low-cost alternative using Stellar USDC, keeping more money in the hands of your loved ones.',
  },
  {
    title: 'Unstable exchange rates and fast devaluation',
    blurb:
      'In many regions, local currencies lose value quickly. Aframp helps users hold and convert into USDC and other stablecoins, providing protection from currency devaluation.',
  },
  {
    title: 'Limited access to reliable cross-border payments',
    blurb:
      "Banking systems aren't always accessible or efficient for international transactions. Aframp bridges the gap with seamless cross-border stablecoin transfers that are reliable and secure.",
  },
  {
    title: 'Delays or friction when receiving funds from abroad',
    blurb:
      'Waiting days to receive money can disrupt everyday life. Aframp enables near-instant USDC-based payments on Stellar, giving recipients faster access to their funds.',
  },
]

export const footer = {
  tagline: 'Spend USDC. Keep Your Savings.',
  // `href` is optional: entries without one render as "coming soon" instead of
  // a dead link. Set it once the destination page / profile exists.
  links: [
    { label: 'Blog', href: undefined as string | undefined },
    { label: 'Terms', href: undefined as string | undefined },
    { label: 'Privacy', href: undefined as string | undefined },
  ],
  socials: [
    { label: 'Telegram', href: undefined as string | undefined },
    { label: 'Twitter', href: undefined as string | undefined },
    { label: 'Email', href: 'mailto:getAframp@gmail.com' as string | undefined },
  ],
  support: 'getAframp@gmail.com',
  business: 'partners@Aframp.com',
  copyright: '© 2026 Aframp. All rights reserved.',
}
