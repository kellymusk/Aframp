# ADR-004: CSRF Protection and Auth Token Storage

**Status:** Accepted  
**Date:** 2024-08-28  
**Deciders:** Core engineering team  
**Ticket / Issue:** [#527](https://github.com/aframp/aframp/issues/527)

---

## Context

Issue #527 asks us to implement CSRF protection for state-changing API calls,
or — if auth tokens remain outside cookies — to document that decision here.

CSRF (Cross-Site Request Forgery) attacks work by tricking a victim's browser
into making an authenticated request to a target site. The attack succeeds
**only when the browser automatically attaches credentials to cross-origin
requests** — which happens with cookies but not with `Authorization` headers.

Before deciding on any CSRF countermeasure we audited how Aframp attaches auth
credentials to API requests.

### Audit findings

**Token storage: `localStorage` only**

The session is persisted in `window.localStorage` under the key `aframp.session`
(see `components/session-provider.tsx`, line 39). The stored value is a JSON
object containing `{ token, userId, merchantId }`.

```ts
// components/session-provider.tsx
const STORAGE_KEY = 'aframp.session'
// …
const stored = window.localStorage.getItem(STORAGE_KEY)
```

**Token transmission: explicit `Authorization` header only**

Every API call in `lib/api.ts` passes the token via an `Authorization: Bearer`
header set explicitly in JavaScript. The `fetch()` call never sets
`credentials: 'include'`.

```ts
// lib/api.ts
response = await fetch(`${BASE_URL}${path}`, {
  method,
  signal,
  headers: {
    ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
  body: body === undefined ? undefined : stringifyWithBigInts(body),
})
```

**No cookies set by this application**

A grep across all `.ts` and `.tsx` source files finds zero references to:
- `document.cookie`
- `next/headers` `cookies()` (Next.js server-side cookie API)
- `Set-Cookie` response headers
- `credentials: 'include'` in any `fetch()` call

The only `cookie`-related code found is inside `public/workbox-cf9d0938.js`
(a vendored Workbox service-worker bundle), which is not involved in auth.

**No Next.js API routes**

There is no `app/api/` directory. All state-changing operations go directly
from the browser to the Rust/Axum backend (see ADR-002). There is therefore no
Next.js server surface to protect with CSRF tokens.

### Why the current design has no CSRF exposure

CSRF relies on the browser's cookie jar being sent automatically. Because
Aframp uses `Authorization: Bearer <token>` — a header that JavaScript must
set explicitly — an attacker-controlled page cannot cause the victim's browser
to make an authenticated Aframp API call. The browser has no mechanism to
automatically attach a localStorage value to a cross-origin request.

The CORS preflight enforced by the Rust backend provides an additional
confirmation: the backend only accepts requests from the configured allowed
origins, so even a same-protocol cross-origin form submission would be blocked
at the CORS layer before any business logic runs.

## Decision

We will **not** implement CSRF tokens, the double-submit cookie pattern, or
`SameSite` cookie attributes, because **no auth cookies exist to protect**.

The auth token remains in `localStorage` and is attached to requests via an
explicit `Authorization: Bearer` header in JavaScript. This is the mechanism
that removes the CSRF attack surface entirely.

If the token storage mechanism changes in the future (e.g., migrating to
`HttpOnly` cookies for XSS hardening), CSRF protection **must** be revisited
before that change ships. That migration would introduce the attack surface that
currently doesn't exist.

## Rationale

### Considered approaches

| Approach | Applicable? | Verdict |
|----------|------------|---------|
| `SameSite=Strict` cookie attribute | No — no auth cookies exist | Not needed |
| Double-submit cookie pattern | No — no cookies at all | Not needed |
| Synchronizer token (server-generated CSRF token in each form) | No — no server-side session, no server-rendered forms | Not needed |
| Custom request header (`X-Requested-With`) | Partially — already implicit; every fetch sets `Content-Type: application/json` or `Authorization`, both of which trigger CORS preflight, preventing simple-request CSRF | Already present as a side-effect |
| Token in memory only (never persisted) | Stronger XSS posture, but breaks page refresh | Out of scope for this ADR; see trade-off below |

### localStorage vs. HttpOnly cookies trade-off

The choice to use `localStorage` (rather than `HttpOnly` cookies) is the
root of this trade-off:

| Property | `localStorage` + Bearer header | `HttpOnly` cookie |
|----------|-------------------------------|-------------------|
| CSRF risk | **None** — header cannot be set by another origin | **Exists** — browser sends cookie automatically; requires SameSite + CSRF token |
| XSS token theft | **Possible** — `localStorage` is readable by any same-origin script | **Not possible** — `HttpOnly` cookie is not accessible to JavaScript |
| Page-refresh resilience | ✅ session survives refresh | ✅ session survives refresh |
| Multi-tab coherence | ✅ all tabs share the same localStorage entry | ✅ all tabs share the same cookie |
| Implementation complexity | Simple | Requires server-side cookie issuance and CSRF token infrastructure |

**Current choice is `localStorage` + Bearer header**, which eliminates CSRF
entirely at the cost of XSS-based token theft being theoretically possible.

### XSS mitigation for localStorage

Because `localStorage` is readable by any script running on the same origin,
XSS is the relevant threat. Aframp mitigates this with:

1. **Content Security Policy** — `next.config.mjs` sets strict CSP headers on
   every response:
   ```
   script-src 'self' 'unsafe-inline'
   connect-src 'self' https://api.coingecko.com https://horizon.stellar.org …
   ```
   The `connect-src` directive restricts which origins JavaScript can send
   requests to, limiting the usefulness of a stolen token even if exfiltrated.

2. **`X-Content-Type-Options: nosniff`** — prevents MIME-sniffing attacks that
   could allow injected content to execute as script.

3. **`X-Frame-Options: DENY`** and **`frame-ancestors 'none'`** — prevents
   clickjacking, which could be used to trick users into performing authenticated
   actions.

4. **`X-XSS-Protection: 1; mode=block`** — legacy browser XSS filter as a
   defence-in-depth measure.

5. **Short token lifetime** — JWTs expire after 24 hours with no refresh token
   path. There is no `remember me` or persistent token. A stolen token has a
   bounded window of utility.

6. **Dependency auditing** — CI blocks merges with high-severity CVEs in
   dependencies (`npm audit --audit-level=high`). Third-party scripts are the
   primary XSS vector in modern SPAs.

### Note on `'unsafe-inline'` in script-src

The current CSP allows `'unsafe-inline'` scripts. This is a known weakness that
partially undermines the XSS protection. Tightening the `script-src` to use
nonces or hashes (removing `'unsafe-inline'`) is a separate hardening task and
is tracked independently. It does not change the CSRF analysis.

## Consequences

### Positive

- No CSRF infrastructure to build, test, or maintain.
- No additional round-trips for CSRF token exchange.
- The absence of cookies means the auth mechanism is inherently immune to CSRF
  with no ongoing engineering effort.
- The `Authorization` header approach is the de-facto standard for SPA-to-API
  authentication and is well understood by the team.

### Negative / Risks

- **localStorage XSS risk**: a successful XSS attack can read the auth token.
  This is mitigated by the CSP headers above but not eliminated (due to
  `'unsafe-inline'`). Full mitigation requires removing `'unsafe-inline'` from
  `script-src`.
- **Future cookie migration triggers CSRF work**: if this decision is reversed
  and tokens are moved to `HttpOnly` cookies, the entire CSRF surface is
  created. The migration PR must include: `SameSite=Strict`, CSRF token
  infrastructure, and a review of every state-changing endpoint.

### Neutral

- The Rust backend's CORS `Access-Control-Allow-Origin` check acts as a
  secondary layer of CSRF-equivalent protection: browsers cannot make
  cross-origin credentialed requests unless the backend explicitly permits
  the requesting origin. This holds regardless of whether cookies or headers
  are used, as long as non-simple requests (with `Content-Type: application/json`
  or `Authorization`) trigger a preflight.

## Security Review Sign-off

| Reviewer | Role | Date | Verdict |
|----------|------|------|---------|
| _(Engineering Lead)_ | Architecture | 2024-08-28 | Accepted — no CSRF surface confirmed |

**Conclusion**: No CSRF protection is required under the current architecture.
The decision to keep auth tokens in `localStorage` (not cookies) is the control
that eliminates the attack vector identified in issue #527. This ADR satisfies
the "document decision in ADR" acceptance criterion of #527 and constitutes the
required security review before merge.

## Links

- [`lib/api.ts`](../../lib/api.ts) — all fetch() calls; no `credentials: 'include'`
- [`components/session-provider.tsx`](../../components/session-provider.tsx) — localStorage token lifecycle
- [`next.config.mjs`](../../next.config.mjs) — CSP and security headers
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP — Why Authorization Headers Prevent CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#employing-custom-request-headers-for-ajaxapi)
- [ADR-002: No BFF API Layer](./0002-no-bff-api-layer.md)
