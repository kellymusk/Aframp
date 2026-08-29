# Lighthouse CI wiring

## What was already there

`lighthouserc.json` existed and a `lighthouse` job in
`.github/workflows/ci.yml` already ran `lhci autorun` against a production
build on every `pull_request` targeting `main`/`develop` (via the workflow's
top-level `on:` triggers). So the job itself was already wired in — the gaps
were in what it enforced and how results surfaced.

## What this change fixes

1. **Wrong performance gate.** `lighthouserc.json` asserted
   `categories:performance` with `minScore: 0.3` — a 30% floor, not the 80%
   the issue calls for. Accessibility (`0.9`) and Best Practices (`0.9`) were
   already correct. Changed performance to `0.8`.
2. **No report link surfaced on the PR.** The job uploaded results as a
   GitHub Actions artifact and (optionally) to the LHCI GitHub App, but there
   was no PR comment linking to the report — a reviewer had to dig into the
   workflow run. Added a step that reads `.lighthouseci/links.json` (written
   by `lhci autorun` when `upload.target` is `temporary-public-storage`,
   which `lighthouserc.json` already sets) and posts/updates a PR comment
   with a link per page. It updates its own prior comment on rediscovery
   rather than piling up duplicates on repeated pushes.

## Verifying

This wasn't run in CI as part of this change (no build/test pass was done
here). Whoever picks up the PR should:

1. Push a commit and open/update a PR against `dev` to trigger the workflow.
2. Confirm the `lighthouse` job runs, and that a PR comment titled
   "🔦 Lighthouse CI Report" appears with report links for `/`, `/login`,
   and `/signup`.
3. Temporarily drop a category below its threshold (or check a past red run)
   to confirm the job actually fails the PR rather than just warning.
