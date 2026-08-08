# AML / CFT Controls

Transaction monitoring, sanctions screening, velocity rules and suspicious
activity reporting for Aframp's on/off ramp.

Operating a crypto ramp in Nigeria, Kenya, Ghana, South Africa and Uganda
requires all four as a licensing condition. This document describes what is
implemented, what it deliberately does not do, and what still has to be true
before it can be relied on in production.

> **Read the "Known gaps" section before go-live.** Several things here are
> load-bearing configuration that only a compliance officer and local counsel
> can sign off, and the code cannot check them for you.

---

## Architecture

```
                       ┌──────────────────────────────┐
payment routes ───────►│  screenTransaction()         │
/api/withdrawals       │  lib/compliance/monitor.ts   │
/api/payments/…        │                              │
/api/bills/initiate    │                              │
/api/compliance/screen │                              │
                       └───────────────┬──────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              ▼                        ▼                        ▼
      wallet screening         name screening            velocity rules
   Chainalysis / Elliptic      ComplyAdvantage        lib/compliance/velocity.ts
              │                        │                        │
              └────────► local sanctions list ◄─────────┐       │
                     lib/compliance/sanctions/           │       │
                                       │                 │       │
                                       ▼                 │       ▼
                              risk aggregation ◄─────────┴───────┘
                              lib/compliance/risk.ts
                                       │
                       ALLOW ──────────┼────────── REVIEW / BLOCK
                          │                              │
                          ▼                              ▼
                  monitoring ledger              case + SAR workflow
                  lib/compliance/ledger.ts       lib/compliance/case-store.ts
                                                         │
                                                         ▼
                                                 /admin/compliance
```

| Concern | Module |
| --- | --- |
| Policy — every threshold, window and score | `lib/compliance/config.ts` |
| Market resolution, FX and payer identity | `lib/compliance/markets.ts`, `identity.ts` |
| Risk aggregation and decisions | `lib/compliance/risk.ts` |
| Velocity / behavioural rules | `lib/compliance/velocity.ts` |
| Monitoring ledger | `lib/compliance/ledger.ts` |
| Sanctions corpus and matching | `lib/compliance/sanctions/` |
| Vendor adapters | `lib/compliance/providers/` |
| Cases and SAR workflow | `lib/compliance/case-store.ts` |
| Orchestration | `lib/compliance/monitor.ts` |
| Schema | `db/migrations/003_create_compliance.sql` |

**One rule matters above the others:** payment paths call `screenTransaction()`
and act on the returned decision. They never assemble their own view of risk. A
control implemented twice is a control implemented differently.

---

## What runs on every transaction

### 1. Sanctions and wallet screening

Runs concurrently with the velocity rules — both are on the payment path.

- **Wallet addresses** → Chainalysis or Elliptic, normalised to a 0–100 score.
- **Account holder names** → ComplyAdvantage (sanctions, PEP, adverse media).
- **Both** → also matched against the local corpus, which is the failover leg.

Name matching is fuzzy, and has to be. The same person appears across lists as
`Mohammed Al-Hassan`, `Muhammad al Hassan`, `HASSAN, Mohamed` and
`Alhaji Mohammed Hassan`. Exact matching catches none of them. The matcher
normalises (case, diacritics, punctuation, honorifics), compares as token sets
so name order does not matter, and scores individual tokens with Jaro-Winkler,
which is tuned for the short shared-prefix strings transliteration produces.

The threshold is `NAME_SCREENING.matchThreshold` (0.85). It is asymmetric on
purpose — surplus name parts are penalised gently, because false positives cost
analyst minutes and false negatives cost a licence. Regulators expect this
number to be justified and periodically tested; do not change it casually.

### 2. Velocity rules

| Rule | Catches | Stage |
| --- | --- | --- |
| `VELOCITY_TX_COUNT` | More transactions than a retail user makes | Volume |
| `VELOCITY_VOLUME` | Throughput over the ceiling | Volume |
| `VELOCITY_SPIKE` | Today far above the account's *own* average | Volume |
| `STRUCTURING` | Repeated amounts just under the reporting threshold | Placement |
| `RAPID_RAMP_REVERSAL` | Onramp reversed by offramp within hours | Layering |
| `COUNTERPARTY_FANOUT` | Payouts split across many recipients | Layering |
| `NEW_ACCOUNT_HIGH_VALUE` | Large transaction with no track record | Placement |
| `DORMANT_REACTIVATION` | Large transaction after long silence | Placement |

No single velocity rule can hold a payment on its own — each scores below the
review threshold. It takes a severe signal or corroboration between rules. That
is deliberate: rules that individually block generate enough noise that analysts
stop reading them.

`VELOCITY_SPIKE` is relative rather than absolute, so it catches an account
whose normal is $50 suddenly moving $900. Absolute ceilings alone are exactly
what a competent launderer sizes their transactions against.

### 3. Scoring

```
score = max(signal scores) + 0.35 × Σ(the rest)     capped at 100
```

A plain sum was rejected: three unremarkable signals would outrank one
dangerous one, and analysts end up triaging noise ahead of danger. Taking the
max alone was also rejected: corroboration is genuine evidence. The model is
order-independent and monotone — adding a signal can never lower the score,
which is the property that makes it defensible. See `lib/compliance/risk.ts`.

Bands: `<25` LOW, `<50` MEDIUM, `<75` HIGH, `≥75` SEVERE.
Decisions: `≥50` REVIEW, `≥90` BLOCK.

**Sanctions hits bypass the score entirely and block.** A designation is a legal
prohibition, not a risk-appetite question. A PEP match never blocks — the
obligation there is enhanced due diligence, not refusal.

### 4. Recording

Every screened transaction is written to the monitoring ledger **including ones
that were blocked**. A blocked attempt is evidence of behaviour; dropping it
would make an account probing our limits look quieter than a legitimate one.

The ledger holds no PII. Counterparties are stored as a salted SHA-256 of the
account number or address. Names and account numbers exist only on case files,
where access is gated and attributed.

---

## Fail-closed

A provider that times out or errors **never produces a clean result**. It raises
`PROVIDER_UNAVAILABLE`, the local list is still consulted so designations are
caught during an outage, and with `FAIL_CLOSED` (default, and required in
production) the transaction is held for review rather than allowed through
unscreened.

Turning `FAIL_CLOSED` off makes a vendor outage a hole in the control, which is
precisely what examiners look for. It exists only so a market can be brought up
before its provider contract is signed.

---

## Tipping off

`BLOCK` and `REVIEW` return an identical response to the customer:

> This withdrawal is being reviewed by our compliance team.

This is not vagueness for its own sake. Disclosing which rule fired hands anyone
probing our thresholds a map of where they sit. More seriously, in all five
markets it is a **separate criminal offence** to tell the subject of a
suspicious activity report that they are being reported. A message
distinguishing "under review" from "declined" leaks exactly that.

Support staff get a `referenceId` (the case id) so they can correlate an enquiry
to a case without seeing why it was flagged.

---

## Jurisdictions

| Market | Regulator | Filing window | Structuring anchor |
| --- | --- | --- | --- |
| Nigeria | NFIU | 24 h | ≈ ₦5,000,000 (MLPPA 2022) |
| Kenya | FRC | 7 days | ≈ KES 1,000,000 (POCAMLA) |
| Ghana | FIC | 24 h | ≈ GHS 50,000 (AMLA 2020) |
| South Africa | FIC | 15 days | ≈ R49,999.99 (FICA) |
| Uganda | FIA | 48 h | ≈ UGX 20,000,000 (AMLA 2013) |

> ⚠️ **These are starting values, not legal advice.** They are drawn from the
> headline requirements of each market's AML statute, and both the windows and
> the thresholds move with statutory instruments and FX. Confirm every row with
> local counsel and the relevant FIU before go-live, and re-confirm on a
> schedule. The thresholds are stored in USD cents and must be re-derived when
> exchange rates move materially. See `JURISDICTIONS` in
> `lib/compliance/config.ts`.

The code says "SAR" because that is the term in the requirement. Every regulator
above calls the same artefact a Suspicious Transaction Report (STR).

### Markets without a local registration

Mobile money is available in five countries beyond the licensed five — TZ, CM,
CI, RW and ZM. A payment from one of them is screened in full: sanctions,
wallet risk and every velocity rule behave identically, because a designated
person is designated everywhere. What it cannot produce is a filing.
`draftSar()` refuses on these cases with `NO_FILING_ROUTE`, and the SQL `CHECK`
on `compliance_sars.jurisdiction` refuses the row independently, so an analyst
can only disposition them internally and escalate to the MLRO.

Their structuring anchor is `UNLICENSED_MARKET_POLICY` — the lowest of the five
licensed thresholds rather than an average, because under-detecting in a market
with no filing route is the worse error. See gap 10.

### Currency

Screening thresholds are USD cents throughout. `resolveMarket()` maps the
payment currency to the market whose policy applies, and `toUsdCents()`
converts the amount using the static table in `FX_USD_CENTS_PER_UNIT`. A
currency in neither table is refused (`UNSUPPORTED_MARKET`, HTTP 422) rather
than screened against a guessed market — see gap 8.

---

## Analyst workflow

The console lives at `/admin/compliance`.

1. **Queue** — open cases, newest first. Oldest-unworked is what breaches a
   filing deadline first, so that is the end analysts work from.
2. **Case file** — every signal with its evidence rendered verbatim: the
   observed values, the threshold breached, the matched alias. A determination
   an analyst cannot reconstruct is one they cannot defend.
3. **Decide** — clear, escalate, or confirm suspicious. **A rationale is
   mandatory**, enforced by the API schema rather than by convention. Alerts
   closed with no recorded reason are the single most common examination
   finding against a monitoring programme.
4. **File** — draft the SAR narrative while the evidence is still on screen.

The audit trail is append-only. Cases close; they do not disappear, and there is
no `deleteCase()` anywhere in the codebase. Records carry a five-year retention
obligation in all five markets.

Filing deadlines run from **when suspicion was formed** — the case's creation —
not from when an analyst opened the draft. Dating the clock from draft time
would let a backlog quietly extinguish every deadline.

---

## Setup

### Environment

```bash
# Required
COMPLIANCE_HASH_SALT=          # openssl rand -hex 32
COMPLIANCE_ADMIN_TOKENS=       # analystId:token,analystId:token

# Providers (default `local` — bundled fixture list, no vendor account)
COMPLIANCE_WALLET_PROVIDER=chainalysis     # chainalysis | elliptic | local
CHAINALYSIS_API_KEY=
COMPLIANCE_NAME_PROVIDER=complyadvantage   # complyadvantage | local
COMPLYADVANTAGE_API_KEY=
```

### Sanctions corpus

```bash
node scripts/refresh-sanctions-lists.mjs
```

Fetches the OFAC SDN and UN Consolidated lists and writes
`data/sanctions/snapshot.json`. The snapshot is **not** committed — it is large,
it changes several times a week, and a stale committed copy is worse than no
copy because it looks current.

Run it **on every deploy** and **daily thereafter**. Designations take effect on
publication, not on our next refresh.

With no snapshot loaded, screening runs against `DEV_FIXTURE_ENTITIES` —
synthetic entries invented so no real person is represented as sanctioned
anywhere in this repository. That state is reported as `CRITICAL` by the health
endpoint and bannered in the console, because it means there is effectively no
sanctions screening at all.

### Health

`GET /api/admin/compliance/health` reports whether the controls are *operating*,
not merely deployed. Every failure mode in this module is silent by nature —
screening against a stale or fixture list produces clean results indistinguishable
from genuinely clean ones. Alert on `status != "OK"`.

---

## Testing

```bash
npx jest lib/compliance
```

The matching tests are the ones that matter most. A screening control is only as
good as its matcher, and the "must not match" cases are as important as the
"must match" ones — a matcher that flags every shared surname trains analysts to
clear reflexively, which is worse than no matcher.

---

## Known gaps

Ordered by what blocks production first.

1. **No persistent database.** The stores are in-memory, shaped to mirror
   `003_create_compliance.sql`, matching the existing convention in
   `lib/orders/order-store.ts` and `lib/kyc/withdrawalLimitService.ts`. **Case
   files and SARs do not survive a restart**, which is incompatible with the
   five-year retention obligation. Wiring the migration up is the first
   production task.

2. **Admin authentication is a stopgap.** Shared-secret bearer tokens in an env
   var, held in `sessionStorage`. It gates the console and attributes decisions
   to a named human — the part the audit trail depends on — but before this
   handles real customer data it needs per-user accounts with individually
   revocable credentials, mandatory MFA, session expiry, and alerting on bulk
   case reads (which is how insider misuse presents). See
   `lib/compliance/admin-auth.ts`.

3. **Vendor API contracts are unverified.** The adapters follow each vendor's
   published contract at time of writing. Verify against current documentation
   and each sandbox before enabling. The Chainalysis adapter deliberately throws
   on an unrecognised risk verdict rather than defaulting to LOW, so a
   vendor-side rename fails loudly instead of becoming a silent bypass — keep
   that property in any adapter you add.

4. **Jurisdictional figures need legal sign-off.** Filing deadlines and
   reporting thresholds are configuration, not settled fact. See the warning
   above.

5. **No screening result caching.** ComplyAdvantage bills per search, and every
   transaction re-screens the same counterparty. The production shape is to
   screen a counterparty once, persist it, and re-screen on list update or after
   a staleness window. This is deliberately not hidden inside the HTTP client:
   caching a *screening decision* is a compliance policy choice, and burying it
   in transport is how teams end up unable to answer "when was this person last
   screened?".

6. **Audit trail is append-only by convention plus a length check.** The SQL
   trigger rejects an update that shortens `events`, which stops truncation and
   wholesale replacement but not a same-length edit of one entry. Genuine
   tamper-evidence needs per-entry hash chaining or a WAL-backed audit table.

7. **No periodic re-screening.** Customers are screened at transaction time
   only. New designations do not retroactively flag existing counterparties. A
   batch job re-screening active counterparties against each new snapshot is the
   standard control and is not implemented. `screenTransaction()` accepts
   `skipLedger` specifically so that job can re-screen without double-counting.

8. **FX rates are configuration, not a feed.** Thresholds are in USD cents;
   mobile-money and bill payments arrive in local currency, so
   `FX_USD_CENTS_PER_UNIT` converts them. It is a static table, deliberately —
   a rate API in the payment path turns every rate outage into a payments
   outage under `FAIL_CLOSED`, and a band that drifts with spot makes "was this
   transaction in the band?" unanswerable after the fact. The cost is drift.
   Review it on the same cycle as `reportingThresholdCents`, and re-derive both
   together: revising rates without revising thresholds silently retunes every
   rule.

9. **Anonymous payers are identified by instrument.** Bill and mobile-money
   payers without a connected wallet are keyed to a salted hash of their phone
   number or email (`lib/compliance/identity.ts`). One person with two handsets
   is two accounts to the velocity rules; a shared handset is one account for
   two people. Both resolve once the payer connects a wallet, which is why the
   wallet key is preferred whenever the client sends one. Proper identity
   resolution — linking instruments to a customer record — is the real fix and
   is not implemented.

10. **Markets without a local registration are screened but not filable.**
    Mobile money reaches TZ, CM, CI, RW and ZM, where Aframp holds no AML
    registration. Those transactions are screened in full under
    `UNLICENSED_MARKET_POLICY`, and `draftSar()` refuses on the resulting cases
    because there is no FIU to receive a filing. An analyst can disposition
    them internally and nothing more. This is a stopgap that keeps the payment
    path from moving money unscreened — it is not a substitute for either
    registering in those markets or withdrawing from them, and that decision
    should not sit with engineering.
