# ADR 001: Keep Backend Requests Behind a Same-Origin Proxy

**Status:** Accepted

## Context

The browser needs to call the backend API, but exposing its origin in browser configuration would let client code connect to the backend directly. Next.js makes variables prefixed with `NEXT_PUBLIC_` available to client-side code and bundles, so `NEXT_API_URL` must remain server-only. Publishing it as `NEXT_PUBLIC_API_URL` would reveal the configured backend origin and require the browser's Content Security Policy to allow that external origin in `connect-src`.

The application already defines a Next.js rewrite from `/backend/:path*` to the backend configured by `NEXT_API_URL`. This allows browser requests to stay on the application's own origin while Next.js forwards them server-side.

## Decision

Keep the backend origin in the unprefixed, server-side `NEXT_API_URL` variable. Browser code must call the same-origin `/backend/...` path; the rewrite forwards those requests to the configured backend. Do not rename this variable to a `NEXT_PUBLIC_*` variable or have browser code read it directly.

## Consequences

- The backend origin is not included in client-side environment configuration, and browser API calls remain same-origin.
- The Content Security Policy can keep `connect-src` limited to `'self'` and the explicitly approved external services.
- Deployments must set `NEXT_API_URL` to the backend origin. The rewrite's `http://127.0.0.1:3000` default is for local development.
- The proxy does not replace backend authentication, authorization, input validation, or other API security controls.

## Addendum: the bearer token never reaches client JS

The session token lives only in the httpOnly `aframp.session` cookie. `middleware.ts` reads it for
requests to `/backend/*`, discards any client-supplied `Authorization` header, and forwards the
request to `NEXT_API_URL` with `Authorization: Bearer <token>` attached server-side. `GET /api/session`
returns only `{ authenticated, userId, merchantId }`. The `token` argument on `api.*` calls is an
opaque marker (it enables 401 handling) and is never sent. The one place the token touches JS is the
login/OTP response on its way to `POST /api/session`.
