# CI/CD Architecture

This describes the `CI` workflow in [`workflows/ci.yml`](workflows/ci.yml). If the two disagree,
`ci.yml` is the source of truth.

## Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AFRAMP CI/CD Pipeline                           │
└─────────────────────────────────────────────────────────────────────────┘

                Push (main, develop) / Pull Request (main, develop, dev-frontend)
                                        │
                                        ▼
                          ┌───────────────────────────┐
                          │  GitHub Actions triggered │
                          └─────────────┬─────────────┘
                                        │
     Stage 1 — all start in parallel    │
  ┌──────────────┬──────────────┬───────┴──────┬──────────────┬──────────────┐
  ▼              ▼              ▼              ▼              ▼              ▼
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ code-      │ │ test       │ │ security   │ │ e2e        │ │ image-     │ │ PR only:   │
│ quality    │ │            │ │            │ │            │ │ budget     │ │            │
│ • ESLint   │ │ • Jest +   │ │ • npm audit│ │ • Play-    │ │ • image    │ │ pr-        │
│ • tsc      │ │   coverage │ │ • Snyk     │ │   wright   │ │   size     │ │ description│
│ • Prettier │ │ • Bundle   │ │ • OWASP    │ │   (Chrome) │ │   budgets  │ │ diff-      │
│            │ │   budget   │ │ • Wallet   │ │            │ │            │ │ coverage   │
│            │ │ • Codecov  │ │   deps     │ │            │ │            │ │ (80% on    │
│            │ │ • PR note  │ │   audit    │ │            │ │            │ │ changed)   │
└─────┬──────┘ └─────┬──────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘
      │              │
      └──────┬───────┘   Stage 2 — needs code-quality + test
             │
      ┌──────┴───────────────────────┐
      ▼                              ▼
┌──────────────────┐        ┌──────────────────────────┐
│ build            │        │ build-mainnet            │
│ (Testnet)        │        │ PR into main only        │
│ • next build     │        │ • next build, MAINNET env│
└────────┬─────────┘        └──────────────────────────┘
         │
         ▼   Stage 3 — needs build
┌──────────────────────────┐
│ lighthouse               │
│ • 90+ in all categories  │
│ • Upload LHCI results    │
└────────┬─────────────────┘
         │
         ▼
┌───────────────────────────┐        ┌──────────────────────────────┐
│ All required checks pass? │── NO ─▶│ PR shows failed checks       │
└────────┬──────────────────┘        │ • Logs on the failed job     │
         │ YES                       └──────────────────────────────┘
         ▼
┌──────────────────────────────┐
│ Ready to merge               │
│ (on main: badge-update.yml   │
│  updates the coverage badge) │
└──────────────────────────────┘
```

## Workflow Execution Timeline

Typical pull request into `main`, from recent runs. Wall-clock total is **~10-15 minutes**,
matching [WORKFLOWS.md](WORKFLOWS.md). The critical path is test → build → lighthouse, and a slow
E2E run can also set the total.

```
Min   0    1    2    3    4    5    6    7    8    9   10   11   12   13   14
      │────│────│────│────│────│────│────│────│────│────│────│────│────│────│
pr-description  ▏ (<1 min, PR only)
image-budget    █ (~1 min)
security        ██ (~1-2 min)
e2e             ███···········  (~2-11 min)
code-quality    ████  (~3.5-4 min)
diff-coverage   ████  (~3-4 min, PR only)
test            █████  (~4.5-5 min)
build                █▉ (~1.5-2 min, after code-quality + test)
build-mainnet        █▉ (~1.5-2 min, PR into main only)
lighthouse             ███████·  (~4-8 min, after build)
──────────────────────────────────────────────────────────────────────────────
Total: ~10-15 minutes (parallel execution; critical path test → build → lighthouse)
```

## Job Dependencies

```
 Independent (start immediately)        Gated
 ────────────────────────────────       ─────────────────────────────────────────

 code-quality ───────┐
                     ├──▶ build (Testnet) ──────▶ lighthouse
 test ───────────────┤
                     └──▶ build-mainnet  (if: pull_request && base_ref == main)

 security
 e2e
 image-budget
 pr-description      (if: pull_request)
 diff-coverage       (if: pull_request)
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
        ├─ NEXT_API_URL
        ├─ NEXT_PUBLIC_STELLAR_NETWORK
        ├─ VERCEL_TOKEN
        ├─ VERCEL_ORG_ID
        └─ VERCEL_PROJECT_ID
        │
        ▼
GitHub Actions Workflow
        │
        ├─ Code Quality Job
        │  └─ Uses: NEXT_API_URL
        │
        ├─ Tests Job
        │  └─ Uses: CODECOV_TOKEN
        │
        └─ Build Job
           ├─ Uses: NEXT_API_URL
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
        │  └─ All stage-1 jobs run simultaneously; builds wait only on code-quality + test
        │
        ├─ Concurrency Control
        │  └─ Cancel previous runs on new push
        │
        ├─ Artifact Retention
        │  └─ 1 day retention (saves storage)
        │
        └─ Node.js Version
           └─ v22 (as pinned in ci.yml)
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

**Architecture Version:** 1.1
**Status:** Production Ready

For when this document last changed, see its git history (`git log -- .github/CI-CD-ARCHITECTURE.md`).
