# Architecture Overview

This document provides a comprehensive overview of the **Aframp** system architecture, highlighting component interactions, external service integrations, data persistence layer, and authentication mechanisms.

---

## 1. High-Level System Architecture

Aframp connects fiat financial rails across Africa (Paystack, M-Pesa, MTN MoMo) with the Stellar blockchain network to enable seamless digital asset onramping, offramping, bill payments, and peer-to-peer (P2P) transfers.

```mermaid
flowchart TD
    subgraph Client ["Client Layer"]
        UI["Web App (Next.js 14 App Router)"]
        Mobile["Mobile Web Browser"]
    end

    subgraph Server ["Application Layer (Next.js Core)"]
        API["Next.js API Routes / Middleware"]
        Auth["Authentication Module"]
        KYC["KYC Service / Withdrawal Engine"]
        Notifications["Notification & Event Engine"]
    end

    subgraph ExternalServices ["External Services & Financial Rails"]
        Stellar["Stellar Horizon Network"]
        Paystack["Paystack Payment Gateway"]
        MPesa["Safaricom M-Pesa (Daraja)"]
        MTN["MTN MoMo API"]
        KYCProvider["KYC Verification Provider"]
    end

    subgraph DataLayer ["Data & Persistence Layer"]
        DB[(Primary DB / JSON Store)]
        Redis[(Upstash Redis / Session & Cache)]
    end

    UI -->|HTTP / WebSockets| API
    Mobile -->|HTTP / WebSockets| API
    API --> Auth
    API --> KYC
    API --> Notifications

    API -->|Anchor / Payment Stream| Stellar
    API -->|Card / Bank Webhooks| Paystack
    API -->|STK Push / Callbacks| MPesa
    API -->|Mobile Money Transfer| MTN
    KYC -->|ID & Selfie Verification| KYCProvider

    API --> DB
    API --> Redis
```

---

## 2. Core User Flows

### A. Onramp Flow (Fiat to Crypto)
1. User selects digital asset amount and fiat payment method (Paystack / M-Pesa / MTN MoMo).
2. Application initiates fiat payment request (e.g., STK Push for M-Pesa or Checkout Session for Paystack).
3. Webhook listener receives payment status confirmation from external provider.
4. On success, Next.js backend issues/streams equivalent digital asset (cUSD/USDC/XLM) via Stellar Horizon to the user's wallet address.

### B. Offramp Flow (Crypto to Fiat)
1. User locks or transfers digital assets to the Aframp Stellar anchor wallet address.
2. Aframp monitors transaction completion via Stellar Horizon payment stream.
3. System verifies KYC withdrawal tier limits.
4. System executes fiat payout to user's bank account or mobile money wallet via Paystack Transfer API / M-Pesa B2C.

### C. Bill Payments Flow
1. User selects bill category (utility, airtime, Internet) and enters biller account details.
2. Backend validates biller schema (`lib/biller-schemas.ts`).
3. User confirms payment with digital asset or local fiat balance.
4. System settles payment with bill aggregator and notifies user.

### D. P2P Transfer Flow
1. Sender inputs receiver handle, phone number, or QR code (`lib/transfer-qr.ts`).
2. System resolves recipient wallet address.
3. Assets are transferred on-chain via Stellar Horizon with zero-friction transaction signing.

---

## 3. Data Persistence Layer

Aframp uses a hybrid persistence strategy designed for speed, security, and immutability:

- **Primary Database / Storage**: Manages user profiles, order status, KYC submissions, and biller metadata (`db/` & JSON stores for lightweight caching).
- **Upstash Redis**: Handles rate limiting, ephemeral session tokens, real-time notification streams (`app/api/notifications/stream`), and price alert polling queues (`app/api/pricealerts`).

---

## 4. Authentication Flow

```mermaid
sequenceDiagram
    autonumber
    participant Client as User Client
    participant Auth as Next.js Middleware / Auth
    participant Redis as Upstash Redis
    participant DB as User Store

    Client->>Auth: Submit Auth Credentials / Session Token
    Auth->>DB: Validate User Record
    Auth->>Redis: Create / Retrieve Active Session
    Redis-->>Auth: Return Validated Session Context
    Auth-->>Client: Issue Signed JWT / HTTP-Only Cookie
    Client->>Auth: Authenticated Requests (with Bearer Token / Cookie)
    Auth->>Auth: Middleware Checks Route Authorization & KYC Tier
```

1. **Session Management**: Secure authentication using Next.js Middleware with JWTs or HTTP-Only cookies.
2. **Authorization & RBAC**: Admin routes (`/admin/*`) and business features (`/business/*`) enforce role-based access checks and API key validation (`lib/business/api-keys.ts`).
