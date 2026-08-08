# 🚀 AFRAMP Deployment Guide

Complete guide for deploying AFRAMP to various platforms.

## Table of Contents

- [Quick Start](#quick-start)
- [Environment Configuration](#environment-configuration)
- [Docker Deployment](#docker-deployment)
- [Platform-Specific Guides](#platform-specific-guides)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Local Development (5 Minutes)

```bash
# Clone repository
git clone https://github.com/your-org/Aframp.git
cd Aframp

# Setup environment
cp .env.example .env.local

# Option 1: Docker (Recommended)
docker-compose -f docker-compose.dev.yml up

# Option 2: Node.js
npm install && npm run dev
```

Access at `http://localhost:3000` ✅

---

## Environment Configuration

### Required Variables

Create `.env.local` with these variables:

```env
# Demo Mode (false in production)
NEXT_PUBLIC_DEMO_MODE=false

# Stellar Configuration
NEXT_PUBLIC_CNGN_ISSUER=GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Paystack (for card payments)
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxx

# Flutterwave (for mobile money)
NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-xxxxxxxxxxxxx
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-xxxxxxxxxxxxx
FLUTTERWAVE_ENCRYPTION_KEY=FLWSECK_TESTxxxxxxxxxxxxx

# Optional: WebSocket for real-time updates
NEXT_PUBLIC_BILLS_WS_URL=wss://your-websocket-url.com
```

### Getting API Keys

1. **Paystack**
   - Sign up at [paystack.com](https://paystack.com)
   - Navigate to Settings → API Keys & Webhooks
   - Copy Test keys for development, Live keys for production

2. **Flutterwave**
   - Sign up at [flutterwave.com](https://flutterwave.com)
   - Go to Settings → API
   - Copy Test keys for development, Live keys for production

3. **Stellar Issuer**
   - Development: Use testnet issuer
   - Production: Contact AFRAMP team or deploy your own issuer

---

## Docker Deployment

### Development Mode

Hot-reload enabled for rapid development:

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up

# Rebuild after package.json changes
docker-compose -f docker-compose.dev.yml up --build

# Run in background
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop
docker-compose -f docker-compose.dev.yml down
```

### Production Mode

Optimized build with multi-stage Dockerfile:

```bash
# Build and start
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop
docker-compose -f docker-compose.prod.yml down
```

### Custom Docker Commands

```bash
# Build production image
docker build -t aframp:latest .

# Run with custom port
docker run -p 8080:3000 --env-file .env.local aframp:latest

# Run with environment variables
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_DEMO_MODE=false \
  -e NEXT_PUBLIC_CNGN_ISSUER=GXXX... \
  aframp:latest
```

---

## Platform-Specific Guides

### Vercel (Recommended for Next.js)

**Pros:** Zero-config, automatic deployments, edge network, preview deployments

1. **Setup**
   ```bash
   # Install Vercel CLI (optional)
   npm i -g vercel
   ```

2. **Deploy via Dashboard**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Configure:
     - Framework Preset: Next.js
     - Root Directory: `./`
     - Build Command: `npm run build`
     - Output Directory: `.next`

3. **Environment Variables**
   - In Vercel Dashboard → Settings → Environment Variables
   - Add all variables from `.env.example`
   - Set different values for Production/Preview/Development

4. **Deploy**
   ```bash
   # Via CLI
   vercel --prod

   # Or push to main branch (auto-deploys)
   git push origin main
   ```

### Railway

**Pros:** Simple deployment, built-in databases, affordable pricing

1. **Setup**
   ```bash
   # Install Railway CLI
   npm i -g @railway/cli

   # Login
   railway login
   ```

2. **Deploy**
   ```bash
   # Initialize project
   railway init

   # Add environment variables
   railway variables set NEXT_PUBLIC_DEMO_MODE=false
   railway variables set NEXT_PUBLIC_CNGN_ISSUER=GXXX...

   # Deploy
   railway up
   ```

3. **Configure**
   - Railway auto-detects Next.js
   - Custom domain: Settings → Domains
   - Environment variables: Variables tab

### Render

**Pros:** Free tier available, simple setup, automatic SSL

1. **Setup**
   - Go to [render.com](https://render.com)
   - Click "New +" → "Web Service"
   - Connect GitHub repository

2. **Configure**
   - Name: `aframp`
   - Environment: `Docker` or `Node`
   - Build Command: `npm run build`
   - Start Command: `npm start`
   - Instance Type: Free or Starter

3. **Environment Variables**
   - Add all variables from `.env.example`
   - Click "Add Environment Variable" for each

4. **Deploy**
   - Click "Create Web Service"
   - Render auto-deploys on push to main

### AWS (ECS/Fargate)

**Pros:** Enterprise-grade, scalable, full control

1. **Build and Push Image**
   ```bash
   # Login to ECR
   aws ecr get-login-password --region us-east-1 | \
     docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

   # Build image
   docker build -t aframp:latest .

   # Tag image
   docker tag aframp:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/aframp:latest

   # Push image
   docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/aframp:latest
   ```

2. **Create ECS Service**
   - Create ECS Cluster
   - Create Task Definition (use pushed image)
   - Create Service with Load Balancer
   - Configure environment variables in Task Definition

3. **Environment Variables**
   - Use AWS Systems Manager Parameter Store or Secrets Manager
   - Reference in Task Definition

### Google Cloud Run

**Pros:** Serverless, auto-scaling, pay-per-use

```bash
# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT_ID/aframp
gcloud run deploy aframp \
  --image gcr.io/PROJECT_ID/aframp \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NEXT_PUBLIC_DEMO_MODE=false,NEXT_PUBLIC_CNGN_ISSUER=GXXX...
```

### Azure Container Apps

**Pros:** Integrated with Azure ecosystem, Kubernetes-based

```bash
# Create resource group
az group create --name aframp-rg --location eastus

# Create container app
az containerapp create \
  --name aframp \
  --resource-group aframp-rg \
  --image <your-registry>/aframp:latest \
  --target-port 3000 \
  --ingress external \
  --env-vars NEXT_PUBLIC_DEMO_MODE=false NEXT_PUBLIC_CNGN_ISSUER=GXXX...
```

### DigitalOcean App Platform

**Pros:** Simple, affordable, managed infrastructure

1. **Setup**
   - Go to [digitalocean.com](https://digitalocean.com)
   - Click "Create" → "Apps"
   - Connect GitHub repository

2. **Configure**
   - Detected as: Node.js/Next.js
   - Build Command: `npm run build`
   - Run Command: `npm start`

3. **Environment Variables**
   - Add in App Settings → Environment Variables

---

## Troubleshooting

### Build Failures

**Issue:** `Module not found` errors

```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run build
```

**Issue:** TypeScript errors

```bash
# Run type check
npm run type-check

# Fix or temporarily ignore in next.config.mjs
typescript: { ignoreBuildErrors: true }
```

### Docker Issues

**Issue:** Container exits immediately

```bash
# Check logs
docker-compose logs aframp-app

# Verify environment variables
docker-compose config
```

**Issue:** Port already in use

```bash
# Change port in docker-compose.yml
ports:
  - "3001:3000"  # Use 3001 instead
```

**Issue:** Hot-reload not working in dev mode

```bash
# Add to docker-compose.dev.yml
environment:
  - WATCHPACK_POLLING=true
```

### Runtime Errors

**Issue:** API keys not working

- Verify keys are correct (test vs live)
- Check environment variable names (must start with `NEXT_PUBLIC_` for client-side)
- Restart server after changing `.env.local`

**Issue:** Stellar transactions failing

- Verify `NEXT_PUBLIC_CNGN_ISSUER` is correct
- Check network (testnet vs mainnet)
- Ensure wallet has sufficient XLM for fees

### Performance Issues

**Issue:** Slow page loads

```bash
# Enable production optimizations
NODE_ENV=production npm run build
npm start

# Or use Docker production build
docker-compose -f docker-compose.prod.yml up
```

**Issue:** High memory usage

- Increase Docker memory limit
- Optimize images and assets
- Enable Next.js image optimization

---

## Health Checks

### Docker Health Check

Built into Dockerfile:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:3000', ...)"
```

### Manual Health Check

```bash
# Check if app is running
curl http://localhost:3000

# Check with timeout
curl --max-time 5 http://localhost:3000
```

---

## Security Best Practices

1. **Never commit `.env.local`** - Use `.env.example` as template
2. **Use secrets management** - AWS Secrets Manager, Azure Key Vault, etc.
3. **Set `NEXT_PUBLIC_DEMO_MODE=false`** in production
4. **Use HTTPS** - All platforms provide free SSL
5. **Rotate API keys** regularly
6. **Monitor logs** for suspicious activity

---

## Support

- **Documentation:** [README.md](./README.md)
- **Issues:** [GitHub Issues](https://github.com/your-org/Aframp/issues)
- **Community:** [Discord/Slack link]

---

**Built for Africa, Deployed Everywhere** 🌍🚀
