# ADR-002: Browser-to-Backend Direct API Calls (No BFF Layer)

**Status:** Accepted  
**Date:** 2024-01-15  
**Deciders:** Core engineering team  
**Ticket / Issue:** [#523](https://github.com/aframp/aframp/issues/523)

---

## Context

Aframp's frontend is a Next.js 15 application. The backend is a separate Rust/Axum
service (`Aframp-backend`) running at a configurable origin
(`NEXT_PUBLIC_API_URL`, defaulting to `http://127.0.0.1:3000`).

A common pattern in Next.js applications is to place a **Backend-for-Frontend
(BFF)** layer — Next.js API Routes (`app/api/`) — between the browser and the
upstream service. The BFF acts as a proxy/adapter: the browser only ever talks
to the Next.js origin, and the Next.js server talks to the real backend.

We must decide whether to adopt the BFF pattern or let the browser call the
Rust backend directly.

The key constraints that influence this decision:

1. The backend already implements a complete, typed REST API with its own
   authentication (JWT Bearer tokens).
2. The frontend has no server-side secrets that need to be forwarded to the
   backend — all auth tokens originate in the browser after a successful login.
3. Auth tokens are 24-hour JWTs with no refresh token path; the session
   lifecycle is managed entirely client-side (`components/session-provider.tsx`).
4. The application is deployed as a static/standalone Next.js build (Vercel,
   Docker), not as a full Node.js server with persistent runtime state.
5. No next.js server-side pages require backend data at render time (all pages
   are `'use client'` or are public static pages with no auth).

## Decision

We will **not** introduce a BFF layer. The browser calls the Rust/Axum backend
directly using `fetch()` with an `Authorization: Bearer <token>` header
(`lib/api.ts`). There are no Next.js API routes (`app/api/` does not exist).

The backend's CORS policy is configured to allow requests from the frontend
origin (`CORS_ALLOWED_ORIGINS` on the backend, defaulting to
`http://localhost:3001` to match the dev server).

## Rationale

### Considered alternatives

| Option | Pros | Cons |
|--------|------|------|
| **Direct browser → backend (chosen)** | Zero additional latency hop; no duplicated route code; backend is the single source of truth for the API contract; no Next.js server to keep warm or scale for API traffic | CORS must be configured correctly on the backend; bearer token visible to JavaScript (mitigated by localStorage decision, see ADR-004) |
| BFF via Next.js API Routes | Hides backend origin from the client; can forward HttpOnly cookies; one origin for all requests (simpler CORS); server-side request coalescing | Additional latency for every API call (browser → Next.js → Rust); duplicates all routes; requires a persistent Next.js server (higher hosting cost / cold-start risk on serverless); any bug in the proxy layer becomes an incident; no clear benefit given the existing backend exposes a complete API |
| GraphQL gateway | Single flexible endpoint; per-client field selection | Over-engineered for the current API surface (< 10 endpoints); no existing GraphQL schema on the backend; adds a runtime dependency |

### Why a BFF adds cost without benefit here

A BFF is most valuable when:

- The browser cannot be trusted with credentials (e.g., the upstream service
  uses a shared secret that must not leave the server). Here, the JWT is the
  credential, and it already lives in the browser by design.
- Multiple upstream services need to be aggregated into a single request. Here,
  there is exactly one backend service.
- The backend API is versioned independently and the BFF provides a stable
  adapter. Here, both frontend and backend are co-owned and versioned together.
- SSR/RSC needs data at render time. Here, all pages are client-rendered and
  fetch data after mount.

### CORS configuration note

Because the browser makes cross-origin requests, the backend must set
`Access-Control-Allow-Origin` to the deployed frontend URL. This is handled in
the Rust backend's CORS middleware, not in the frontend. The `NEXT_PUBLIC_API_URL`
env var must be set to a URL that the backend's CORS policy allows.

The frontend dev server intentionally runs on port 3001 (not 3000) to avoid
colliding with the backend, and the backend's default `CORS_ALLOWED_ORIGINS`
is set to `http://localhost:3001` for this reason (see `.env.example`).

## Consequences

### Positive

- No additional network hop means every API call is as fast as possible.
- No duplicated route definitions to keep in sync between Next.js and Rust.
- The Rust backend's API is the canonical contract; the frontend's `lib/api.ts`
  is a thin typed wrapper, not an abstraction layer.
- No Node.js server process needed at runtime — the Next.js app can be deployed
  as a fully static/standalone build.
- Simpler infrastructure: one service to scale for API traffic (the Rust backend)
  rather than two.

### Negative / Risks

- **CORS misconfiguration** is a deployment footgun: if `CORS_ALLOWED_ORIGINS`
  on the backend does not include the production frontend URL, every API call
  fails with a CORS preflight error. Mitigation: this is documented in `.env.example`
  and the setup guide; CI runs against a known-good configuration.
- **Bearer token in JavaScript**: the token is stored in `localStorage` and
  attached to every request by JavaScript. This means XSS that can run arbitrary
  script can read the token. Mitigation: CSP headers in `next.config.mjs` restrict
  inline scripts and external script sources; see ADR-004 for the full
  token-storage security review.
- **Backend URL is `NEXT_PUBLIC_`** (visible to the browser): this is intentional.
  The URL is not a secret — the browser has to reach the backend directly. Any
  secrets (e.g., Paystack keys used for server-side processing) remain on the
  Rust backend and are never sent to the browser.

### Neutral

- API errors surface directly to the browser without sanitisation by a proxy
  layer. The Rust backend is responsible for not leaking internal details in
  error responses.
- Adding Next.js API routes in the future for specific use cases (webhooks,
  server-side Paystack callbacks) is still possible without changing this
  architectural decision — those would be server-only routes, not a BFF proxy.

## Links

- [`lib/api.ts`](../../lib/api.ts) — typed client wrapping all backend calls
- [`components/session-provider.tsx`](../../components/session-provider.tsx) — JWT lifecycle management
- [`.env.example`](../../.env.example) — documents the CORS port convention
- [ADR-004: CSRF Protection and Token Storage](./0004-csrf-protection.md)
- [Backends for Frontends — Sam Newman](https://samnewman.io/patterns/architectural/bff/)
