# GitHub Actions Workflows

This document describes all GitHub Actions workflows configured for the Aframp project.

## Workflows Overview

### 1. CI Workflow (`ci.yml`)

**Trigger:** Push to `main`/`develop` or any pull request

**Purpose:** Automated code quality, testing, and build verification

**Jobs:**

#### Code Quality
- **ESLint** - Linting with TypeScript support
- **Prettier** - Code formatting check
- **TypeScript** - Type checking

#### Tests & Coverage
- **Jest** - Unit and integration tests
- **Coverage Report** - Generates coverage metrics
- **Codecov Upload** - Uploads to Codecov service
- **PR Comment** - Posts coverage summary on PRs

#### Build
- **Next.js Build** - Production build verification
- **Artifact Upload** - Stores build for deployment

**Duration:** ~10-15 minutes

**Failure Handling:** Pipeline fails if any job fails, blocking merge

---

### 2. Badge Update Workflow (`badge-update.yml`)

**Trigger:** Successful CI workflow on `main` branch

**Purpose:** Automatically updates coverage badge in README

**Jobs:**

- **Download Coverage** - Gets coverage artifact from CI
- **Generate Badge** - Creates coverage badge with color coding
- **Update README** - Commits badge update to main

**Badge Colors:**
- 🟢 Green: ≥80% coverage
- 🟡 Yellow: 70-79% coverage
- 🔴 Red: <70% coverage

---

### 3. Preview Deployment (`preview.yml`)

**Trigger:** Pull request events (open, sync, reopen, close)

**Purpose:** Automatic preview deployments to Vercel

**Jobs:**

#### Deploy Preview
- Deploys PR to unique Vercel URL
- Comments preview link on PR
- Runs on PR open/sync/reopen

#### Cleanup Preview
- Deletes preview deployment
- Runs on PR close

**Features:**
- Automatic URL generation
- PR comments with preview link
- Auto-cleanup on close

---

### 4. Uptime Monitor (`uptime-monitor.yml`)

**Trigger:** Scheduled (configurable interval)

**Purpose:** Monitors production deployment health

**Checks:**
- API endpoint availability
- Response time monitoring
- Error rate tracking

---

## Workflow Configuration

### Environment Variables

Set in GitHub repository settings → Secrets and variables:

```
CODECOV_TOKEN           # Codecov integration
NEXT_PUBLIC_API_URL     # API endpoint
NEXT_PUBLIC_STELLAR_NETWORK  # Stellar network
VERCEL_TOKEN            # Vercel deployment
VERCEL_ORG_ID           # Vercel organization
VERCEL_PROJECT_ID       # Vercel project
```

### Concurrency Control

The CI workflow uses concurrency groups to prevent duplicate runs:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

This means:
- Only one CI run per branch at a time
- Previous runs are cancelled when new code is pushed
- Saves GitHub Actions minutes

---

## Workflow Status

View workflow status in GitHub:

1. Go to **Actions** tab
2. Select workflow from left sidebar
3. View recent runs and logs

### Status Badges

Add to README:

```markdown
[![CI](https://github.com/aframp/aframp/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/aframp/aframp/actions/workflows/ci.yml)
```

---

## Debugging Workflows

### View Logs

1. Go to **Actions** tab
2. Click on workflow run
3. Click on job to expand logs
4. Search for errors

### Common Issues

**Build Fails:**
- Check `npm run build` locally
- Verify environment variables
- Check TypeScript errors: `npm run type-check`

**Tests Fail:**
- Run `npm run test:coverage` locally
- Check coverage thresholds
- Review test output

**Linting Fails:**
- Run `npm run lint` locally
- Run `npm run format` to auto-fix
- Check ESLint rules

### Re-run Workflow

1. Go to workflow run
2. Click **Re-run jobs** button
3. Select jobs to re-run

---

## Performance Optimization

### Caching

Workflows use npm caching to speed up dependency installation:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'
```

### Parallel Jobs

Code Quality, Tests, and Build run in parallel where possible:

```
Code Quality ──┐
               ├─→ Build (depends on both)
Tests ────────┘
```

### Artifact Management

- Coverage reports: 1 day retention
- Build artifacts: 1 day retention
- Reduces storage costs

---

## Best Practices

1. **Keep workflows simple** - One responsibility per job
2. **Use caching** - Speed up dependency installation
3. **Set timeouts** - Prevent hanging workflows
4. **Monitor costs** - GitHub Actions has usage limits
5. **Document changes** - Update this file when modifying workflows

---

## Troubleshooting Checklist

- [ ] Secrets configured in GitHub settings
- [ ] Workflow files valid YAML
- [ ] Node.js version compatible (≥20)
- [ ] Dependencies installable
- [ ] Tests pass locally
- [ ] Build succeeds locally
- [ ] Linting passes locally

---

## Support

For workflow issues:

1. Check workflow logs in GitHub Actions
2. Run local tests: `./test-ci-local.sh`
3. Review this documentation
4. Check GitHub Actions status page
5. Contact team lead

---

## Related Documentation

- [CI/CD Setup Guide](../CI-CD-SETUP.md)
- [Contributing Guidelines](../CONTRIBUTING.md)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
