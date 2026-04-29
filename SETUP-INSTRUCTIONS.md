# 🚀 CI/CD Pipeline Setup Instructions

## Quick Start

Your CI/CD pipeline is now fully implemented! Follow these steps to activate it.

## 1. Set Up GitHub Secrets (5 minutes)

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

### Vercel Secrets

```
VERCEL_TOKEN=<your-vercel-token>
VERCEL_ORG_ID=<your-org-id>
VERCEL_PROJECT_ID=<your-project-id>
```

**How to get these:**

1. Go to https://vercel.com/account/tokens
2. Create new token
3. Run `vercel link` in your project
4. Find IDs in `.vercel/project.json`

### Application Secrets

```
NEXT_PUBLIC_API_URL=<your-api-url>
```

### Sentry Secrets (Optional but Recommended)

```
SENTRY_DSN=<your-sentry-dsn>
SENTRY_AUTH_TOKEN=<your-auth-token>
SENTRY_ORG=<your-org-slug>
SENTRY_PROJECT=<your-project-slug>
```

**How to get these:**

1. Go to https://sentry.io
2. Create project
3. Get DSN from project settings
4. Create auth token in account settings

### Lighthouse CI (Optional)

```
LHCI_GITHUB_APP_TOKEN=<your-token>
```

## 2. Enable Branch Protection (2 minutes)

Go to Settings → Branches → Add rule

**Branch name pattern:** `main`

Enable:

- ✅ Require a pull request before merging
- ✅ Require approvals (1 minimum)
- ✅ Require status checks to pass before merging
  - Select: `code-quality`, `test`, `build`, `lighthouse`
- ✅ Require branches to be up to date before merging
- ✅ Require conversation resolution before merging

## 3. Test the Pipeline (5 minutes)

### Create a Test PR

```bash
git checkout -b test/ci-pipeline
echo "# Test" >> TEST.md
git add TEST.md
git commit -m "test: verify CI pipeline"
git push origin test/ci-pipeline
```

### Verify

1. Go to GitHub → Pull Requests
2. Check that CI workflow runs
3. Verify all checks pass (green checkmarks)
4. Check for preview deployment comment
5. Merge the PR
6. Verify production deployment runs

## 4. Install Git Hooks (1 minute)

```bash
npm install
npx husky install
```

This enables:

- Pre-commit: Lint and format
- Pre-push: Run tests
- Commit-msg: Validate commit format

## 5. Run Tests Locally (1 minute)

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Check code quality
npm run lint
npm run format:check
npm run type-check
```

## 🎯 What You Get

### ✅ Every PR Automatically Tested

- Code quality checks (ESLint, Prettier, TypeScript)
- Unit and integration tests (≥70% coverage)
- Production build verification
- Lighthouse performance checks

### ✅ Bugs Caught Before Deployment

- Smoke tests on production
- Auto-rollback on failure
- Error monitoring with Sentry

### ✅ One-Click Deployments

- Automatic on merge to main
- Manual trigger available
- Preview deployments for every PR

### ✅ Compliance-Ready Audit Logs

- Every deployment logged
- 90-day retention
- Full audit trail (who, what, when, status)

## 📊 Monitoring

### Uptime Monitor

- Checks every 1 minute
- Alerts if down >3 minutes
- View in Actions tab

### Sentry (if configured)

- Real-time error tracking
- Session replay
- Performance monitoring
- Access at https://sentry.io

### Lighthouse CI

- Performance tracking over time
- Accessibility monitoring
- View reports in Actions artifacts

## 📚 Documentation

- **CI/CD Guide:** `docs/CI-CD.md` - Complete pipeline documentation
- **Contributing:** `CONTRIBUTING.md` - How to contribute
- **Implementation:** `CI-CD-IMPLEMENTATION.md` - What was implemented

## 🆘 Troubleshooting

### CI Fails

See `docs/CI-CD.md` for detailed troubleshooting

Quick fixes:

```bash
# Fix linting
npm run lint -- --fix

# Fix formatting
npm run format

# Fix tests
npm run test:watch
```

### Deployment Fails

1. Check Vercel dashboard for logs
2. Verify secrets are set correctly
3. Check workflow logs in Actions tab

### Need Help?

- Read `docs/CI-CD.md`
- Check `CONTRIBUTING.md`
- Open an issue

## ✅ Checklist

- [ ] GitHub secrets configured
- [ ] Branch protection enabled
- [ ] Test PR created and merged
- [ ] Git hooks installed
- [ ] Tests run locally
- [ ] Documentation reviewed

## 🎉 You're Done!

Your CI/CD pipeline is now active. Every PR will be automatically tested, and merges to main will deploy to production with full monitoring and rollback capabilities.

**Next PR you create will:**

1. Run all quality checks
2. Deploy to preview URL
3. Comment preview link on PR
4. Require all checks to pass before merge
5. Auto-deploy to production on merge
6. Create audit log
7. Monitor for errors

Happy coding! 🚀
