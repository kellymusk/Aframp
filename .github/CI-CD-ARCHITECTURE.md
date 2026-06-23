# CI/CD Architecture

## Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    AFRAMP CI/CD Pipeline                        │
└─────────────────────────────────────────────────────────────────┘

                          Developer Push
                                │
                                ▼
                    ┌───────────────────────┐
                    │  GitHub Actions       │
                    │  Triggered            │
                    └───────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
                ▼               ▼               ▼
        ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
        │ Code Quality │ │ Tests &      │ │ Build        │
        │              │ │ Coverage     │ │              │
        │ • ESLint     │ │              │ │ • Next.js    │
        │ • Prettier   │ │ • Jest       │ │ • Artifacts  │
        │ • TypeScript │ │ • Codecov    │ │              │
        └──────────────┘ └──────────────┘ └──────────────┘
                │               │               │
                └───────────────┼───────────────┘
                                │
                    ┌───────────▼───────────┐
                    │  All Checks Pass?     │
                    └───────────┬───────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                   YES                      NO
                    │                       │
                    ▼                       ▼
            ┌──────────────┐        ┌──────────────┐
            │ Coverage     │        │ Notify Dev   │
            │ Badge Update │        │ (PR Comment) │
            │              │        │              │
            │ • Generate   │        │ • Show Logs  │
            │ • Update     │        │ • Link Fixes │
            │   README     │        └──────────────┘
            └──────────────┘
                    │
                    ▼
            ┌──────────────┐
            │ Ready to     │
            │ Merge        │
            └──────────────┘
```

## Workflow Execution Timeline

```
Time    Code Quality    Tests & Coverage    Build
────────────────────────────────────────────────────
0:00    ├─ Start        ├─ Start            
0:30    │  ESLint       │  Jest              
1:00    │  Prettier     │  Coverage          
1:30    │  TypeScript   │  Codecov           
2:00    ├─ Complete ✅  │  PR Comment        
2:30                    ├─ Complete ✅      ├─ Start
3:00                                        │  Build
4:00                                        │  Artifacts
5:00                                        ├─ Complete ✅
────────────────────────────────────────────────────
Total: ~5 minutes (parallel execution)
```

## Job Dependencies

```
                    ┌─────────────────┐
                    │  code-quality   │
                    │  (2-3 min)      │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  test           │
                    │  (3-5 min)      │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  build          │
                    │  (4-6 min)      │
                    │  Depends on:    │
                    │  • code-quality │
                    │  • test         │
                    └─────────────────┘
```

## Coverage Badge Workflow

```
CI Workflow Completes (main branch)
        │
        ▼
Coverage Report Generated
        │
        ├─ coverage-summary.json
        ├─ coverage-final.json
        └─ lcov-report/
        │
        ▼
Badge Update Workflow Triggered
        │
        ├─ Download Coverage Artifact
        │
        ├─ Calculate Coverage %
        │
        ├─ Determine Color
        │  ├─ 🟢 Green (≥80%)
        │  ├─ 🟡 Yellow (70-79%)
        │  └─ 🔴 Red (<70%)
        │
        ├─ Generate Badge
        │
        ├─ Update README.md
        │
        └─ Commit & Push
```

## PR Coverage Comment

```
┌─────────────────────────────────────────────────┐
│ 📊 Coverage Report                              │
├─────────────────────────────────────────────────┤
│                                                 │
│ | Metric     | Coverage | Status |             │
│ |─────────────────────────────────|             │
│ | Lines      | 78%      | 🟡     |             │
│ | Statements | 76%      | 🟡     |             │
│ | Functions  | 82%      | 🟢     |             │
│ | Branches   | 71%      | 🟡     |             │
│                                                 │
│ 🟢 = Excellent (≥80%)                          │
│ 🟡 = Good (≥70%)                               │
│ 🔴 = Needs Improvement (<70%)                  │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Local CI Simulation

```
Developer Machine
        │
        ▼
./test-ci-local.sh
        │
        ├─ ESLint ────────────────────┐
        │                             │
        ├─ Prettier Check ────────────┤
        │                             │
        ├─ TypeScript Check ──────────┤
        │                             │
        ├─ Jest Tests ────────────────┤
        │                             │
        ├─ Coverage Report ───────────┤
        │                             │
        └─ Production Build ──────────┘
                    │
                    ▼
        All Checks Pass? ✅
                    │
                    ▼
        Ready to Push
```

## Concurrency Control

```
Branch: feature/my-feature

Push #1 ──────────────────────────────────────────
        │ Workflow starts
        │ Code Quality: Running
        │ Tests: Running
        │ Build: Queued
        │
Push #2 ──────────────────────────────────────────
        │ Previous workflow CANCELLED
        │ New workflow starts
        │ Code Quality: Running
        │ Tests: Running
        │ Build: Queued
        │
        ▼ (Only latest workflow completes)
```

## Environment Variables Flow

```
GitHub Secrets
        │
        ├─ CODECOV_TOKEN
        ├─ NEXT_PUBLIC_API_URL
        ├─ NEXT_PUBLIC_STELLAR_NETWORK
        ├─ VERCEL_TOKEN
        ├─ VERCEL_ORG_ID
        └─ VERCEL_PROJECT_ID
        │
        ▼
GitHub Actions Workflow
        │
        ├─ Code Quality Job
        │  └─ Uses: NEXT_PUBLIC_API_URL
        │
        ├─ Tests Job
        │  └─ Uses: CODECOV_TOKEN
        │
        └─ Build Job
           ├─ Uses: NEXT_PUBLIC_API_URL
           ├─ Uses: NEXT_PUBLIC_STELLAR_NETWORK
           └─ Uses: VERCEL_TOKEN (if deploying)
```

## Artifact Management

```
Build Job Completes
        │
        ├─ .next/ directory
        │  └─ Upload as artifact
        │     └─ Retention: 1 day
        │
        ├─ coverage/ directory
        │  ├─ Upload as artifact
        │  │  └─ Retention: 1 day
        │  │
        │  └─ Upload to Codecov
        │     └─ Permanent storage
        │
        └─ Ready for deployment
```

## Status Badge Integration

```
README.md
        │
        ├─ CI Status Badge
        │  └─ https://github.com/.../workflows/ci.yml/badge.svg
        │
        ├─ Coverage Badge
        │  └─ Auto-updated by badge-update.yml
        │
        ├─ Node.js Version
        │  └─ Static badge
        │
        ├─ TypeScript Version
        │  └─ Static badge
        │
        └─ Next.js Version
           └─ Static badge
```

## Error Handling Flow

```
Job Fails
        │
        ├─ GitHub Actions
        │  └─ Marks job as failed ❌
        │
        ├─ PR Status
        │  └─ Shows "Some checks failed"
        │
        ├─ Developer Notification
        │  └─ Email/GitHub notification
        │
        ├─ Logs Available
        │  └─ Click on failed job to view
        │
        └─ Developer Action
           ├─ Fix locally
           ├─ Run ./test-ci-local.sh
           ├─ Commit fix
           └─ Push again
```

## Performance Optimization

```
Optimization Strategies
        │
        ├─ npm Caching
        │  └─ Speeds up dependency installation
        │
        ├─ Parallel Jobs
        │  └─ Code Quality, Tests run simultaneously
        │
        ├─ Concurrency Control
        │  └─ Cancel previous runs on new push
        │
        ├─ Artifact Retention
        │  └─ 1 day retention (saves storage)
        │
        └─ Node.js Version
           └─ v20 (latest LTS)
```

## Integration Points

```
GitHub Repository
        │
        ├─ Webhooks
        │  └─ Trigger on push/PR
        │
        ├─ Secrets
        │  └─ Provide credentials
        │
        ├─ Actions
        │  └─ Run workflows
        │
        └─ Artifacts
           └─ Store build outputs
                │
                ├─ Codecov
                │  └─ Coverage tracking
                │
                ├─ Vercel
                │  └─ Preview deployments
                │
                └─ README
                   └─ Status badges
```

## Workflow Triggers

```
Events that trigger CI:

1. Push to main/develop
   └─ Runs full pipeline

2. Pull Request
   └─ Runs full pipeline
   └─ Posts coverage comment

3. Successful CI (main only)
   └─ Triggers badge-update workflow

4. PR open/sync/reopen
   └─ Triggers preview deployment

5. PR close
   └─ Cleans up preview
```

## Security Considerations

```
Secrets Management
        │
        ├─ GitHub Secrets
        │  └─ Encrypted at rest
        │  └─ Masked in logs
        │
        ├─ Token Rotation
        │  └─ Codecov token
        │  └─ Vercel token
        │
        ├─ Permissions
        │  └─ Workflows have limited scope
        │  └─ Only access needed secrets
        │
        └─ Audit Trail
           └─ All actions logged
           └─ Viewable in GitHub
```

## Deployment Pipeline (Optional)

```
CI Pipeline Passes
        │
        ├─ main branch
        │  └─ Auto-deploy to production
        │
        ├─ develop branch
        │  └─ Auto-deploy to staging
        │
        └─ PR
           └─ Deploy preview to Vercel
```

---

**Architecture Version:** 1.0
**Last Updated:** May 28, 2026
**Status:** Production Ready
