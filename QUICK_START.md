# ⚡ AFRAMP Quick Start Guide

**Get running in under 5 minutes!**

## 🎯 Goal

New developers should be able to clone the repo and have the app running locally in under 5 minutes.

## ✅ What's Been Added

### 1. Automated Setup Scripts
- **Linux/Mac**: `./scripts/setup.sh`
- **Windows**: `.\scripts\setup.ps1`

These scripts:
- Check prerequisites (Node.js, Docker)
- Create `.env.local` from template
- Let you choose Docker or Node.js setup
- Install dependencies and start the app

### 2. Docker Support
- **Dockerfile**: Multi-stage production build
- **Dockerfile.dev**: Development with hot-reload
- **docker-compose.yml**: Production deployment
- **docker-compose.dev.yml**: Development environment
- **docker-compose.prod.yml**: Production with logging
- **.dockerignore**: Optimized build context

### 3. Comprehensive Documentation
- **README.md**: Updated with 5-minute quick start
- **DEPLOYMENT.md**: Platform-specific deployment guides (Vercel, Railway, Render, AWS, GCP, Azure, DigitalOcean)
- **docs/ENVIRONMENT_VARIABLES.md**: Complete environment variables reference with security best practices

### 4. Environment Validation
- **scripts/check-env.sh**: Linux/Mac environment validator
- **scripts/check-env.ps1**: Windows environment validator

These scripts validate:
- Required variables are set
- Stellar address format is correct
- Security settings (demo mode, test vs live keys)

## 🚀 Quick Start Options

### Option 1: Automated Setup (Easiest)

**Linux/Mac:**
```bash
git clone https://github.com/your-org/Aframp.git
cd Aframp
chmod +x scripts/setup.sh
./scripts/setup.sh
```

**Windows:**
```powershell
git clone https://github.com/your-org/Aframp.git
cd Aframp
.\scripts\setup.ps1
```

### Option 2: Docker

```bash
git clone https://github.com/your-org/Aframp.git
cd Aframp
cp .env.example .env.local
docker-compose -f docker-compose.dev.yml up
```

### Option 3: Node.js

```bash
git clone https://github.com/your-org/Aframp.git
cd Aframp
npm install
cp .env.example .env.local
npm run dev
```

## 📋 Environment Variables

Minimum required for development:

```env
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_CNGN_ISSUER=GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG
```

For full functionality (payments), add:
- Paystack keys (card payments)
- Flutterwave keys (mobile money)

See `docs/ENVIRONMENT_VARIABLES.md` for complete reference.

## 🔍 Validation

Check your environment setup:

**Linux/Mac:**
```bash
chmod +x scripts/check-env.sh
./scripts/check-env.sh
```

**Windows:**
```powershell
.\scripts\check-env.ps1
```

## 📚 Documentation Structure

```
Aframp/
├── README.md                          # Project overview + quick start
├── DEPLOYMENT.md                      # Platform-specific deployment guides
├── QUICK_START.md                     # This file
├── docs/
│   └── ENVIRONMENT_VARIABLES.md       # Complete env vars reference
├── scripts/
│   ├── setup.sh                       # Automated setup (Linux/Mac)
│   ├── setup.ps1                      # Automated setup (Windows)
│   ├── check-env.sh                   # Env validation (Linux/Mac)
│   └── check-env.ps1                  # Env validation (Windows)
├── Dockerfile                         # Production Docker image
├── Dockerfile.dev                     # Development Docker image
├── docker-compose.yml                 # Production compose
├── docker-compose.dev.yml             # Development compose
└── docker-compose.prod.yml            # Production with logging
```

## ✨ Key Features

### For Developers
- **5-minute setup**: Automated scripts handle everything
- **Multiple options**: Choose Docker or Node.js
- **Hot-reload**: Development mode with instant updates
- **Validation**: Scripts check your environment setup
- **Cross-platform**: Works on Linux, Mac, and Windows

### For DevOps
- **Docker-ready**: Multi-stage builds for optimization
- **Platform guides**: Vercel, Railway, Render, AWS, GCP, Azure
- **Environment docs**: Complete reference with security best practices
- **Health checks**: Built into Docker images
- **Logging**: Configured for production deployments

## 🎯 Acceptance Criteria Met

✅ **Backend deploy documentation**: Complete guides for 7+ platforms  
✅ **Environment variables**: Comprehensive documentation with examples  
✅ **Docker support**: Production and development configurations  
✅ **5-minute setup**: Automated scripts for all platforms  

## 🔗 Next Steps

1. **Run the app**: Use one of the quick start options above
2. **Configure environment**: Edit `.env.local` with your API keys
3. **Validate setup**: Run the environment check scripts
4. **Deploy**: Follow `DEPLOYMENT.md` for your platform

## 📞 Support

- **Documentation**: See `README.md` and `DEPLOYMENT.md`
- **Environment Help**: See `docs/ENVIRONMENT_VARIABLES.md`
- **Issues**: [GitHub Issues](https://github.com/your-org/Aframp/issues)

---

**Built for Africa, Running Everywhere** 🌍⚡
