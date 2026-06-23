# CI/CD Setup Checklist

Complete this checklist to fully activate the CI/CD pipeline for AFRAMP.

## Phase 1: Local Setup ✅

- [ ] Clone repository
- [ ] Install Node.js ≥20.0.0
- [ ] Run `npm install`
- [ ] Run `./test-ci-local.sh` (make executable first: `chmod +x test-ci-local.sh`)
- [ ] All local checks pass

## Phase 2: GitHub Configuration

### Repository Settings

- [ ] Go to repository Settings
- [ ] Navigate to "Secrets and variables" → "Actions"

### Add Secrets

Add the following secrets (Settings → Secrets and variables → Actions → New repository secret):

#### Required Secrets

- [ ] **CODECOV_TOKEN**
  - Get from: https://codecov.io
  - Purpose: Upload coverage reports
  - Value: `[codecov-token]`

- [ ] **NEXT_PUBLIC_API_URL**
  - Purpose: API endpoint for Next.js build
  - Value: `https://api.example.com` (or your API URL)

- [ ] **NEXT_PUBLIC_STELLAR_NETWORK**
  - Purpose: Stellar network selection
  - Value: `TESTNET` or `PUBLIC`

#### Optional Secrets (for Vercel deployment)

- [ ] **VERCEL_TOKEN**
  - Get from: https://vercel.com/account/tokens
  - Purpose: Vercel deployment
  - Value: `[vercel-token]`

- [ ] **VERCEL_ORG_ID**
  - Get from: Vercel dashboard
  - Purpose: Vercel organization ID
  - Value: `[org-id]`

- [ ] **VERCEL_PROJECT_ID**
  - Get from: Vercel project settings
  - Purpose: Vercel project ID
  - Value: `[project-id]`

### Verify Secrets

- [ ] Go to Settings → Secrets and variables → Actions
- [ ] Confirm all required secrets are listed
- [ ] Secrets show as "●●●●●●" (masked)

## Phase 3: Workflow Verification

### Check Workflow Files

- [ ] `.github/workflows/ci.yml` exists
- [ ] `.github/workflows/badge-update.yml` exists
- [ ] `.github/workflows/preview.yml` exists (if using Vercel)
- [ ] All YAML files are valid

### Verify Workflow Syntax

```bash
# Check YAML syntax (optional, requires yamllint)
yamllint .github/workflows/ci.yml
```

- [ ] No YAML syntax errors

## Phase 4: First CI Run

### Create Test PR

1. [ ] Create a test branch
   ```bash
   git checkout -b test/ci-setup
   ```

2. [ ] Make a small change (e.g., update README)
   ```bash
   echo "# CI/CD Setup Complete" >> README.md
   ```

3. [ ] Commit and push
   ```bash
   git add .
   git commit -m "test: verify ci pipeline"
   git push origin test/ci-setup
   ```

4. [ ] Create PR on GitHub

### Monitor First Run

- [ ] Go to PR → "Checks" tab
- [ ] Wait for workflows to start
- [ ] Verify all jobs appear:
  - [ ] Code Quality
  - [ ] Tests & Coverage
  - [ ] Build

### Check Results

- [ ] Code Quality job passes ✅
- [ ] Tests & Coverage job passes ✅
- [ ] Build job passes ✅
- [ ] Coverage comment appears on PR
- [ ] All checks show green ✅

### Verify Coverage Comment

- [ ] PR has coverage report comment
- [ ] Shows metrics: Lines, Statements, Functions, Branches
- [ ] Shows status badges (🟢/🟡/🔴)

## Phase 5: Documentation Review

- [ ] Read `CI-CD-SETUP.md`
- [ ] Read `.github/WORKFLOWS.md`
- [ ] Read `CONTRIBUTING.md`
- [ ] Share documentation with team

## Phase 6: Team Onboarding

### For Each Team Member

- [ ] Clone repository
- [ ] Run `npm install`
- [ ] Run `./test-ci-local.sh` before first push
- [ ] Read `CONTRIBUTING.md`
- [ ] Understand commit message format
- [ ] Know how to interpret coverage reports

### Team Guidelines

- [ ] Establish branch naming conventions
- [ ] Set coverage targets (70% minimum, 80% target)
- [ ] Define code review process
- [ ] Schedule team training if needed

## Phase 7: Ongoing Maintenance

### Weekly

- [ ] Monitor workflow runs
- [ ] Check for failed builds
- [ ] Review coverage trends

### Monthly

- [ ] Review and update documentation
- [ ] Optimize workflow performance
- [ ] Update dependencies if needed

### As Needed

- [ ] Add new workflow jobs
- [ ] Update coverage thresholds
- [ ] Modify branch protection rules

## Phase 8: Advanced Configuration (Optional)

### Branch Protection Rules

1. [ ] Go to Settings → Branches
2. [ ] Add rule for `main` branch
3. [ ] Require status checks to pass:
   - [ ] Code Quality
   - [ ] Tests & Coverage
   - [ ] Build
4. [ ] Require PR reviews before merge
5. [ ] Dismiss stale PR approvals

### Code Owners

1. [ ] Create `.github/CODEOWNERS` file
2. [ ] Define code owners for different areas
3. [ ] Require approval from code owners

### Automated Dependency Updates

1. [ ] Enable Dependabot (Settings → Code security)
2. [ ] Configure update frequency
3. [ ] Set up auto-merge for patch updates

## Troubleshooting

### Workflows Not Running

- [ ] Check if workflows are enabled (Actions tab)
- [ ] Verify branch names match (main/develop)
- [ ] Check for YAML syntax errors
- [ ] Verify secrets are configured

### Tests Failing in CI

- [ ] Run `./test-ci-local.sh` locally
- [ ] Check test output in GitHub Actions logs
- [ ] Verify environment variables are set
- [ ] Check for flaky tests

### Coverage Below Threshold

- [ ] Run `npm run test:coverage` locally
- [ ] Review coverage report: `coverage/lcov-report/index.html`
- [ ] Add tests for uncovered code
- [ ] Update coverage thresholds if needed

### Build Failures

- [ ] Run `npm run build` locally
- [ ] Check `npm run type-check` output
- [ ] Verify environment variables
- [ ] Check GitHub Actions logs

## Verification Checklist

Before considering setup complete:

- [ ] All secrets configured
- [ ] First test PR passed all checks
- [ ] Coverage comment appears on PRs
- [ ] Local `./test-ci-local.sh` works
- [ ] Team understands process
- [ ] Documentation reviewed
- [ ] Branch protection rules set (optional)

## Success Criteria

✅ Setup is complete when:

1. All workflows run automatically on push/PR
2. Code quality checks pass consistently
3. Test coverage is tracked and reported
4. Coverage badges update automatically
5. Team follows contribution guidelines
6. All documentation is accessible

## Next Steps

1. Complete all checklist items
2. Run first test PR
3. Verify all checks pass
4. Share documentation with team
5. Begin using CI/CD pipeline

## Support

- **Setup Issues:** See `CI-CD-SETUP.md`
- **Workflow Questions:** See `.github/WORKFLOWS.md`
- **Development Questions:** See `CONTRIBUTING.md`
- **GitHub Actions Help:** https://docs.github.com/en/actions

---

**Last Updated:** May 28, 2026
**Status:** Ready for Implementation
