# CI/CD Pipeline Documentation

## Pipeline Overview

```
PR Created
  ↓
[Code Quality] ESLint + Prettier + TypeScript
  ↓
[Tests] Unit + Integration + Coverage ≥70%
  ↓
[Build] Production build + Bundle size check
  ↓
[Lighthouse] Performance ≥80, Accessibility ≥90
  ↓
[Preview Deploy] Unique URL per PR
  ↓
[Code Review] → Merge
  ↓
[Production Deploy] Automatic + Smoke tests + Rollback
```

## Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Trigger:** Every pull request to `main` or `develop`

**Jobs:**

- **Code Quality**
  - ESLint (no console.log, no unused vars, accessibility rules)
  - Prettier formatting check
  - TypeScript type checking
  - npm audit for security vulnerabilities

- **Tests & Coverage**
  - Jest with React Testing Library
  - Minimum 70% coverage required
  - Coverage report posted to PR

- **Build & Bundle Size**
  - Production build verification
  - Bundle size check with size-limit
  - Build artifacts uploaded

- **Lighthouse CI**
  - Performance ≥80
  - Accessibility ≥90
  - Best practices ≥85
  - SEO ≥85

### 2. Preview Deployment (`.github/workflows/preview.yml`)

**Trigger:** PR opened, synchronized, or closed

**Features:**

- Deploys every PR to unique Vercel URL
- Comments preview link on PR
- Auto-deletes deployment when PR closed

### 3. Production Deployment (`.github/workflows/deploy-production.yml`)

**Trigger:** Merge to `main` or manual dispatch

**Process:**

1. Build production bundle
2. Deploy to Vercel production
3. Wait 30 seconds for deployment
4. Run smoke tests (homepage, onramp, dashboard)
5. Monitor for error rate spikes (2 minutes)
6. Auto-rollback on failure
7. Create audit log (stored 90 days)
8. Notify team
9. Create Sentry release

### 4. Uptime Monitor (`.github/workflows/uptime-monitor.yml`)

**Trigger:** Every 1 minute

**Checks:**

- Homepage availability
- Onramp page availability
- Alerts on downtime >3 minutes

## Running Tests Locally

### Run all tests

```bash
npm test
```

### Run tests with coverage

```bash
npm run test:coverage
```

### Run tests in watch mode

```bash
npm run test:watch
```

### Check coverage threshold

```bash
npm run test:coverage -- --watchAll=false
```

## Code Quality Checks

### Lint code

```bash
npm run lint
```

### Format code

```bash
npm run format
```

### Check formatting

```bash
npm run format:check
```

### Type check

```bash
npm run type-check
```

## Triggering Deployments

### Preview Deployment

- Automatically triggered on every PR
- Preview URL commented on PR
- Access at: `https://aframp-pr-{number}.vercel.app`

### Production Deployment

**Automatic:**

```bash
git checkout main
git merge develop
git push origin main
```

**Manual:**

1. Go to Actions tab in GitHub
2. Select "Production Deployment"
3. Click "Run workflow"
4. Select branch (main)
5. Click "Run workflow"

## Rollback Procedures

### Automatic Rollback

- Triggered automatically if smoke tests fail
- Reverts to previous successful deployment
- Team notified via workflow logs

### Manual Rollback

1. Go to Vercel dashboard
2. Find previous successful deployment
3. Click "Promote to Production"

**OR via CLI:**

```bash
# List recent deployments
vercel ls aframp --prod

# Promote specific deployment
vercel promote <deployment-url> --prod
```

## Troubleshooting

### CI Fails: Code Quality

**Problem:** ESLint errors

```bash
# Fix auto-fixable issues
npm run lint -- --fix

# Check specific file
npx eslint path/to/file.ts
```

**Problem:** Prettier formatting

```bash
# Auto-format all files
npm run format
```

**Problem:** TypeScript errors

```bash
# Check types
npm run type-check

# Check specific file
npx tsc --noEmit path/to/file.ts
```

### CI Fails: Tests

**Problem:** Tests failing

```bash
# Run specific test file
npm test -- path/to/test.test.ts

# Run tests in watch mode
npm run test:watch
```

**Problem:** Coverage below 70%

```bash
# Check coverage report
npm run test:coverage
open coverage/lcov-report/index.html
```

### CI Fails: Build

**Problem:** Build errors

```bash
# Build locally
npm run build

# Check build output
ls -la .next
```

**Problem:** Bundle size exceeded

```bash
# Check bundle size
npx size-limit

# Analyze bundle
npm run build
npx @next/bundle-analyzer
```

### CI Fails: Lighthouse

**Problem:** Performance score low

- Optimize images (use Next.js Image component)
- Reduce JavaScript bundle size
- Enable caching
- Use CDN for static assets

**Problem:** Accessibility score low

- Add alt text to images
- Ensure proper heading hierarchy
- Add ARIA labels
- Check color contrast

### Preview Deployment Fails

**Problem:** Vercel deployment error

1. Check Vercel dashboard for logs
2. Verify environment variables set
3. Check build logs in GitHub Actions

### Production Deployment Fails

**Problem:** Smoke tests fail

1. Check if site is actually down
2. Review deployment logs
3. Check Sentry for errors
4. Verify environment variables

**Problem:** Rollback needed

```bash
# Automatic rollback triggered on failure
# Check workflow logs for rollback status
```

## Environment Variables

### Required Secrets (GitHub)

```
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
NEXT_PUBLIC_API_URL
SENTRY_DSN
SENTRY_AUTH_TOKEN
SENTRY_ORG
SENTRY_PROJECT
LHCI_GITHUB_APP_TOKEN (optional)
```

### Setting Secrets

1. Go to repository Settings
2. Click "Secrets and variables" → "Actions"
3. Click "New repository secret"
4. Add name and value
5. Click "Add secret"

## Audit Logs

### Accessing Audit Logs

1. Go to Actions tab
2. Select "Production Deployment" workflow
3. Click on specific run
4. Scroll to "Upload audit log" step
5. Download artifact

### Audit Log Format

```json
{
  "timestamp": "2026-01-26T17:00:00Z",
  "deployment_id": "123456789",
  "commit_sha": "abc123...",
  "commit_message": "feat: add new feature",
  "author": "John Doe",
  "author_email": "john@example.com",
  "environment": "production",
  "status": "success",
  "deployment_url": "https://aframp.vercel.app",
  "vercel_deployment_id": "dpl_xyz...",
  "workflow_run": "https://github.com/org/repo/actions/runs/123",
  "smoke_tests": "success",
  "rollback_triggered": false
}
```

## Branch Protection Rules

### Recommended Settings

1. Go to repository Settings → Branches
2. Add rule for `main` branch:
   - ✅ Require pull request before merging
   - ✅ Require approvals (1 minimum)
   - ✅ Require status checks to pass
     - code-quality
     - test
     - build
     - lighthouse
   - ✅ Require branches to be up to date
   - ✅ Require conversation resolution
   - ✅ Do not allow bypassing

## Monitoring & Alerts

### Sentry

- Error tracking enabled in production
- Session replay for critical errors
- Alert on error rate spike (>10 errors/min)
- Access: https://sentry.io

### Uptime Monitor

- Checks every 1 minute
- Alerts if down >3 minutes
- Monitors homepage and onramp page

### Lighthouse CI

- Tracks performance over time
- Fails if scores drop below thresholds
- Historical data in GitHub Actions artifacts

## Support

For issues with CI/CD pipeline:

1. Check this documentation
2. Review workflow logs in GitHub Actions
3. Check Vercel deployment logs
4. Open issue in repository
