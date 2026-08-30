# 🌍 AFRAMP: Africa's Financial Bridge

[![CI](https://github.com/aframp/aframp/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/aframp/aframp/actions/workflows/ci.yml)
[[![codecov](https://img.shields.io/badge/coverage-1%25-red)](https://codecov.io/gh/Emmyt24/Aframp)
[[![codecov](https://img.shields.io/badge/coverage-1%25-red)](https://codecov.io/gh/Mac-5/Aframp)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.0-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/next.js-15.3-black)](https://nextjs.org/)

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
├── app/                    # Next.js App Router
│   ├── (app)/            # Authenticated routes
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Auth/login page
├── components/             # Reusable UI components
├── lib/                    # Utilities, API client, types
├── .env.example           # Environment variables template
├── package.json
└── README.md
```

---

## 🚀 Quick Start (5 Minutes)

Get AFRAMP running locally in under 5 minutes with our automated setup script or manual installation.

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

Access the app at `http://localhost:3001` ✅

#### Option 2: Node.js

**Prerequisites:** Node.js v20+ & npm

```bash
# Clone and install
git clone https://github.com/your-org/Aframp.git
cd Aframp
npm install

# Configure and run
cp .env.example .env.local
npm run dev
```

Access the app at `http://localhost:3001` ✅

---

## 🔧 Environment Variables

Copy `.env.example` to `.env.local` and configure the following:

### Required Variables

| Variable               | Description                            | Example               |
| ---------------------- | -------------------------------------- | --------------------- |
| `NEXT_PUBLIC_API_URL`  | Backend service URL (default: :3000)   | `http://127.0.0.1:3000` |

### Optional Variables

| Variable                     | Description                    |
| ---------------------------- | ------------------------------ |
| `NEXT_PUBLIC_SENTRY_DSN`     | Sentry error tracking endpoint |
| `SENTRY_AUTH_TOKEN`          | Sentry authentication token    |
| `SENTRY_ORG`                 | Sentry organization slug       |
| `SENTRY_PROJECT`             | Sentry project slug            |

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

### Production

```bash
# Build production image
docker build -t aframp:latest .

# Run production container
docker run -p 3001:3001 --env-file .env.local aframp:latest

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

## 📦 Available Scripts

| Command                 | Description                                    |
| ----------------------- | ---------------------------------------------- |
| `npm run dev`           | Start development server with hot-reload       |
| `npm run build`         | Build optimized production bundle              |
| `npm start`             | Start production server (requires build first) |
| `npm test`              | Run Jest test suite                            |
| `npm run test:watch`    | Run tests in watch mode                        |
| `npm run test:coverage` | Generate test coverage report                  |
| `npm run lint`          | Check code for linting errors                  |
| `npm run format`        | Format code with Prettier                      |
| `npm run type-check`    | Run TypeScript type checking                   |

---

## 🔍 Development Prerequisites

### Required

- **Node.js** v18 or higher
- **npm** v9 or higher
- **Git**
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Recommended

- **Docker Desktop** (for containerized development)
- **Stellar Freighter Wallet** (browser extension for testing)
- **VS Code** with recommended extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript and JavaScript Language Features

### Verify Installation

```bash
node --version  # Should be v18+
npm --version   # Should be v9+
docker --version  # Optional but recommended
```

---

## 🧪 Testing & Quality

- **Run Unit Tests:** Execute `npm test` to launch the test runner.
- **Code Linting:** Use `npm run lint` to check code style and catch errors.
- **Build for Production:** Run `npm run build` to create an optimized production build in the `.next/` folder.

---

## 🤝 How to Contribute

We welcome contributions from the community! To ensure a smooth process, please follow these guidelines.

### Contribution Workflow

1.  **Fork the Repository**: Start by forking the main AFRAMP repository to your own GitHub account.
2.  **Create a Feature Branch**: In your fork, create a new branch for your work (e.g., `feat/add-new-component` or `fix/transaction-bug`).
3.  **Implement Your Changes**: Write clear, well-commented code. Ensure your changes align with the project's architecture, which integrates with Stellar's ecosystem protocols (SEPs) for ramps and authentication.
4.  **Test Thoroughly**: Verify your changes work correctly and don't break existing functionality.
5.  **Submit a Pull Request (PR)**: Push your branch to your fork and open a PR against the main repository's `develop` or `main` branch. Clearly describe the problem and your solution.

### Pull Request Requirements

- **Title & Description**: Use a clear title and provide a detailed description of the changes.
- **Linked Issue**: Reference any related GitHub issue.
- **Code Quality**: Code must pass linting checks and existing tests.
- **Screenshots**: For UI changes, include before/after screenshots or screen recordings.

### Community & Conduct

We strive to maintain a respectful and inclusive environment. Please be constructive in discussions and reviews. Major feature proposals are best discussed by opening an issue first.

---

## 📚 Helpful Links & Resources

- **Stellar Documentation**: The foundation of our platform.
  - [Stellar Ecosystem Proposals (SEPs)](#)
  - [Anchor Platform Guide](#)
- **AFRAMP Backend Repository**: [Link to backend service repo]
- **Live Application**: [https://app.aframp.com](https://aframp.vercel.app/)
- **Verification Portal**: [https://verify.aframp.com](#) _(Live transaction explorer)_
- **Open an Issue**: Use GitHub Issues to report bugs or request features.

---

## 📄 License

This project is licensed under the **Apache 2.0 License**. By contributing, you agree that your contributions will be licensed under the same license.

---

_Built for Africa, Verified by Blockchain. Onramp to the future. Offramp to opportunity._ 🔗🌍
