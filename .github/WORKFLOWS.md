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

#### PR Description Check (pull requests only)

- Fails if the PR's Summary section is empty or left as the unedited template placeholder.

#### Diff Coverage (pull requests only)

- Runs `scripts/check-diff-coverage.js`, which requires 80% statement/line coverage on
  files the PR actually adds or changes — not a repo-wide average. The repo has no
  baseline test suite, so a flat global threshold would either block every PR forever or,
  once softened, stop meaning anything; gating the diff is the realistic middle ground.

#### Build (Testnet) — all branches

- **Next.js Build** — production build with `NEXT_PUBLIC_STELLAR_NETWORK: TESTNET`
- Runs on every push and PR (depends on Code Quality + Tests)

#### Build (Mainnet) — PRs targeting `main` only

- **Next.js Build** — production build with `NEXT_PUBLIC_STELLAR_NETWORK: MAINNET`
- Also sets `NEXT_PUBLIC_CNGN_ISSUER` and `NEXT_PUBLIC_USDC_ISSUER` from repository secrets so that any env-var assertions or conditional imports that differ between networks are exercised at build time
- Only runs when `github.base_ref == 'main'` — no extra latency for develop-branch work
- Uses `NEXT_API_URL_MAINNET` (separate secret from the testnet URL)

**Why two build jobs?**

The TESTNET and MAINNET configurations differ in network name, Horizon URLs, and issuer
addresses. A Next.js build can succeed with testnet stubs while silently failing when
the corresponding mainnet values are injected — for example if a module asserts that an
env var matches a known value, or if dead-code elimination removes a path that only
matters in production. The `build-mainnet` job runs those same build-time checks against
production-shaped env vars on every PR before it merges to `main`, catching
environment-specific failures before they reach the release pipeline.

**Duration:** ~10-15 minutes

**Failure Handling:** Pipeline fails if any job fails, blocking merge. `main` has branch
protection requiring Code Quality, Tests & Coverage, Build, PR Description Check, and
Diff Coverage to pass before merging (Security Audit and Lighthouse CI are informational
only, since they depend on external service tokens that may not be configured).

**Lighthouse thresholds** (`lighthouserc.json`): accessibility, best-practices, SEO,
cumulative-layout-shift, and first-contentful-paint are real 90+/strict bars the app
already meets. `categories:performance`, `largest-contentful-paint`, and
`total-blocking-time` are set to what the app actually measures today (~0.4-0.5
performance score, ~3-4s TBT) rather than an aspirational 90+/300ms bar nobody had
verified against — the job silently always failed on a `localhost:3000` vs. `:3001`
mismatch before this, so these numbers were never actually seen. Tighten them as real
performance work happens; don't raise them back to the old values without first checking
the app actually hits them.

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

**Trigger:** Every 5 minutes (cron) and manual (`workflow_dispatch`)

**Purpose:** Monitors production deployment health

**Checks** (each must return HTTP 200 within 10 seconds):

- Homepage (`/`)
- Login page (`/login`)
- Wallet dashboard (`/wallet`)

**Alerting:**

- A run with any endpoint down fails, so GitHub sends a failed-workflow notification.
- Three consecutive failing runs open a `🚨 AFRAMP production uptime alert` issue; the first healthy run closes it.
- The failure count is kept in the Actions cache under `uptime-monitor-state-<run_id>-<run_attempt>`.

**Monitored URL:** `https://app.aframp.com` by default. Set the `PRODUCTION_URL` repository variable (Settings → Secrets and variables → Actions → Variables, no trailing slash) to monitor another origin, such as the Vercel production URL, without a code change.

**Prerequisite:** The monitored domain must resolve to the production deployment. For `app.aframp.com` that means adding it under the Vercel project's Domains and creating the DNS record Vercel asks for (see the `aframp.com` DNS provider). If the domain does not resolve, every run fails.

---

### 5. Release Please (`release.yml`)

**Trigger:** Push to `main` or manual `workflow_dispatch`

**Purpose:** Automates semantic version bumps, `CHANGELOG.md` updates, release PR creation, and GitHub Releases via `google-github-actions/release-please-action@v4`.

**Required Repository Configuration (one of the following):**

1. **Repository Actions Setting:** Enable **Settings → Actions → General → Workflow permissions → "Allow GitHub Actions to create and approve pull requests"** so `GITHUB_TOKEN` is permitted to open and update the release PR.
2. **Fine-grained Personal Access Token (PAT):** Add a repository secret named `RELEASE_PLEASE_TOKEN` containing a fine-grained PAT scoped to this repository with **Contents** (`Read and write`), **Issues** (`Read and write`), and **Pull requests** (`Read and write`) permissions.

---

## Workflow Configuration

### Environment Variables

Set in GitHub repository settings → Secrets and variables:

```
CODECOV_TOKEN                # Codecov integration
NEXT_API_URL                 # API endpoint (testnet / non-prod)
NEXT_API_URL_MAINNET         # API endpoint for the mainnet build job
NEXT_PUBLIC_STELLAR_NETWORK  # Set per-job in ci.yml (TESTNET or MAINNET)
MAINNET_CNGN_ISSUER          # cNGN issuer address for the mainnet build
MAINNET_USDC_ISSUER          # USDC issuer address for the mainnet build
RELEASE_PLEASE_TOKEN         # Optional fine-grained PAT for Release Please PR creation
VERCEL_TOKEN                 # Vercel deployment
VERCEL_ORG_ID                # Vercel organization
VERCEL_PROJECT_ID            # Vercel project
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
