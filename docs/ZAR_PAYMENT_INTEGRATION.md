# ZAR Payment Provider Integration Plan

## Summary

This document outlines the recommended implementation strategy for integrating South African Rand (ZAR) payment processing into Aframp. ZAR is currently listed in the `FiatCurrency` type but lacks a functional payment provider.

## Recommended Solution: **Ozow**

Ozow is a South African fintech company specializing in instant, secure bank-to-bank payments (instant EFT).

### Key Features
- ✅ **Instant EFT**: Real-time bank-to-bank transfers
- ✅ **Bank API Integration**: Direct connection with FNB, RMB, Absa, Nedbank
- ✅ **PayShap Support**: Instant payments using phone/account number
- ✅ **Irrevocable Payments**: No chargebacks
- ✅ **Lower Fees**: ~1.5% vs 2.9%+ for cards (56% savings)
- ✅ **Real-time Settlement**: Funds settle instantly

### Supported Banks
- First National Bank (FNB)
- Rand Merchant Bank (RMB)
- Absa
- Nedbank
- Standard Bank
- Capitec
- Discovery Bank

## Cost Analysis

**Fee Comparison (ZAR 1000 transaction)**

| Provider | Method | Fee | Total Fee |
|----------|--------|-----|-----------|
| Paystack | Card | 2.9% + R1 + 15% VAT | R34.35 |
| **Ozow** | **Instant EFT** | **~1.5%** | **~R15.00** |

**Annual Savings**: ~R193,500/year (10,000 transactions @ R1000 avg)

## Implementation Plan

### Phase 1: Account Setup
- [ ] Register for Ozow merchant account
- [ ] Obtain API credentials (API key, private key, site code)
- [ ] Configure webhook endpoints
- [ ] Complete KYC requirements

### Phase 2: Backend Implementation (IN PROGRESS - Frontend Ready)
- [ ] Add Ozow payment provider to backend (Rust/Axum)
- [ ] Implement payment initiation endpoint: `/onramp/ozow/initiate`
- [ ] Handle webhook callbacks: `/webhooks/ozow`
- [ ] Add payment verification logic: `/onramp/ozow/verify/{id}`
- [ ] Implement refund functionality

### Phase 3: Frontend Implementation ✅ COMPLETE
- [x] Create Ozow payment flow UI component (`components/onramp/zar-onramp.tsx`)
- [x] Add bank selection interface (9 major SA banks)
- [x] Implement redirect handling
- [x] Update fee calculation (1.5% - `lib/payment-providers.ts`)
- [x] Add payment provider types and utilities
- [x] Update environment variables in `.env.example`

### Phase 4: Testing & Rollout
- [ ] Test with Ozow sandbox
- [ ] Verify all major bank integrations
- [ ] Beta testing with select users
- [ ] Production rollout with feature flag

## Environment Variables

Add to `.env.example`:

```bash
# Ozow Configuration (South Africa - ZAR)
OZOW_API_KEY=your_api_key
OZOW_PRIVATE_KEY=your_private_key
OZOW_SITE_CODE=your_site_code
OZOW_IS_TEST=true  # false for production
OZOW_WEBHOOK_URL=https://api.aframp.com/webhooks/ozow
```

## Timeline Estimate

| Phase | Duration |
|-------|----------|
| Ozow Account Setup | 1-2 weeks |
| Backend Development | 2-3 weeks |
| Frontend Development | 1-2 weeks |
| Testing & QA | 1-2 weeks |
| Beta Rollout | 2-4 weeks |
| Full Production | 1 week |
| **Total** | **8-14 weeks** |

## Alternative Providers

### Paystack (Current Provider - Limited ZAR)
- ✅ Card payments supported
- ✅ Fee: 2.9% + ZAR 1 (+ 15% VAT)
- ⚠️ Limited instant EFT coverage

### Flutterwave (Current Provider - Partial ZAR)
- ✅ Supports ZAR via ACH payment method
- ⚠️ ACH not optimized for instant payments

### Peach Payments (Alternative)
- ✅ Multiple payment methods (cards, EFT, wallets)
- ✅ Payment orchestration capabilities
- ⚠️ More complex integration

## Success Metrics

- **Transaction Success Rate**: Target >95%
- **Average Settlement Time**: Target <5 minutes
- **Payment Fee Cost**: Track % of transaction value
- **Monthly ZAR Volume**: Growth tracking

## Resources

- [Ozow Pay by Bank](https://ozow.com/pay-by-bank)
- [Ozow Integrations](https://ozow.com/integrations)
- [Paystack ZAR Pricing](https://paystack.com/za/pricing)
- [Flutterwave South Africa](https://developer.flutterwave.com/v3.0.0/docs/south-africa-1)

---

**Created**: 2026-08-29  
**Status**: Proposal / Planning  
**Related Issue**: #3
