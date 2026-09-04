# Trust & Compliance section

Implements the landing-page "Trust & compliance" section requested to give
business customers something concrete to evaluate before signing up.

## What was added

- `lib/landing-light-data.ts` — new `trust` export: eyebrow, title, blurb,
  and three `items` (Stellar Network, Responsible Disclosure, Open Source),
  each with a real outbound link.
- `components/landing-light/trust.tsx` — new `Trust` section component,
  rendered between Pricing and FAQ in `app/page.tsx`. Three-card grid,
  theme-aware (`dark:` classes matching the rest of `landing-light`), each
  card links out with `target="_blank" rel="noopener noreferrer"` and an
  `sr-only` "(opens in a new tab)" hint.
- `app/page.tsx` — imports and renders `<Trust />`.

## Why the copy is worded the way it is

The acceptance criteria explicitly rule out unsubstantiated claims (e.g.
fake compliance logos). This repo has no completed third-party security
audit and no confirmed regulatory license on file, so the section avoids
claiming either:

- **Stellar Network** — links to stellar.org and describes settlement as
  independently verifiable on-chain, which is true regardless of Aframp's
  own audit/licensing status.
- **Responsible Disclosure** — links to `SECURITY.md` (which exists in this
  repo) and states plainly that no third-party audit has been commissioned
  yet, instead of implying one has.
- **Open Source** — links to the GitHub org already referenced by the CI/
  codecov badges at the top of `README.md`.

## Still needed before merge

Per the issue's acceptance criteria, this copy needs sign-off from whoever
owns compliance/legal messaging before it ships — it has not been reviewed
by anyone outside this change. If Aframp obtains a real audit report or a
specific regulatory license before this merges, swap in a link to that
document instead of the current "no audit yet" framing.
