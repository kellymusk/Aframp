# Contributing to AFRAMP

Thank you for your interest in contributing to AFRAMP! This guide will help you get started.

## Table of Contents

- [Getting Started](#getting-started)
- [Frontend vs backend](#frontend-vs-backend)
- [Contributing via dev-frontend](#contributing-via-dev-frontend)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Error Display Conventions](#error-display-conventions)
- [Testing](#testing)
- [Local CI Gates](#local-ci-gates)
- [Submitting Changes](#submitting-changes)
- [CI/CD Pipeline](#cicd-pipeline)
- [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

- Node.js ≥20.0.0
- npm ≥10.0.0
- Git
- GitHub account

### Setup

For the backend client contract used by the frontend, see the OpenAPI spec in [openapi.yaml](openapi.yaml). It documents the endpoints surfaced by [lib/api.ts](lib/api.ts) and is kept in sync with API changes.

1. **Fork the repository**

   ```bash
   # On GitHub, click "Fork"
   ```

2. **Clone your fork**

   ```bash
   git clone https://github.com/YOUR_USERNAME/aframp.git
   cd aframp
   ```

3. **Add upstream remote**

   ```bash
   git remote add upstream https://github.com/aframp/aframp.git
   ```

4. **Install dependencies**

   ```bash
   npm install
   ```

5. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

---

## Development Workflow

### 1. Create Feature Branch

```bash
# Update main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/descriptive-name
```

**Branch naming conventions:**

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `refactor/` - Code refactoring
- `test/` - Test additions
- `chore/` - Maintenance tasks

### 2. Make Changes

```bash
# Edit files
# Run tests frequently
npm run test:watch

# Check code quality
npm run lint
npm run format:check
npm run type-check
```

### 3. Commit Changes

```bash
# Stage changes
git add .

# Commit with conventional commit format
git commit -m "feat: add new payment method"
```

**Commit message format:**

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Code style (formatting)
- `refactor` - Code refactoring
- `test` - Test additions
- `chore` - Maintenance

**Example:**

```
feat(kyc): add document verification

Add support for document verification in KYC flow.
Implements OCR-based validation for ID documents.

Closes #123
```

### 4. Push Changes

```bash
git push origin feature/your-feature-name
```

### 5. Create Pull Request

1. Go to GitHub
2. Click "New Pull Request"
3. Select your branch
4. Fill in PR template
5. Submit for review

---

## Frontend vs backend

This repository is the **merchant frontend only**. The API, database and all business logic live in [`kellymusk/aframp-backend`](https://github.com/kellymusk/aframp-backend).

- **Don't build backend features here.** No new API routes, database code, migrations or ORM/database packages. The only server routes this repo owns are `app/api/session` (session cookie bridge) and `app/api/banks` (cached bank list).
- **The frontend calls the backend through the `/backend` proxy** configured in `next.config.mjs` (see [`docs/adr-001-backend-proxy.md`](docs/adr-001-backend-proxy.md)), using `lib/api/*`.
- **The API contract is the backend's `openapi.yaml`.** If a feature needs an endpoint that doesn't exist, open an issue in `kellymusk/aframp-backend` and label the frontend issue `blocked: backend` until it ships.

The [`No Backend Guard`](.github/workflows/no-backend-guard.yml) check fails any PR that adds API routes, database/server code or database dependencies to this repo.

---

## Contributing via dev-frontend

If you want to build or experiment with frontend features **without touching the production frontend**, use the `dev-frontend` branch. It is a sandboxed workflow designed to prevent accidental changes to production files.

### The sandbox directory

All work on this branch lives inside the [`dev-frontend/`](dev-frontend/) directory. Create your own feature folder there (e.g. `dev-frontend/my-feature/`) for new components, pages, hooks, tests, and docs. You may read the main frontend code for reference, but must not edit it.

See [`dev-frontend/README.md`](dev-frontend/README.md) for full setup instructions and rules.

### Protected paths

The following paths are the production codebase and **must not be modified** from the `dev-frontend` branch:

| Protected path    | Contents                     |
| ----------------- | ---------------------------- |
| `app/`            | Next.js routes and pages     |
| `components/`     | Shared UI components         |
| `lib/`            | Core libraries and utilities |
| `hooks/`          | Shared React hooks           |
| `styles/`         | Global styles                |
| `public/`         | Static assets                |
| `types/`          | Shared TypeScript types      |
| `next.config.mjs` | Next.js configuration        |
| `next-env.d.ts`   | Next.js type declarations    |

### Guard CI

The workflow [`.github/workflows/dev-frontend-guard.yml`](.github/workflows/dev-frontend-guard.yml) runs on every push to, and every pull request targeting, `dev-frontend`. It diffs the changed files and **fails the check** if any file matches a protected path, listing the offending files in the job output. If it fails, revert those changes (e.g. `git checkout upstream/dev-frontend -- <file>`) and move your work into `dev-frontend/`.

Once reviewed and approved, a maintainer will merge or cherry-pick sandbox work into `main` with full test coverage.

### Quick-start checklist

- [ ] Fork the repo and clone your fork
- [ ] Add the upstream remote: `git remote add upstream https://github.com/kellymusk/Aframp.git`
- [ ] Branch from `dev-frontend`: `git fetch upstream && git checkout -b feat/my-feature upstream/dev-frontend`
- [ ] Read [`dev-frontend/README.md`](dev-frontend/README.md)
- [ ] Create your feature folder: `mkdir dev-frontend/my-feature`
- [ ] Keep all changes inside `dev-frontend/` (check with `git diff --name-only upstream/dev-frontend`)
- [ ] Use [conventional commits](#3-commit-changes)
- [ ] Open your PR against the **`dev-frontend`** branch (not `main`)
- [ ] Confirm the **Dev-Frontend Guard** check passes

---

## Code Standards

### TypeScript

- Use strict mode (enabled by default)
- Add explicit return types to functions
- Avoid `any` type (use `unknown` if needed)
- Use interfaces for object shapes

```typescript
// ✅ Good
interface User {
  id: string
  name: string
  email: string
}

function getUser(id: string): Promise<User> {
  // ...
}

// ❌ Avoid
function getUser(id: any): any {
  // ...
}
```

### React Components

- Use functional components with hooks
- Keep components focused and reusable
- Add prop types/interfaces
- Use meaningful component names

```typescript
// ✅ Good
interface ButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
}

export function Button({ label, onClick, disabled }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  )
}

// ❌ Avoid
export function Btn(props: any) {
  return <button {...props} />
}
```

### Styling

- Use Tailwind CSS classes
- Avoid inline styles
- Use CSS modules for complex styles
- Follow mobile-first approach

```typescript
// ✅ Good
<div className="flex flex-col gap-4 md:flex-row">
  <button className="px-4 py-2 bg-blue-500 text-white rounded">
    Click me
  </button>
</div>

// ❌ Avoid
<div style={{ display: 'flex', flexDirection: 'column' }}>
  <button style={{ padding: '8px 16px', backgroundColor: 'blue' }}>
    Click me
  </button>
</div>
```

### File Organization

```
components/
├── common/           # Reusable components
│   ├── Button.tsx
│   └── Modal.tsx
├── kyc/              # Feature-specific
│   ├── KycForm.tsx
│   └── KycStatus.tsx
└── __tests__/        # Tests
    └── Button.test.tsx
```

---

## Error Display Conventions

Error handling in the UI follows a single, documented convention so contributors don't have to guess which pattern to use. Pick the component based on **where** the error occurs, not personal preference.

### `ErrorState` — full-page load failures

Use [`ErrorState`](components/ui/error-state.tsx) when a **page-level data fetch fails** and the user has nothing meaningful to interact with until it succeeds. It renders a centered, full-page message and a **retry button** wired to `onRetry`.

```tsx
// ✅ Full-page load failure with retry
if (error) {
  return <ErrorState message={error} onRetry={refetch} />
}
```

- Always pass `onRetry` so the user can recover without a full reload.
- Use it for top-level page loads (e.g. `app/(app)/home/page.tsx`, `app/(app)/withdraw/page.tsx`).
- Do **not** use it for errors that occur after the page has already rendered content.

### `Alert` — inline form/action errors

Use [`Alert`](components/ui/alert.tsx) with `variant="destructive"` for errors tied to a **specific form, field, or action** while the rest of the page stays usable.

```tsx
// ✅ Inline form/action error
<Alert variant="destructive">
  <AlertDescription>{error}</AlertDescription>
</Alert>
```

- Place it next to the form or action that produced the error.
- Use it for validation failures, failed submissions, and transient action errors.
- Do **not** use it as a replacement for a full-page load failure.

### Quick reference

| Situation                                | Component                     |
| ---------------------------------------- | ----------------------------- |
| Page-level fetch failed, nothing to show | `ErrorState` (with `onRetry`) |
| Form validation / submit / action failed | `Alert variant="destructive"` |

When adding a new page, follow this convention rather than choosing arbitrarily. If you find an existing page that violates it, fix it as part of your change.

---

## Testing

### Backend BigInt Fields

Every backend wire field carrying a large integer must be added to `BIGINT_KEYS` in [lib/api.ts](lib/api.ts) and to the field-name alternatives in `parseWithBigInts`' pre-parse regex. Both are required to avoid precision loss in `JSON.parse`. Add or update coverage in [lib/**tests**/api.test.ts](lib/__tests__/api.test.ts).

### Writing Tests

```typescript
// components/__tests__/Button.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../Button'

describe('Button', () => {
  it('renders with label', () => {
    render(<Button label="Click me" onClick={() => {}} />)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const onClick = jest.fn()
    render(<Button label="Click me" onClick={onClick} />)

    await userEvent.click(screen.getByText('Click me'))
    expect(onClick).toHaveBeenCalled()
  })
})
```

### Running Tests

```bash
# Run all tests
npm run test

# Watch mode (re-run on changes)
npm run test:watch

# Coverage report
npm run test:coverage
```

### End-to-End Tests

The E2E suite is covered in detail in [Local CI Gates → E2E (Playwright)](#e2e-playwright).
Quick reference:

```bash
# One-time browser install
npx playwright install --with-deps chromium

# Run the suite
npm run test:e2e
```

### Coverage Requirements

- **Minimum:** 70% across all metrics
- **Target:** 80%+ for new code
- **Metrics:** Lines, Statements, Functions, Branches

### Codecov Setup

This repository uploads coverage reports to Codecov in CI. Before opening or updating a PR, add the repository secret `CODECOV_TOKEN` in the GitHub repository settings under `Settings -> Secrets and variables -> Actions`.

The token is required for the `codecov/codecov-action` step in the CI workflow to publish results to Codecov after `npm run test:coverage` completes.

---

## Local CI Gates

Every gate listed here mirrors exactly what GitHub Actions runs. Run them all before pushing so you get the same result the CI server will.

The fastest way is the all-in-one script:

```bash
./test-ci-local.sh
```

Or run each gate individually as described below.

---

### E2E (Playwright)

**What it checks:** Full browser flows — login, onramp, payment request — against an intercepted mock backend. Fails the same as the `e2e` CI job.

**One-time setup** (after `npm install` / `npm ci`):

```bash
# Downloads the Chromium binary that Playwright uses.
# --with-deps also installs required OS libraries on Linux.
npx playwright install --with-deps chromium
```

On a Mac or if you already have the system libraries you can omit `--with-deps`:

```bash
npx playwright install chromium
```

**Run:**

```bash
npm run test:e2e
```

Playwright starts the Next.js dev server on port 3001 automatically (configured in `playwright.config.ts`). The tests intercept all backend requests with `page.route()` so no running API is required.

**View the HTML report after a failure:**

```bash
npx playwright show-report
```

---

### Diff Coverage (80% on changed files)

**What it checks:** Every source file you added or changed in this branch (under `app/`, `components/`, `lib/`, `hooks/`) must have ≥80% statement _and_ line coverage. This is stricter than the repo-wide 70% floor — it applies only to what your PR touches.

The check reads `coverage/coverage-summary.json`, so run the Jest coverage step first:

```bash
# Step 1 — produce the coverage report
npm run test:coverage

# Step 2 — check the diff against origin/main
npm run test:diff-coverage
```

`test:diff-coverage` resolves the base automatically via `git merge-base origin/main HEAD`, so it works from any branch.

To check against a specific base:

```bash
node scripts/check-diff-coverage.js <base-sha> <head-sha>
# or via env vars:
DIFF_BASE=origin/main node scripts/check-diff-coverage.js
```

**Interpreting the output:**

```
FAIL  app/onramp/page.tsx: statements 61%, lines 65% — below 80%
FAIL  components/ui/amount-input.tsx: statements 0%, lines 0% — no coverage collected (untested)
```

A file shown as "no coverage collected" means Jest never executed it — add at least one test for it.

---

### Bundle Budget (40 KB per route, gzipped)

**What it checks:** The route-specific JavaScript each App Router page adds on top of the shared framework runtime and layouts must stay under **40 KB gzipped**. Shared chunks (runtime, polyfills, layouts) are excluded — they are cached and not counted against any single route.

The check reads the `.next/` build output, so run the production build first:

```bash
# Step 1 — production build with bundle analysis
npm run build:analyze

# Step 2 — check each route's gzipped JS size
node scripts/check-bundle-budget.mjs
```

`npm run build:analyze` is identical to `npm run build` but also writes the bundle-analyzer HTML report to `.next/analyze/`.

**Interpreting the output:**

```
OK   /home: 12.34 KB gzipped
OK   /onramp: 28.91 KB gzipped
FAIL /admin/users: 47.22 KB gzipped

Bundle budget exceeded for 1 route(s). Maximum route-specific JS is 40 KB gzipped.
```

To reduce a route's weight:

- Move heavy imports behind `next/dynamic` so they are code-split and not counted.
- Audit `import` statements in the page and its direct dependencies with the analyzer report.
- Replace large libraries with lighter alternatives.

---

### Running all gates together

```bash
./test-ci-local.sh
```

This runs every gate in the same order as CI: lint → type-check → prettier → tests + diff-coverage → E2E → build + bundle-budget. A single failing step exits early with a non-zero code.

---

## Submitting Changes

### Before Submitting

1. **Run local CI checks**

   ```bash
   ./test-ci-local.sh
   ```

2. **Verify all checks pass**
   - ✅ ESLint
   - ✅ Prettier
   - ✅ TypeScript
   - ✅ Tests & diff coverage (80% on changed files — see [Local CI Gates](#diff-coverage-80-on-changed-files))
   - ✅ E2E (Playwright — see [Local CI Gates](#e2e-playwright))
   - ✅ Build & bundle budget (40 KB/route — see [Local CI Gates](#bundle-budget-40-kb-per-route-gzipped))

3. **Update documentation**
   - Add/update comments
   - Update README if needed
   - Document breaking changes

### PR Checklist

- [ ] Branch created from `develop` or `main`
- [ ] Commits follow conventional format
- [ ] Tests added/updated
- [ ] Coverage maintained (≥70% overall; ≥80% on changed files)
- [ ] Code follows style guide
- [ ] Documentation updated
- [ ] No console errors/warnings
- [ ] Local CI checks pass (`./test-ci-local.sh`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] Bundle budget passes (`npm run build:analyze && node scripts/check-bundle-budget.mjs`)

### PR Description Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues

Closes #123

## Testing

Describe testing performed

## Screenshots (if applicable)

Add screenshots for UI changes

## Checklist

- [ ] Tests pass
- [ ] Coverage maintained
- [ ] Documentation updated
```

---

## CI/CD Pipeline

### Automated Checks

When you push or create a PR, GitHub Actions automatically runs:

1. **Code Quality** (2-3 min)
   - ESLint
   - Prettier
   - TypeScript

2. **Tests & Coverage** (3-5 min)
   - Jest tests
   - Coverage report
   - Codecov upload
   - Route bundle budget (40 KB gzipped — `scripts/check-bundle-budget.mjs`)

3. **Diff Coverage** (PR only, 2-3 min)
   - 80% statement + line coverage required on every changed file (`scripts/check-diff-coverage.js`)

4. **E2E** (3-5 min)
   - Playwright Chromium suite (`npm run test:e2e`)

5. **Build** (4-6 min)
   - Next.js production build
   - Artifact upload

### Workflow Status

- ✅ All checks pass → Ready to merge
- ❌ Any check fails → Fix issues and push again
- ⏳ Checks running → Wait for completion

### Viewing Results

1. Go to PR
2. Scroll to "Checks" section
3. Click on failed check to see logs
4. Fix issues locally
5. Push again

---

## Troubleshooting

### Tests Failing

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Run tests
npm run test:coverage
```

### Linting Errors

```bash
# Auto-fix formatting
npm run format

# Check remaining issues
npm run lint
```

### Build Failures

```bash
# Check TypeScript
npm run type-check

# Try clean build
rm -rf .next
npm run build
```

### Git Issues

```bash
# Update branch with latest main
git fetch upstream
git rebase upstream/main

# Force push (use carefully!)
git push origin feature/name --force-with-lease
```

---

## Code Review Process

### What Reviewers Look For

- ✅ Code follows style guide
- ✅ Tests are comprehensive
- ✅ No breaking changes
- ✅ Documentation
