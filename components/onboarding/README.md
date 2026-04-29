# Onboarding Components

This directory contains the wallet setup and onboarding flow components for Aframp.

## Components

### WalletSetupClient

The main wallet setup screen that guides users through securing their digital wallet with a 12-word recovery phrase.

**Features:**

- Step 3 of 4 in the onboarding flow
- Secure mnemonic phrase generation using Web Crypto API
- Reveal/hide toggle for recovery phrase
- Copy to clipboard functionality
- Security warnings and acknowledgment checkbox
- Skip warning modal for users who don't acknowledge
- Responsive design with animations
- Full accessibility support

**Security Considerations:**

- Mnemonic is generated client-side using cryptographically secure random values
- No plain-text storage of recovery phrases
- Clear warnings about never sharing the phrase
- Acknowledgment required before proceeding
- Warning modal if user tries to skip without acknowledging

**Usage:**

```tsx
import { WalletSetupClient } from '@/components/onboarding/wallet-setup-client'

export default function OnboardingPage() {
  return <WalletSetupClient />
}
```

## Routes

- `/onboarding` - Main wallet setup page (Step 3 of 4)

## Related Files

- `lib/wallet/mnemonic.ts` - Mnemonic generation and validation utilities
- `lib/wallet/__tests__/mnemonic.test.ts` - Tests for mnemonic utilities

## Design System

The components follow the Aframp design system:

- Emerald/mint green primary color
- Dark theme (obsidian) with warm neutrals
- Framer Motion animations
- Lucide React icons
- Radix UI primitives
- Tailwind CSS styling

## Accessibility

- ARIA labels and roles
- Keyboard navigation support
- Screen reader friendly
- Focus management
- High contrast warnings
- Semantic HTML

## Future Enhancements

- [ ] Add BIP39 library for full 2048-word list support
- [ ] Implement recovery phrase verification step (Step 4)
- [ ] Add wallet encryption with user password
- [ ] Integrate with Stellar wallet creation
- [ ] Add biometric authentication option
- [ ] Implement secure backup to cloud storage
