# 🌍 AFRAMP: Africa's Financial Bridge

[![CI](https://github.com/kellymusk/Aframp/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/kellymusk/Aframp/actions/workflows/ci.yml)
[![Uptime](https://github.com/kellymusk/Aframp/actions/workflows/uptime-monitor.yml/badge.svg?branch=main)](https://github.com/kellymusk/Aframp/actions/workflows/uptime-monitor.yml)
[![Coverage](https://codecov.io/gh/kellymusk/Aframp/branch/main/graph/badge.svg)](https://codecov.io/gh/kellymusk/Aframp)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.0-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/next.js-16.1-black)](https://nextjs.org/)

## Don't Trust, Verify

AFRAMP is a blockchain payment platform designed specifically for the African market, enabling seamless conversion between local currencies and digital assets. We specialize in **onramp** (fiat-to-crypto) and **offramp** (crypto-to-fiat) transactions using African stablecoins and provide essential services like bill payments.

Built on the **Stellar network** with multi-chain compatibility, AFRAMP connects traditional African financial systems (like mobile money and local banks) to global blockchain ecosystems. Our platform tackles the high costs and slow speeds of cross-border payments by leveraging blockchain for near-instant, low-fee settlements.

### Who It's For

- **African Users & Diaspora**: Send remittances, pay bills, and manage finances with minimal fees.
- **Businesses & Developers**: Integrate pan-African payments and treasury solutions.
- **Contributors**: Help build the future of African fintech with open, verifiable systems.

---

## 🏗️ Project Structure

The AFRAMP frontend repository is organized for clarity and scalability:

```
Aframp/
├── public/                 # Static assets
├── src/
│   ├── assets/            # Images, fonts, icons
│   ├── components/        # Reusable UI components (Buttons, Modals, etc.)
│   ├── contexts/          # React contexts (Auth, Wallet, Theme)
│   ├── hooks/             # Custom React hooks
│   ├── pages/             # Top-level page components (Dashboard, Onramp, Bills)
│   ├── services/          # API and blockchain service integrations
│   ├── styles/            # Global and module CSS/Tailwind config
│   ├── utils/             # Helper functions and constants
│   └── App.js             # Main application component
├── .env.example           # Environment variables template
├── package.json
└── README.md
```

## Architecture Decisions

- [ADR 001: Keep Backend Requests Behind a Same-Origin Proxy](docs/adr-001-backend-proxy.md)

---

## � API Reference

The client-side contract is documented in the repository root OpenAPI file:

- [openapi.yaml](openapi.yaml)

This spec covers the backend endpoints used by the frontend in [lib/api.ts](lib/api.ts).

### PWA Status

Offline caching and installable PWA support are currently disabled. Web Push payment alerts
remain available through a push-only service worker; the app does not cache pages or API data
for offline use.

## �🚀 Quick Start (5 Minutes)

Get AFRAMP running locally in under 5 minutes with our automated setup script or manual installation.

> ⚠️ **Port constraint — read this first.** The backend binds port **3000** and its `CORS_ALLOWED_ORIGINS` defaults to `http://localhost:3001`. The frontend must therefore run on **3001**, not Next.js's default 3000. If you start the app on 3000, every API request will fail with a silent CORS/network error. Set `NEXT_PUBLIC_API_URL` to point at the backend and run the frontend on 3001 (see `.env.example`).

### Automated Setup (Easiest) ⚡

**Linux/Mac:**

```bash
git clone https://github.com/your-org/Aframp.git
cd Aframp
chmod +x scripts/setup.sh
./scripts/setup.sh
```

**Windows (PowerShell):**

```powershell
git clone https://github.com/your-org/Aframp.git
cd Aframp
.\scripts\setup.ps1
```

The script will:

- ✅ Check prerequisites (Node.js, Docker)
- ✅ Create `.env.local` from template
- ✅ Let you choose Docker or Node.js setup
- ✅ Install dependencies and start the app

Access the app at `http://localhost:3001` ✅

### Manual Setup

#### Option 1: Docker (Recommended) 🐳

**Prerequisites:** Docker & Docker Compose installed

```bash
# Clone and start
git clone https://github.com/your-org/Aframp.git
cd Aframp
cp .env.example .env.local
docker-compose -f docker-compose.dev.yml up
```

Access the app at `http://localhost:3001` ✅ (the frontend is mapped to 3001 so it matches the backend's default `CORS_ALLOWED_ORIGINS`; see `docker-compose.dev.yml`).

#### Option 2: Node.js

**Prerequisites:** Node.js v18+ & npm

```bash
# Clone and install
git clone https://github.com/your-org/Aframp.git
cd Aframp
npm install

# Configure and run
cp .env.example .env.local
npm run dev -- -p 3001
```

Access the app at `http://localhost:3001` ✅ (run on 3001 so the backend's default `CORS_ALLOWED_ORIGINS=http://localhost:3001` accepts your requests).

---

## 🔧 Environment Variables

Copy `.env.example` to `.env.local` and configure the following:

### Required Variables

| Variable                  | Description                                                   | Example      |
| ------------------------- | ------------------------------------------------------------- | ------------ |
| `NEXT_PUBLIC_DEMO_MODE`   | Enable mock wallet for testing (set to `false` in production) | `false`      |
| `NEXT_PUBLIC_CNGN_ISSUER` | Stellar CNGN token issuer address                             | `GXXXXXX...` |

### Payment Gateway Configuration

| Variable                             | Description                          | Required For        |
| ------------------------------------ | ------------------------------------ | ------------------- |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`    | Paystack public key                  | Card payments       |
| `PAYSTACK_SECRET_KEY`                | Paystack secret key (server-side)    | Payment processing  |
| `NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY` | Flutterwave public key               | Mobile money        |
| `FLUTTERWAVE_SECRET_KEY`             | Flutterwave secret key (server-side) | Payment processing  |
| `FLUTTERWAVE_ENCRYPTION_KEY`         | Flutterwave encryption key           | Secure transactions |

### Optional Variables

| Variable                   | Description                              | Default |
| -------------------------- | ---------------------------------------- | ------- |
| `NEXT_PUBLIC_BILLS_WS_URL` | WebSocket URL for real-time bill updates | N/A     |

### Getting API Keys

- **Paystack**: Sign up at [paystack.com](https://paystack.com) → Settings → API Keys
- **Flutterwave**: Sign up at [flutterwave.com](https://flutterwave.com) → Settings → API
- **Stellar Issuer**: Use testnet issuer for development or contact AFRAMP team for production issuer

---

## 🐳 Docker Deployment

### Development

```bash
# Start with hot-reload
docker-compose up

# Rebuild after dependency changes
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

> ⚠️ The dev compose file maps the frontend to port **3001** because the backend binds 3000 and only allows `http://localhost:3001` by default via `CORS_ALLOWED_ORIGINS`. See `docker-compose.dev.yml` for the inline explanation.

### Production

```bash
# Build production image
docker build -t aframp:latest .

# Run production container
docker run -p 3000:3000 --env-file .env.local aframp:latest

# Or use docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### Docker Environment Variables

Pass environment variables via:

- `.env.local` file (recommended)
- Docker Compose `environment` section
- `docker run -e` flags

---

## 🚀 Backend Deployment

### Vercel (Recommended)

1. **Connect Repository**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Select the `Aframp` project

2. **Configure Environment Variables**
   - In Vercel dashboard → Settings → Environment Variables
   - Add all variables from `.env.example`
   - Set `NEXT_PUBLIC_DEMO_MODE=false` for production

3. **Deploy**
   - Vercel auto-deploys on push to `main`
   - Preview deployments for PRs
   - Production URL: `https://your-project.vercel.app`

### Other Platforms

#### Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

#### Render

1. Create new Web Service
2. Connect GitHub repository
3. Build Command: `npm run build`
4. Start Command: `npm start`
5. Add environment variables in dashboard

#### AWS/GCP/Azure

Use the provided `Dockerfile` for containerized deployment:

```bash
# Build and push to container registry
docker build -t aframp:latest .
docker tag aframp:latest your-registry/aframp:latest
docker push your-registry/aframp:latest

# Deploy using your platform's container service
# (ECS, Cloud Run, Container Apps, etc.)
```

---

## 🛠️ Troubleshooting

### All API calls fail with a network error

If every request to the backend fails (browser console shows CORS errors or `net::ERR_FAILED`), you are almost certainly running the frontend on the wrong port.

- The backend binds port **3000** and its `CORS_ALLOWED_ORIGINS` defaults to `http://localhost:3001`.
- Next.js defaults to port **3000**, which collides with the backend and is not in the allowed origins list.

**Fix:** run the frontend on **3001** and point it at the backend:

```bash
# Node.js
npm run dev -- -p 3001

# Docker (already configured in docker-compose.dev.yml)
docker-compose -f docker-compose.dev.yml up
```

Make sure `.env.local` sets `NEXT_PUBLIC_API_URL` to the backend URL (e.g. `http://localhost:3000`) and that the backend's `CORS_ALLOWED_ORIGINS` includes your frontend origin (`http://localhost:3001` by default). See `.env.example` for details.

---

## 📦 Available Scripts

| Command | Description |
| ------- | ----------- |

_Built for Africa, Verified by Blockchain. Onramp to the future. Offramp to opportunity._ 🔗🌍

## Handsoff notes
