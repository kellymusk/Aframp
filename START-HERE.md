# 🚀 CI/CD Pipeline - START HERE

Welcome! This document will get you started with the AFRAMP CI/CD pipeline in 5 minutes.

---

## ⚡ Quick Start (5 Minutes)

### Step 1: Understand What Was Built (2 min)
Read: [`CI-CD-COMPLETION-REPORT.md`](./CI-CD-COMPLETION-REPORT.md)

### Step 2: Get the Quick Reference (1 min)
Read: [`CI-CD-QUICK-REFERENCE.md`](./CI-CD-QUICK-REFERENCE.md)

### Step 3: Test Locally (2 min)
```bash
./test-ci-local.sh
```

---

## 📚 Documentation Map

### 🎯 I'm a Developer
1. [`CI-CD-QUICK-REFERENCE.md`](./CI-CD-QUICK-REFERENCE.md) - Common commands
2. [`CONTRIBUTING.md`](./CONTRIBUTING.md) - How to contribute
3. [`CI-CD-SETUP.md`](./CI-CD-SETUP.md) - Setup details

### 🔧 I'm Setting Up CI/CD
1. [`CI-CD-COMPLETION-REPORT.md`](./CI-CD-COMPLETION-REPORT.md) - What was built
2. [`CI-CD-SETUP-CHECKLIST.md`](./CI-CD-SETUP-CHECKLIST.md) - Step-by-step
3. [`CI-CD-SETUP.md`](./CI-CD-SETUP.md) - Configuration details

### 🏗️ I'm an Architect
1. [`CI-CD-IMPLEMENTATION-SUMMARY.md`](./CI-CD-IMPLEMENTATION-SUMMARY.md) - Overview
2. [`.github/CI-CD-ARCHITECTURE.md`](./.github/CI-CD-ARCHITECTURE.md) - Architecture
3. [`.github/WORKFLOWS.md`](./.github/WORKFLOWS.md) - Workflow details

### 🗺️ I Need Navigation
→ [`CI-CD-INDEX.md`](./CI-CD-INDEX.md) - Complete index

---

## 🎯 What Was Built

✅ **Automated Code Quality**
- ESLint, Prettier, TypeScript checks
- Runs on every push/PR

✅ **Test Coverage Tracking**
- Jest tests with coverage
- 70% minimum threshold
- Codecov integration

✅ **Coverage Badge Automation**
- Auto-generated badges
- Color-coded status (🟢🟡🔴)
- README auto-update

✅ **Build Verification**
- Next.js production build
- Artifact upload

✅ **Local CI Simulation**
- `./test-ci-local.sh` script
- Test before pushing

✅ **Comprehensive Documentation**
- 11 documentation files
- Setup guides
- Quick reference
- Architecture diagrams

---

## 🚀 Get Started Now

### For Developers

```bash
# 1. Test locally before pushing
./test-ci-local.sh

# 2. Make changes
git add .
git commit -m "feat: add feature"

# 3. Push
git push origin feature/name

# 4. Create PR on GitHub
# 5. Wait for checks
# 6. Review coverage report
```

### For Setup

1. Configure GitHub secrets (Settings → Secrets)
2. Run `./test-ci-local.sh` locally
3. Create test PR
4. Verify all checks pass
5. Share docs with team

---

## 📊 Pipeline Overview

```
Your Code
    ↓
GitHub Actions
    ↓
Code Quality ──┐
Tests ─────────┼─→ Build ──→ Ready to Merge
Coverage ──────┘
```

**Duration:** ~10-15 minutes

---

## 🔐 GitHub Secrets Needed

Configure in Settings → Secrets and variables:

```
CODECOV_TOKEN              # Codecov
NEXT_PUBLIC_API_URL        # API endpoint
NEXT_PUBLIC_STELLAR_NETWORK # Stellar network
```

---

## 📋 Common Commands

```bash
# Test locally
./test-ci-local.sh

# Run individual checks
npm run lint              # ESLint
npm run format:check      # Prettier
npm run type-check        # TypeScript
npm run test:coverage     # Tests
npm run build             # Build

# Auto-fix issues
npm run format            # Fix formatting
npm run lint -- --fix     # Fix linting
```

---

## 🎓 Learning Path

### 5 Minutes
- Read this file
- Run `./test-ci-local.sh`

### 15 Minutes
- Read [`CI-CD-QUICK-REFERENCE.md`](./CI-CD-QUICK-REFERENCE.md)
- Read [`CONTRIBUTING.md`](./CONTRIBUTING.md)

### 30 Minutes
- Read [`CI-CD-SETUP.md`](./CI-CD-SETUP.md)
- Review [`.github/WORKFLOWS.md`](./.github/WORKFLOWS.md)

### 60 Minutes
- Read [`.github/CI-CD-ARCHITECTURE.md`](./.github/CI-CD-ARCHITECTURE.md)
- Review all workflow files
- Plan customizations

---

## ✅ Success Checklist

- [ ] Read this file
- [ ] Run `./test-ci-local.sh` locally
- [ ] Read [`CI-CD-QUICK-REFERENCE.md`](./CI-CD-QUICK-REFERENCE.md)
- [ ] Read [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- [ ] Configure GitHub secrets
- [ ] Create test PR
- [ ] Verify checks pass
- [ ] Share docs with team

---

## 🚨 Troubleshooting

### Tests Failing
```bash
rm -rf node_modules package-lock.json
npm install
npm run test:coverage
```

### Build Errors
```bash
npm run type-check
npm run lint
npm run build
```

### Need Help?
→ [`CI-CD-QUICK-REFERENCE.md`](./CI-CD-QUICK-REFERENCE.md#troubleshooting)

---

## 📞 Support

| Question | Answer |
|----------|--------|
| How do I contribute? | [`CONTRIBUTING.md`](./CONTRIBUTING.md) |
| What commands do I use? | [`CI-CD-QUICK-REFERENCE.md`](./CI-CD-QUICK-REFERENCE.md) |
| How do I set it up? | [`CI-CD-SETUP.md`](./CI-CD-SETUP.md) |
| What was built? | [`CI-CD-COMPLETION-REPORT.md`](./CI-CD-COMPLETION-REPORT.md) |
| How does it work? | [`.github/CI-CD-ARCHITECTURE.md`](./.github/CI-CD-ARCHITECTURE.md) |
| Where's everything? | [`CI-CD-INDEX.md`](./CI-CD-INDEX.md) |

---

## 🎯 Next Steps

### Right Now
1. Run `./test-ci-local.sh`
2. Read [`CI-CD-QUICK-REFERENCE.md`](./CI-CD-QUICK-REFERENCE.md)

### This Week
1. Configure GitHub secrets
2. Create test PR
3. Verify checks pass

### This Month
1. Share docs with team
2. Train team
3. Monitor PRs

---

## 📁 Files Overview

```
CI/CD Pipeline Files:
├── .github/workflows/
│   ├── ci.yml                    # Main pipeline
│   └── badge-update.yml          # Badge automation
├── test-ci-local.sh              # Local testing
└── Documentation/
    ├── START-HERE.md             # This file
    ├── CI-CD-INDEX.md            # Navigation
    ├── CI-CD-QUICK-REFERENCE.md  # Quick answers
    ├── CI-CD-SETUP.md            # Setup guide
    ├── CONTRIBUTING.md           # Contributing
    └── ... (more docs)
```

---

## 🎉 You're Ready!

Everything is set up and ready to go. 

**Next:** Run `./test-ci-local.sh` and read [`CI-CD-QUICK-REFERENCE.md`](./CI-CD-QUICK-REFERENCE.md)

---

**Last Updated:** May 28, 2026
**Status:** Ready to Use

Questions? Check [`CI-CD-INDEX.md`](./CI-CD-INDEX.md) for the complete guide.
