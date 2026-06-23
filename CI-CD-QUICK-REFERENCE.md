# CI/CD Quick Reference

## Common Commands

### Local Testing
```bash
# Run all CI checks locally
./test-ci-local.sh

# Individual checks
npm run lint              # ESLint
npm run format:check      # Prettier
npm run type-check        # TypeScript
npm run test:coverage     # Tests with coverage
npm run build             # Production build
```

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push to GitHub
git push origin feature/my-feature

# Create PR on GitHub
```

### Formatting
```bash
# Auto-fix formatting
npm run format

# Check formatting
npm run format:check

# Fix linting issues
npm run lint -- --fix
```

## Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Code style
- `refactor` - Refactoring
- `test` - Tests
- `chore` - Maintenance

### Examples
```bash
git commit -m "feat(kyc): add document verification"
git commit -m "fix(payments): resolve mobile money timeout"
git commit -m "docs: update contributing guide"
git commit -m "test: add kyc form tests"
```

## Coverage Badges

| Badge | Coverage | Status |
|-------|----------|--------|
| 🟢 | ≥80% | Excellent |
| 🟡 | 70-79% | Good |
| 🔴 | <70% | Needs Improvement |

## Workflow Status

### ✅ All Checks Pass
- Ready to merge
- All jobs completed successfully
- Coverage requirements met

### ⏳ Checks Running
- Wait for completion
- Don't push new changes yet
- Check logs if taking too long

### ❌ Checks Failed
- Click on failed job
- Review error logs
- Fix locally: `./test-ci-local.sh`
- Push fix

## GitHub Secrets Checklist

Required secrets in Settings → Secrets and variables:

- [ ] `CODECOV_TOKEN`
- [ ] `NEXT_PUBLIC_API_URL`
- [ ] `NEXT_PUBLIC_STELLAR_NETWORK`
- [ ] `VERCEL_TOKEN` (optional)
- [ ] `VERCEL_ORG_ID` (optional)
- [ ] `VERCEL_PROJECT_ID` (optional)

## Troubleshooting

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
rm -rf .next
npm run build
```

### Coverage Below Threshold
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

### Linting Issues
```bash
npm run lint -- --fix
npm run format
```

## PR Checklist

Before creating PR:

- [ ] Branch created from `develop` or `main`
- [ ] `./test-ci-local.sh` passes
- [ ] Commits follow conventional format
- [ ] Tests added/updated
- [ ] Coverage maintained (≥70%)
- [ ] No console errors/warnings
- [ ] Documentation updated

## Workflow Files

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | Main CI pipeline |
| `.github/workflows/badge-update.yml` | Coverage badge automation |
| `.github/workflows/preview.yml` | Preview deployments |
| `test-ci-local.sh` | Local CI simulation |

## Documentation

| File | Purpose |
|------|---------|
| `CI-CD-SETUP.md` | Complete setup guide |
| `CI-CD-SETUP-CHECKLIST.md` | Implementation checklist |
| `CI-CD-IMPLEMENTATION-SUMMARY.md` | What was implemented |
| `.github/WORKFLOWS.md` | Workflow details |
| `.github/CI-CD-ARCHITECTURE.md` | Architecture diagrams |
| `CONTRIBUTING.md` | Development guidelines |

## Performance Targets

- Code Quality: 2-3 minutes
- Tests: 3-5 minutes
- Build: 4-6 minutes
- **Total: ~10-15 minutes**

## Coverage Requirements

- **Minimum:** 70% across all metrics
- **Target:** 80%+ for new code
- **Metrics:** Lines, Statements, Functions, Branches

## Key Features

✅ Automated code quality checks
✅ Test coverage tracking
✅ Coverage badge auto-update
✅ PR coverage comments
✅ Build verification
✅ Local CI simulation
✅ Concurrency control
✅ Artifact management

## First Time Setup

1. Clone repository
2. Run `npm install`
3. Run `./test-ci-local.sh`
4. Create test PR
5. Verify all checks pass
6. Read `CONTRIBUTING.md`

## Daily Workflow

```bash
# Start work
git checkout -b feature/my-feature

# Make changes
# ... edit files ...

# Test locally
./test-ci-local.sh

# Commit
git add .
git commit -m "feat: add feature"

# Push
git push origin feature/my-feature

# Create PR on GitHub
# Wait for checks
# Review coverage report
# Merge when ready
```

## Emergency Fixes

### Force Push (Use Carefully!)
```bash
git push origin feature/name --force-with-lease
```

### Rebase on Main
```bash
git fetch upstream
git rebase upstream/main
git push origin feature/name --force-with-lease
```

### Reset to Remote
```bash
git fetch origin
git reset --hard origin/feature/name
```

## Useful Links

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Codecov](https://codecov.io)
- [Jest Documentation](https://jestjs.io)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [Prettier Options](https://prettier.io/docs/en/options.html)

## Support

- **Setup Issues:** See `CI-CD-SETUP.md`
- **Workflow Questions:** See `.github/WORKFLOWS.md`
- **Development Questions:** See `CONTRIBUTING.md`
- **Architecture:** See `.github/CI-CD-ARCHITECTURE.md`

## Quick Links

- [CI Status](../../actions/workflows/ci.yml)
- [Coverage Report](../../actions/workflows/badge-update.yml)
- [Repository Secrets](../../settings/secrets/actions)
- [GitHub Actions](../../actions)

---

**Last Updated:** May 28, 2026
**Version:** 1.0
