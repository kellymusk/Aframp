# CI/CD Pipeline Setup - Aframp

## Overview

This document outlines the complete CI/CD pipeline for the Aframp project. The pipeline runs on every push and pull request to ensure code quality, test coverage, and successful builds.

## Pipeline Architecture

### Workflows

#### 1. **CI Workflow** (`.github/workflows/ci.yml`)
Runs on every push to `main`/`develop` and all pull requests.

**Jobs:**
- **Code Quality** - ESLint, Prettier, TypeScript checks
- **Tests & Coverage** - Jest tests with Codecov integration
- **Build** - Next.js production build (depends on code-quality and test jobs)

**Features:**
- Concurrency control (cancels previous runs on new push)
- Coverage badge generation
- PR comments with coverage metrics
- Build artifact upload

#### 2. **Preview Deployment** (`.github/workflows/preview.yml`)
Automatically deploys PR previews to Vercel.

**Features:**
- Auto-deploy on PR open/sync/reopen
- Preview URL comment on PR
- Auto-cleanup on PR close

#### 3. **Uptime Monitor** (`.github/workflows/uptime-monitor.yml`)
Monitors production deployment health.

## Local Testing

### Quick Start

Run the local CI simulation:

```bash
./test-ci-local.sh
```

This script runs all checks locally before pushing:
1. ESLint
2. Prettier check
3. TypeScript check
4. Jest tests with coverage
5. Production build

### Individual Commands

```bash
# Code Quality
npm run lint              # ESLint
npm run format:check      # Prettier check
npm run type-check        # TypeScript

# Testing
npm run test              # Run tests once
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report

# Build
npm run build             # Production build
npm run dev               # Development server

# Formatting
npm run format            # Auto-fix formatting
```

## Coverage Requirements

The project enforces **70% coverage threshold** across:
- Lines
- Statements
- Functions
- Branches

Coverage reports are:
- Generated locally: `coverage/` directory
- Uploaded to Codecov on CI
- Commented on PRs with visual badges

### Coverage Badges

🟢 **Excellent** - ≥80%
🟡 **Good** - ≥70%
🔴 **Needs Improvement** - <70%

## GitHub Secrets Required

Configure these in your GitHub repository settings:

```
CODECOV_TOKEN           # For Codecov coverage uploads
NEXT_PUBLIC_API_URL     # API endpoint
VERCEL_TOKEN            # Vercel deployment
VERCEL_ORG_ID           # Vercel organization
VERCEL_PROJECT_ID       # Vercel project
```

## Git Hooks (Husky)

Automated checks run locally before commits/pushes:

- **pre-commit** - Runs lint-staged (ESLint + Prettier on changed files)
- **commit-msg** - Validates conventional commit format
- **pre-push** - Runs Jest tests

## Concurrency Control

The CI workflow uses concurrency groups to:
- Cancel previous runs when new code is pushed
- Prevent duplicate workflow runs
- Save GitHub Actions minutes

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

## Build Process

### Development
```bash
npm install
npm run dev
```

### Production
```bash
npm install
npm run build
npm run start
```

### Environment Variables

Required for build:
- `NEXT_PUBLIC_API_URL` - API endpoint
- `NEXT_PUBLIC_STELLAR_NETWORK` - Stellar network (TESTNET/PUBLIC)

## Troubleshooting

### Tests Failing Locally

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run test:coverage
```

### Build Failures

```bash
# Check TypeScript
npm run type-check

# Check for linting issues
npm run lint

# Try clean build
rm -rf .next
npm run build
```

### Coverage Below Threshold

```bash
# View coverage report
npm run test:coverage
open coverage/lcov-report/index.html
```

## Best Practices

1. **Always run local tests before pushing**
   ```bash
   ./test-ci-local.sh
   ```

2. **Keep commits atomic and well-formatted**
   - Use conventional commits (feat:, fix:, docs:, etc.)
   - One feature per commit

3. **Write tests for new features**
   - Maintain 70%+ coverage
   - Test edge cases and error scenarios

4. **Review coverage reports**
   - Check PR comments for coverage metrics
   - Aim for 80%+ coverage on new code

5. **Use feature branches**
   - Branch from `develop` for features
   - Branch from `main` for hotfixes
   - Create PR for code review

## CI Status Badge

Add to your README:

```markdown
[![CI](https://github.com/YOUR_ORG/aframp/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_ORG/aframp/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/YOUR_ORG/aframp/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_ORG/aframp)
```

## Performance Metrics

- **Code Quality Check**: ~2-3 minutes
- **Tests**: ~3-5 minutes
- **Build**: ~4-6 minutes
- **Total Pipeline**: ~10-15 minutes

## Next Steps

1. Set up GitHub secrets
2. Configure Codecov integration
3. Run `./test-ci-local.sh` to verify setup
4. Push to trigger first CI run
5. Monitor workflow runs in GitHub Actions tab

## Support

For issues or questions:
1. Check GitHub Actions logs
2. Review this documentation
3. Run local tests with `./test-ci-local.sh`
4. Check coverage reports in `coverage/` directory
