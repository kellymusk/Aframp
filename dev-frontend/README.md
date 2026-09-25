# 🛠️ dev-frontend — Contributor Sandbox

This directory is the **safe workspace** for contributors on the `dev-frontend` branch.

## Rules

| ✅ Allowed | ❌ Forbidden |
|-----------|-------------|
| Create files inside `dev-frontend/` | Modify anything in `app/` |
| Open PRs targeting `dev-frontend` branch | Modify anything in `components/` |
| Add new components, pages, hooks here | Modify anything in `lib/` |
| Write tests inside `dev-frontend/` | Modify `next.config.mjs` |
| Add docs here | Modify `styles/`, `public/`, `types/`, `hooks/` |

## Why?

The main frontend (`app/`, `components/`, `lib/`, etc.) is the production codebase.
Contributors using this branch experiment and build new features in isolation here
before they are reviewed, tested, and merged into `main`.

The CI workflow `.github/workflows/dev-frontend-guard.yml` **automatically fails**
any push or PR on this branch that touches a protected main-frontend path.

## Getting Started

1. Clone the repo and check out `dev-frontend`:
   ```bash
   git checkout dev-frontend
   ```

2. Create your feature directory under `dev-frontend/`:
   ```bash
   mkdir dev-frontend/my-feature
   cd dev-frontend/my-feature
   ```

3. Build your feature. Reference the main frontend code **read-only** for patterns.

4. Open a PR against `dev-frontend`. The guard CI will verify you haven't
   accidentally edited any production files.

5. Once reviewed and approved, a maintainer will cherry-pick or merge your
   changes into `main` with full test coverage.

## Questions?

Open an issue on GitHub or ping a maintainer in the PR.
