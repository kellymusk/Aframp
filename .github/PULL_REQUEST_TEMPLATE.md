## Summary

<!-- One or two sentences explaining what this PR does and why. -->

Closes #<!-- issue number -->

---

## Type of Change

<!-- Check all that apply -->

- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] 🚀 New feature (non-breaking change that adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing behaviour to change)
- [ ] ♻️ Refactor (no functional change, code quality improvement)
- [ ] 🎨 UI / design update
- [ ] 📦 Dependency update
- [ ] 🔧 Configuration / tooling change
- [ ] 📝 Documentation update
- [ ] 🔒 Security fix

---

## Changes Made

<!-- Bullet-point list of concrete changes in this PR. -->

- 
- 
- 

---

## Testing

<!-- Describe what you tested and how. -->

- [ ] Manual testing in local development (`npm run dev`)
- [ ] Unit tests added or updated (`npm test`)
- [ ] Existing tests still pass (`npm test`)
- [ ] Tested on Stellar **Testnet** (if blockchain changes are included)
- [ ] Tested with demo mode OFF (`NEXT_PUBLIC_DEMO_MODE=false`)
- [ ] Verified on mobile viewport (if UI changes are included)

**Test steps for reviewers:**

1. 
2. 
3. 

---

## Screenshots / Screen Recording

<!-- For UI changes, paste before/after screenshots or a short recording.
     Drag and drop images directly into this text box. -->

| Before | After |
|--------|-------|
|        |       |

---

## Checklist

<!-- All boxes must be checked before requesting review. -->

### Code Quality
- [ ] Code follows the project's style and conventions (ESLint passes: `npm run lint`)
- [ ] TypeScript types are correct (no new `any` without justification): `npm run type-check`
- [ ] No secrets, wallet keys, or PII committed to the repository
- [ ] New `NEXT_PUBLIC_*` variables added to `.env.example` (if applicable)

### Observability
- [ ] New API routes use `captureError` / `log` from `lib/observability`
- [ ] New Stellar SDK calls are wrapped in try/catch forwarding to `captureError`
- [ ] No sensitive data (private keys, mnemonics, tokens) passed to `log.*` or `captureError`

### Security
- [ ] User inputs are validated with Zod (or equivalent) before processing
- [ ] No new server-side secrets are exposed via `NEXT_PUBLIC_*` variables
- [ ] Webhook signatures are verified where applicable
- [ ] Rate limiting applied to new public API endpoints (Upstash)

### Accessibility (UI changes only)
- [ ] Interactive elements have accessible labels (`aria-label`, `aria-describedby`)
- [ ] Colour contrast meets WCAG AA (4.5:1 for normal text)
- [ ] Keyboard navigation works for new interactive components

### Documentation
- [ ] Inline code comments added for non-obvious logic
- [ ] README or docs updated if the change affects setup or configuration
- [ ] `SECURITY.md` updated if the change affects the security surface (rare)

---

## Deployment Notes

<!-- List anything a reviewer or deployer needs to know:
     new env vars to set, migrations to run, feature flags to toggle, etc. -->

- 

---

## Related Issues / PRs

<!-- Link any related issues or pull requests. -->

- 
