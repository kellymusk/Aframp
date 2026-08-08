# Security Policy

## Supported Versions

We actively patch security vulnerabilities in the following versions:

| Version | Supported |
|---------|-----------|
| `main` branch (latest) | ✅ |
| Release tags < 30 days old | ✅ |
| Older releases | ❌ (please upgrade) |

---

## Reporting a Vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.**
Public disclosure before a fix is available puts all AFRAMP users at risk.

### Preferred Channel

Send a detailed report to **security@aframp.com** with the subject line:

```
[SECURITY] <brief description>
```

If you prefer end-to-end encryption, request our PGP public key in the
same email and we will reply with it.

### What to Include

A good vulnerability report includes:

1. **Description** — what the vulnerability is and which component is affected.
2. **Impact** — what an attacker could achieve (e.g. read wallet addresses,
   bypass KYC, drain user funds).
3. **Steps to reproduce** — a minimal, reliable proof-of-concept (PoC).
   Scripts or curl commands are welcome; do not submit live exploits
   against production users.
4. **Affected versions** — the commit SHA or release tag you tested against.
5. **Suggested fix** (optional) — if you have one, we welcome it.

### What to Expect

| Timeline | Action |
|----------|--------|
| Within **48 hours** | We acknowledge receipt and assign an internal tracking ID. |
| Within **5 business days** | We confirm whether the report is accepted as a valid vulnerability and assign a severity (Critical / High / Medium / Low). |
| Within **30 days** (Critical/High) | We publish a fix and a CVE (if applicable). |
| Within **90 days** (Medium/Low) | We publish a fix in a regular release. |
| After fix is deployed | We publicly credit you (unless you prefer to stay anonymous). |

We follow responsible disclosure: we will not take legal action against
researchers who act in good faith and follow this policy.

---

## Scope

### In Scope

- AFRAMP web application (`app/`, `components/`, `lib/`)
- API routes (`app/api/`)
- Stellar transaction signing and submission flows
- Payment gateway integrations (Paystack, Flutterwave, M-Pesa, MTN MoMo)
- Authentication and KYC flows
- Wallet key handling (`lib/wallet/`)
- Rate limiting and access control
- Environment variable / secret exposure

### Out of Scope

- Bugs that require physical access to a user's device
- Denial-of-service attacks that only affect your own account
- Theoretical vulnerabilities without a practical exploit
- Issues in third-party dependencies (report those upstream; let us know
  if you believe they affect AFRAMP specifically)
- Social engineering of AFRAMP team members

---

## Security Best Practices for Contributors

If you are contributing code, please follow these guidelines:

- **Never commit secrets** — use `.env.example` as a template; real values
  go in `.env.local` which is `.gitignore`d.
- **Parameterise inputs** — avoid string concatenation in queries, URLs,
  or shell commands; use validated schemas (Zod) for all API inputs.
- **Sanitise before logging** — do not log wallet private keys, mnemonics,
  payment credentials, or full Stellar addresses.
- **Use server-side secrets server-side** — variables without the
  `NEXT_PUBLIC_` prefix must never appear in client bundles.
- **Verify webhook signatures** — always check `X-Paystack-Signature`,
  Flutterwave's `verif-hash`, and equivalent headers before processing
  incoming webhooks.
- **Keep dependencies patched** — run `npm audit` before merging; our CI
  blocks merges with high-severity CVEs.

---

## Hall of Fame

We are grateful to the following researchers who have responsibly disclosed
vulnerabilities to us:

_No reports yet — be the first!_

---

## License

This security policy is published under the
[Apache 2.0 License](../LICENSE), the same license as the rest of the project.
