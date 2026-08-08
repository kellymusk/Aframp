# 🔐 Environment Variables Guide

Complete reference for **all** AFRAMP environment variables.

## Table of Contents

- [Quick Reference](#quick-reference)
- [Detailed Configuration](#detailed-configuration)
  - [Core / Next.js](#core--nextjs)
  - [Blockchain — Stellar Asset Issuers](#blockchain--stellar-asset-issuers)
  - [Payment Gateways — Paystack](#payment-gateways--paystack)
  - [Payment Gateways — Flutterwave](#payment-gateways--flutterwave)
  - [Mobile Money — M-Pesa (Daraja API)](#mobile-money--m-pesa-daraja-api)
  - [Mobile Money — MTN MoMo](#mobile-money--mtn-momo)
  - [Real-Time & Caching — Upstash Redis](#real-time--caching--upstash-redis)
  - [Error Tracking — Sentry](#error-tracking--sentry)
  - [CI / CD](#ci--cd)
  - [Optional Features](#optional-features)
- [Security Best Practices](#security-best-practices)
- [Platform-Specific Setup](#platform-specific-setup)
- [Validation](#validation)
- [Troubleshooting](#troubleshooting)

---

## Quick Reference

### Minimal Setup (Development)

```env
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_CNGN_ISSUER=GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG
```

### Full Production Setup

```env
# Core
NEXT_PUBLIC_API_URL=https://api.aframp.com
NEXT_PUBLIC_DEMO_MODE=false

# Stellar issuers
NEXT_PUBLIC_CNGN_ISSUER=GXXX...
NEXT_PUBLIC_USDC_ISSUER=GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN
NEXT_PUBLIC_CKES_ISSUER=GXXX...
NEXT_PUBLIC_CGHS_ISSUER=GXXX...

# Paystack
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_YOUR_KEY
PAYSTACK_SECRET_KEY=sk_live_YOUR_KEY

# Flutterwave
NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-xxxxx
FLUTTERWAVE_SECRET_KEY=FLWSECK-xxxxx
FLUTTERWAVE_ENCRYPTION_KEY=FLWSECKxxxxx

# M-Pesa
MPESA_CONSUMER_KEY=your_key
MPESA_CONSUMER_SECRET=your_secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your_passkey
MPESA_ENV=production

# MTN MoMo
MTN_MOMO_SUBSCRIPTION_KEY=your_key
MTN_MOMO_API_USER=your_uuid
MTN_MOMO_API_KEY=your_key
MTN_MOMO_ENV=production

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token

# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/yyy
SENTRY_DSN=https://xxx@sentry.io/yyy
SENTRY_AUTH_TOKEN=your_token
SENTRY_ORG=your_org
SENTRY_PROJECT=your_project

# CI / CD
VERCEL_TOKEN=your_token
VERCEL_ORG_ID=your_org_id
VERCEL_PROJECT_ID=your_project_id
CODECOV_TOKEN=your_token
LHCI_GITHUB_APP_TOKEN=your_token

# Optional
NEXT_PUBLIC_BILLS_WS_URL=wss://bills.aframp.com
```

---

## Detailed Configuration

---

### Core / Next.js

#### `NEXT_PUBLIC_API_URL`

**Type:** String (URL)  
**Required:** Yes  
**Visibility:** Client-side (public)

Base URL for all internal Next.js API routes. Used by client-side fetch calls.

```env
# Development
NEXT_PUBLIC_API_URL=http://localhost:3000

# Production
NEXT_PUBLIC_API_URL=https://api.aframp.com
```

---

#### `NEXT_PUBLIC_DEMO_MODE`

**Type:** Boolean (`true` | `false`)  
**Required:** Yes  
**Default:** `false`

Enables demo mode with mock wallet addresses for testing without real blockchain connections.

- **Development:** `true` (safe for local testing)
- **Staging:** `false`
- **Production:** `false` (MUST be false)

⚠️ **Security Warning:** Never set to `true` in production. This bypasses wallet authentication.

```env
NEXT_PUBLIC_DEMO_MODE=true   # development
NEXT_PUBLIC_DEMO_MODE=false  # production
```

---

### Blockchain — Stellar Asset Issuers

#### `NEXT_PUBLIC_CNGN_ISSUER`

**Type:** String (Stellar Address)  
**Required:** Yes  
**Format:** 56-character string starting with `G`

Stellar issuer address for the cNGN (Nigerian Naira stablecoin).

```env
NEXT_PUBLIC_CNGN_ISSUER=GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG
```

---

#### `NEXT_PUBLIC_USDC_ISSUER`

**Type:** String (Stellar Address)  
**Required:** Yes (for USDC transactions)  
**Format:** 56-character string starting with `G`

Stellar issuer address for the USDC stablecoin (Circle's official Stellar USDC issuer).

```env
NEXT_PUBLIC_USDC_ISSUER=GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN
```

---

#### `NEXT_PUBLIC_CKES_ISSUER`

**Type:** String (Stellar Address)  
**Required:** Yes (for cKES transactions)  
**Format:** 56-character string starting with `G`

Stellar issuer address for the cKES (Kenyan Shilling stablecoin).

```env
NEXT_PUBLIC_CKES_ISSUER=GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**How to get:** Contact the AFRAMP team or the cKES issuing authority.

---

#### `NEXT_PUBLIC_CGHS_ISSUER`

**Type:** String (Stellar Address)  
**Required:** Yes (for cGHS transactions)  
**Format:** 56-character string starting with `G`

Stellar issuer address for the cGHS (Ghanaian Cedi stablecoin).

```env
NEXT_PUBLIC_CGHS_ISSUER=GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

### Payment Gateways — Paystack

#### `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`

**Type:** String  
**Required:** For card payments  
**Visibility:** Client-side (public)

Paystack public key for client-side card payment initialization.

```env
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_YOUR_PUBLIC_KEY_HERE  # dev
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_YOUR_PUBLIC_KEY_HERE  # prod
```

**Getting Keys:** Sign up at [paystack.com](https://paystack.com) → Settings → API Keys & Webhooks.

---

#### `PAYSTACK_SECRET_KEY`

**Type:** String  
**Required:** For card payments  
**Visibility:** Server-side only (secret)

⚠️ Never expose in client-side code or commit to Git.

```env
PAYSTACK_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE  # dev
PAYSTACK_SECRET_KEY=sk_live_YOUR_SECRET_KEY_HERE  # prod
```

---

### Payment Gateways — Flutterwave

#### `NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY`

**Type:** String  
**Required:** For mobile money payments  
**Visibility:** Client-side (public)

```env
NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-X  # dev
NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-X       # prod
```

---

#### `FLUTTERWAVE_SECRET_KEY`

**Type:** String  
**Required:** For mobile money payments  
**Visibility:** Server-side only (secret)

```env
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-X  # dev
FLUTTERWAVE_SECRET_KEY=FLWSECK-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-X       # prod
```

---

#### `FLUTTERWAVE_ENCRYPTION_KEY`

**Type:** String  
**Required:** For mobile money payments  
**Visibility:** Server-side only (secret)

Flutterwave encryption key for securing payment data in transit.

```env
FLUTTERWAVE_ENCRYPTION_KEY=FLWSECK_TESTxxxxxxxxxxxxxxxx  # dev
FLUTTERWAVE_ENCRYPTION_KEY=FLWSECKxxxxxxxxxxxxxxxx       # prod
```

**Getting Keys:** [flutterwave.com](https://flutterwave.com) → Settings → API.

---

### Mobile Money — M-Pesa (Daraja API)

Used for M-Pesa STK Push payments (Kenya, Tanzania, Uganda, Mozambique).

**All five variables are required for M-Pesa integration.**

#### `MPESA_CONSUMER_KEY`

**Type:** String  
**Visibility:** Server-side only (secret)

```env
MPESA_CONSUMER_KEY=your_consumer_key_here
```

---

#### `MPESA_CONSUMER_SECRET`

**Type:** String  
**Visibility:** Server-side only (secret)

```env
MPESA_CONSUMER_SECRET=your_consumer_secret_here
```

---

#### `MPESA_SHORTCODE`

**Type:** String (numeric)  
**Description:** Safaricom Business Shortcode (Paybill or Till number).

```env
MPESA_SHORTCODE=174379       # sandbox default
MPESA_SHORTCODE=123456       # your production shortcode
```

---

#### `MPESA_PASSKEY`

**Type:** String  
**Visibility:** Server-side only (secret)

The Lipa Na M-Pesa passkey for generating the STK Push password.

```env
MPESA_PASSKEY=your_passkey_here
```

---

#### `MPESA_ENV`

**Type:** String (`sandbox` | `production`)  
**Default:** `sandbox`

Controls whether requests hit the Safaricom sandbox or production Daraja API.

```env
MPESA_ENV=sandbox     # development / staging
MPESA_ENV=production  # production
```

**Getting M-Pesa Keys:** Register at [developer.safaricom.co.ke](https://developer.safaricom.co.ke/).

---

### Mobile Money — MTN MoMo

Used for MTN Mobile Money Collection API (Ghana, Uganda, Rwanda, Ivory Coast, etc.).

**All four variables are required for MTN MoMo integration.**

#### `MTN_MOMO_SUBSCRIPTION_KEY`

**Type:** String  
**Visibility:** Server-side only (secret)

The Ocp-Apim-Subscription-Key for the MTN MoMo Collections product.

```env
MTN_MOMO_SUBSCRIPTION_KEY=your_subscription_key_here
```

---

#### `MTN_MOMO_API_USER`

**Type:** String (UUID)  
**Visibility:** Server-side only

The API User UUID provisioned for the Collections API.

```env
MTN_MOMO_API_USER=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

#### `MTN_MOMO_API_KEY`

**Type:** String  
**Visibility:** Server-side only (secret)

The API Key generated for the provisioned API User.

```env
MTN_MOMO_API_KEY=your_api_key_here
```

---

#### `MTN_MOMO_ENV`

**Type:** String (`sandbox` | `production`)  
**Default:** `sandbox`

```env
MTN_MOMO_ENV=sandbox     # development / staging
MTN_MOMO_ENV=production  # production
```

**Getting MTN MoMo Keys:** Register at [momodeveloper.mtn.com](https://momodeveloper.mtn.com/).

---

### Real-Time & Caching — Upstash Redis

Used for API rate limiting (100 req/min per IP) and caching hot data.

#### `UPSTASH_REDIS_REST_URL`

**Type:** String (HTTPS URL)  
**Required:** Yes (rate limiting is enabled in production)  
**Visibility:** Server-side only

```env
UPSTASH_REDIS_REST_URL=https://<your-db-name>.upstash.io
```

---

#### `UPSTASH_REDIS_REST_TOKEN`

**Type:** String  
**Required:** Yes  
**Visibility:** Server-side only (secret)

```env
UPSTASH_REDIS_REST_TOKEN=AXXXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Getting Upstash Keys:** Create a Redis database at [console.upstash.com](https://console.upstash.com) → copy the REST URL and token from the database dashboard.

---

### Error Tracking — Sentry

#### `NEXT_PUBLIC_SENTRY_DSN`

**Type:** String (Sentry DSN URL)  
**Required:** For error tracking  
**Visibility:** Client-side (public)

```env
NEXT_PUBLIC_SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@o0.ingest.sentry.io/0
```

---

#### `SENTRY_DSN`

**Type:** String (Sentry DSN URL)  
**Required:** For server-side error tracking  
**Visibility:** Server-side only

```env
SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@o0.ingest.sentry.io/0
```

---

#### `SENTRY_AUTH_TOKEN`

**Type:** String  
**Required:** For source-map upload during build  
**Visibility:** Server-side only (secret — CI secret)

```env
SENTRY_AUTH_TOKEN=sntryu_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

#### `SENTRY_ORG`

**Type:** String  
**Required:** For source-map upload  

```env
SENTRY_ORG=aframp
```

---

#### `SENTRY_PROJECT`

**Type:** String  
**Required:** For source-map upload  

```env
SENTRY_PROJECT=aframp-frontend
```

**Getting Sentry Config:** [sentry.io](https://sentry.io) → Settings → Projects → Client Keys (DSN).

---

### CI / CD

These variables are set as **GitHub Actions secrets** and never go into `.env.local`.

#### `VERCEL_TOKEN`

**Type:** String  
**Required:** For automated Vercel deployments  
**Set as:** GitHub Actions secret

```env
VERCEL_TOKEN=your_vercel_personal_access_token
```

---

#### `VERCEL_ORG_ID`

**Type:** String  
**Required:** For Vercel deployments  
**Set as:** GitHub Actions secret

```env
VERCEL_ORG_ID=team_xxxxxxxxxxxxxxxxxxxxxxxx
```

---

#### `VERCEL_PROJECT_ID`

**Type:** String  
**Required:** For Vercel deployments  
**Set as:** GitHub Actions secret

```env
VERCEL_PROJECT_ID=prj_xxxxxxxxxxxxxxxxxxxxxxxx
```

---

#### `CODECOV_TOKEN`

**Type:** String  
**Required:** For coverage upload to Codecov  
**Set as:** GitHub Actions secret

```env
CODECOV_TOKEN=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

#### `LHCI_GITHUB_APP_TOKEN`

**Type:** String  
**Required:** For Lighthouse CI GitHub status checks  
**Set as:** GitHub Actions secret

```env
LHCI_GITHUB_APP_TOKEN=your_lhci_github_app_token
```

##### `FLUTTERWAVE_SECRET_HASH`

**Type:** String  
**Required:** For Flutterwave webhooks  
**Visibility:** Server-side only (secret)

The secret hash configured under Flutterwave Settings → Webhooks. Used by
`app/api/webhooks/flutterwave` to verify that incoming webhook requests
actually came from Flutterwave (see `FlutterwaveGateway.verifyWebhookSignature`
in `lib/bills/payment-gateway.ts`).

```env
FLUTTERWAVE_SECRET_HASH=your_webhook_secret_hash_here
```

##### `PAYMENT_GATEWAY`

**Type:** String (`paystack` | `flutterwave`)  
**Required:** No  
**Default:** `paystack`

Fallback gateway used by `getPaymentGatewayService()` (`lib/bills/payment-gateway.ts`)
when a request doesn't pass an explicit gateway and no per-country default
applies (see `COUNTRY_GATEWAY_MAP` in `lib/bills/gateway-config.ts`).

```env
PAYMENT_GATEWAY=paystack
```

---

### Optional Features

#### `NEXT_PUBLIC_BILLS_WS_URL`

**Type:** String (WebSocket URL)  
**Required:** No  
**Format:** `wss://domain.com` or `ws://localhost:port`

WebSocket URL for real-time bill payment status updates.

```env
NEXT_PUBLIC_BILLS_WS_URL=ws://localhost:8080      # development
NEXT_PUBLIC_BILLS_WS_URL=wss://bills.aframp.com  # production
```

---

## Variable Summary Table

| Variable | Required | Side | Service |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Public | Core |
| `NEXT_PUBLIC_DEMO_MODE` | Yes | Public | Core |
| `NEXT_PUBLIC_CNGN_ISSUER` | Yes | Public | Stellar |
| `NEXT_PUBLIC_USDC_ISSUER` | Yes | Public | Stellar |
| `NEXT_PUBLIC_CKES_ISSUER` | Yes | Public | Stellar |
| `NEXT_PUBLIC_CGHS_ISSUER` | Yes | Public | Stellar |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Card payments | Public | Paystack |
| `PAYSTACK_SECRET_KEY` | Card payments | Server | Paystack |
| `NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY` | Mobile money | Public | Flutterwave |
| `FLUTTERWAVE_SECRET_KEY` | Mobile money | Server | Flutterwave |
| `FLUTTERWAVE_ENCRYPTION_KEY` | Mobile money | Server | Flutterwave |
| `MPESA_CONSUMER_KEY` | M-Pesa | Server | M-Pesa |
| `MPESA_CONSUMER_SECRET` | M-Pesa | Server | M-Pesa |
| `MPESA_SHORTCODE` | M-Pesa | Server | M-Pesa |
| `MPESA_PASSKEY` | M-Pesa | Server | M-Pesa |
| `MPESA_ENV` | M-Pesa | Server | M-Pesa |
| `MTN_MOMO_SUBSCRIPTION_KEY` | MTN MoMo | Server | MTN MoMo |
| `MTN_MOMO_API_USER` | MTN MoMo | Server | MTN MoMo |
| `MTN_MOMO_API_KEY` | MTN MoMo | Server | MTN MoMo |
| `MTN_MOMO_ENV` | MTN MoMo | Server | MTN MoMo |
| `UPSTASH_REDIS_REST_URL` | Rate limiting | Server | Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limiting | Server | Upstash |
| `NEXT_PUBLIC_SENTRY_DSN` | Error tracking | Public | Sentry |
| `SENTRY_DSN` | Error tracking | Server | Sentry |
| `SENTRY_AUTH_TOKEN` | Build (source maps) | CI secret | Sentry |
| `SENTRY_ORG` | Build (source maps) | CI secret | Sentry |
| `SENTRY_PROJECT` | Build (source maps) | CI secret | Sentry |
| `VERCEL_TOKEN` | CI/CD | CI secret | Vercel |
| `VERCEL_ORG_ID` | CI/CD | CI secret | Vercel |
| `VERCEL_PROJECT_ID` | CI/CD | CI secret | Vercel |
| `CODECOV_TOKEN` | CI/CD | CI secret | Codecov |
| `LHCI_GITHUB_APP_TOKEN` | CI/CD | CI secret | Lighthouse CI |
| `NEXT_PUBLIC_BILLS_WS_URL` | Optional | Public | WebSocket |

---

## Security Best Practices

### 1. Never Commit Secrets

```bash
# ✅ Good — template file only
git add .env.example

# ❌ Bad — contains real secrets
git add .env.local
```

Always use `.env.example` as a template and keep `.env.local` in `.gitignore`.

### 2. Use Different Keys Per Environment

| Environment | Key Type | Purpose |
|-------------|----------|---------|
| Development | Test / sandbox keys | Local testing, no real money |
| Staging | Test / sandbox keys | Pre-production testing |
| Production | Live keys | Real transactions |

### 3. Rotate Keys Regularly

- Rotate API keys every 90 days minimum.
- Immediately rotate if compromised.
- Use secrets management tools (AWS Secrets Manager, HashiCorp Vault, Azure Key Vault).

### 4. Limit Key Permissions

- Use the minimum required scopes.
- Restrict API keys to specific IP ranges when the provider supports it.
- Enable webhook signature verification for Paystack and Flutterwave.

### 5. Monitor Key Usage

- Set up alerts for unusual API activity.
- Review API logs weekly.
- Track failed authentication attempts.

---

## Platform-Specific Setup

### Vercel

**Dashboard:**
1. Project → Settings → Environment Variables
2. Add each variable and select the target environments (Production / Preview / Development)

**CLI:**
```bash
vercel env add NEXT_PUBLIC_DEMO_MODE
vercel env add PAYSTACK_SECRET_KEY
# repeat for each variable
```

### Railway

```bash
railway variables set NEXT_PUBLIC_DEMO_MODE=false
railway variables set PAYSTACK_SECRET_KEY=sk_live_...
```

### Render

Dashboard → Environment → Add Environment Variable.

### Docker

```bash
# Method 1: env file
docker run --env-file .env.local aframp:latest

# Method 2: docker-compose
services:
  aframp:
    env_file:
      - .env.local
```

### AWS (ECS Task Definition)

```json
{
  "secrets": [
    { "name": "PAYSTACK_SECRET_KEY", "valueFrom": "arn:aws:secretsmanager:..." },
    { "name": "UPSTASH_REDIS_REST_TOKEN", "valueFrom": "arn:aws:secretsmanager:..." }
  ]
}
```

---

## Validation

```bash
# Linux / Mac
./scripts/check-env.sh

# Windows
.\scripts\check-env.ps1
```

---

## Troubleshooting

### Variable Not Found

1. Restart the dev server after changing `.env.local`.
2. Verify the variable name (case-sensitive).
3. Client-side variables **must** have the `NEXT_PUBLIC_` prefix.
4. Ensure `.env.local` is in the project root (same directory as `package.json`).

### Client-Side Variables

Only variables prefixed with `NEXT_PUBLIC_` are available in the browser. All others are server-only.

### Docker Variables Not Loading

1. Confirm `.env.local` exists in the project root.
2. Ensure `docker-compose.yml` references `env_file: - .env.local`.
3. Rebuild: `docker-compose up --build`.

---

## Support

- 📖 [README.md](../README.md)
- 🚀 [DEPLOYMENT.md](../DEPLOYMENT.md)
- 🐛 [GitHub Issues](https://github.com/your-org/Aframp/issues)

---

**Secure Configuration = Secure Application** 🔐
