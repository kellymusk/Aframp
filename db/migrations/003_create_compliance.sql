-- Migration: 003_create_compliance
-- Purpose:   Persistence for AML transaction monitoring, case management and
--            SAR/STR filings.
--
-- Regulatory context:
--   Operating a crypto on/off ramp in Nigeria, Kenya, Ghana, South Africa and
--   Uganda requires transaction monitoring, sanctions screening and suspicious
--   activity reporting.  The tables below are the record of those controls
--   operating.  Two properties follow from that and constrain the schema:
--
--     1. **Records are retained for five years** after the relationship or
--        transaction ends, in every one of the five markets.  Nothing here is
--        deleted by the application; a retention job purges past the window.
--     2. **The audit trail is append-only.**  Case decisions are evidence.  A
--        case whose history can be rewritten proves nothing, so `events` is
--        appended to and a trigger below refuses shrinking updates.
--
--   See lib/compliance/config.ts for the thresholds these tables are queried
--   against, and docs/AML_COMPLIANCE.md for the operating procedure.
--
-- Money:
--   All amounts are integer USD cents, matching lib/kyc/withdrawalLimitService.ts
--   and lib/compliance/*.  Never store money as FLOAT.

-- ===========================================================================
-- compliance_transactions — the monitoring ledger
-- ===========================================================================
-- Every screened transaction, in every direction, INCLUDING ones that were
-- blocked.  A blocked attempt is evidence of behaviour: dropping it would make
-- an account probing our limits look quieter than a legitimate one.
--
-- This is distinct from the `withdrawals` records used for KYC limits, which
-- exist to enforce a cap and only cover offramps.  This table exists to
-- establish a behavioural baseline.
--
-- No PII.  Counterparties are stored as `counterparty_key`, a salted SHA-256
-- of the account number or address (see hashCounterparty() in
-- lib/compliance/ledger.ts).  Names and account numbers live only on cases,
-- where access is gated and audited.  An unsalted hash of a 10-digit NUBAN is
-- reversible by brute force in seconds and would not qualify as
-- pseudonymisation under NDPA 2023 (NG) or POPIA (ZA).
CREATE TABLE IF NOT EXISTS compliance_transactions (
  transaction_id   TEXT        PRIMARY KEY,
  user_id          TEXT        NOT NULL,
  kind             TEXT        NOT NULL CHECK (kind IN ('onramp', 'offramp', 'billpay')),
  amount_cents     BIGINT      NOT NULL CHECK (amount_cents > 0),
  asset            TEXT        NOT NULL,
  chain            TEXT        NOT NULL,
  counterparty_key TEXT,
  decision         TEXT        NOT NULL CHECK (decision IN ('ALLOW', 'REVIEW', 'BLOCK')),
  risk_score       SMALLINT    NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  occurred_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Every velocity rule is "this user, this rolling window", so the composite
-- index is (user_id, occurred_at DESC).  Without it, each screening call table
-- scans — and screening sits in the payment path.
--
-- amount_cents and kind are INCLUDEd because the count/sum/reversal rules read
-- only those two columns, making the common queries index-only.
CREATE INDEX IF NOT EXISTS idx_compliance_tx_user_time
  ON compliance_transactions (user_id, occurred_at DESC)
  INCLUDE (amount_cents, kind);

-- Fan-out detection counts DISTINCT counterparty_key per user per window.
-- Partial, because rows without a counterparty are irrelevant to it and are a
-- large share of the table.
CREATE INDEX IF NOT EXISTS idx_compliance_tx_counterparty
  ON compliance_transactions (user_id, counterparty_key, occurred_at DESC)
  WHERE counterparty_key IS NOT NULL;

-- ===========================================================================
-- compliance_cases — flagged transactions under human review
-- ===========================================================================
-- One case per flagged transaction.  `transaction_id` is UNIQUE rather than a
-- plain column: the screening endpoint is retried by clients on flaky
-- networks, and duplicate cases for one transaction get worked and closed
-- inconsistently by different analysts.
--
-- `signals` and `events` are JSONB rather than child tables.  Signals are
-- written once and read whole; the signal shape changes as rules are added,
-- and a migration per rule would slow the thing that most needs to move fast
-- when a new typology appears.
CREATE TABLE IF NOT EXISTS compliance_cases (
  id             TEXT        PRIMARY KEY,
  transaction_id TEXT        NOT NULL UNIQUE,
  user_id        TEXT        NOT NULL,
  kind           TEXT        NOT NULL CHECK (kind IN ('onramp', 'offramp', 'billpay')),
  -- Wider than compliance_sars.jurisdiction below, and deliberately so: the
  -- mobile-money footprint reaches markets with no local AML registration.
  -- Those transactions are still screened and still open cases; what they
  -- cannot do is produce a filing.  See UNLICENSED_MARKET_POLICY in
  -- lib/compliance/config.ts.
  jurisdiction   TEXT        NOT NULL
                   CHECK (jurisdiction IN ('NG', 'KE', 'GH', 'ZA', 'UG',
                                           'TZ', 'CM', 'CI', 'RW', 'ZM')),
  amount_cents   BIGINT      NOT NULL,
  asset          TEXT        NOT NULL,
  status         TEXT        NOT NULL
                   CHECK (status IN ('OPEN', 'IN_REVIEW', 'ESCALATED', 'CLEARED', 'CONFIRMED_SUSPICIOUS')),
  risk_score     SMALLINT    NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  risk_level     TEXT        NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'SEVERE')),
  decision       TEXT        NOT NULL CHECK (decision IN ('ALLOW', 'REVIEW', 'BLOCK')),
  signals        JSONB       NOT NULL DEFAULT '[]'::JSONB,
  assigned_to    TEXT,
  disposition    TEXT        CHECK (disposition IN ('FALSE_POSITIVE', 'TRUE_POSITIVE', 'INCONCLUSIVE')),
  sar_id         TEXT,
  events         JSONB       NOT NULL DEFAULT '[]'::JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The analyst queue: open cases, newest first.  Partial index because closed
-- cases are the overwhelming majority once the system has been running and are
-- never in the working queue.
CREATE INDEX IF NOT EXISTS idx_compliance_cases_queue
  ON compliance_cases (created_at DESC)
  WHERE status IN ('OPEN', 'IN_REVIEW', 'ESCALATED');

-- "Show me everything for this account" — the first thing an analyst does
-- after opening a case, and the basis of any account-level review.
CREATE INDEX IF NOT EXISTS idx_compliance_cases_user
  ON compliance_cases (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_compliance_cases_jurisdiction
  ON compliance_cases (jurisdiction, status, created_at DESC);

-- ===========================================================================
-- compliance_sars — suspicious activity / transaction reports
-- ===========================================================================
-- `suspicion_formed_at` is the case's creation time, NOT the draft time, and
-- `due_at` is derived from it.  Dating the clock from when an analyst got round
-- to drafting would let a backlog quietly extinguish every filing deadline —
-- which is the precise failure the deadline exists to prevent.
--
-- Deadlines per market are in JURISDICTIONS (lib/compliance/config.ts) and must
-- be confirmed with local counsel; they are configuration, not settled fact.
CREATE TABLE IF NOT EXISTS compliance_sars (
  id                    TEXT        PRIMARY KEY,
  case_id               TEXT        NOT NULL REFERENCES compliance_cases (id),
  user_id               TEXT        NOT NULL,
  -- Licensed markets only.  This is the database-level counterpart of the
  -- NO_FILING_ROUTE check in draftSar(): a SAR addressed to no regulator would
  -- set compliance_cases.sar_id and make a live review obligation read as
  -- discharged in every queue and count.
  jurisdiction          TEXT        NOT NULL CHECK (jurisdiction IN ('NG', 'KE', 'GH', 'ZA', 'UG')),
  regulator             TEXT        NOT NULL,
  status                TEXT        NOT NULL
                          CHECK (status IN ('DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'REJECTED')),
  narrative             TEXT        NOT NULL,
  grounds_for_suspicion JSONB       NOT NULL DEFAULT '[]'::JSONB,
  amount_cents          BIGINT      NOT NULL,
  filed_by              TEXT        NOT NULL,
  suspicion_formed_at   TIMESTAMPTZ NOT NULL,
  due_at                TIMESTAMPTZ NOT NULL,
  submitted_at          TIMESTAMPTZ,
  regulator_reference   TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One filing per case.  A second SAR for the same case is a data error, and
  -- duplicate filings against one FIU reference are their own problem.
  CONSTRAINT uq_compliance_sars_case UNIQUE (case_id)
);

-- Drives the overdue-filings alert, which is the single most time-critical
-- query in the system: an unfiled SAR past its deadline is a live breach.
CREATE INDEX IF NOT EXISTS idx_compliance_sars_due
  ON compliance_sars (due_at)
  WHERE status = 'DRAFT';

CREATE INDEX IF NOT EXISTS idx_compliance_sars_status
  ON compliance_sars (jurisdiction, status, due_at);

-- ===========================================================================
-- Triggers
-- ===========================================================================
-- set_updated_at() is created by 001_index_withdrawals_created_at.sql.
-- CREATE OR REPLACE so this migration can also run standalone.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compliance_cases_updated_at ON compliance_cases;
CREATE TRIGGER trg_compliance_cases_updated_at
  BEFORE UPDATE ON compliance_cases
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_compliance_sars_updated_at ON compliance_sars;
CREATE TRIGGER trg_compliance_sars_updated_at
  BEFORE UPDATE ON compliance_sars
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Append-only enforcement on the case audit trail
-- ---------------------------------------------------------------------------
-- The application always appends to `events`, but the application is not the
-- only thing that can reach this table.  This makes the guarantee structural:
-- an update that shortens the trail is rejected at the database.
--
-- It checks length, not content, which is a deliberate limit — it stops
-- truncation and wholesale replacement, not a same-length edit of one entry.
-- Genuine tamper-evidence needs either an append-only WAL-backed audit table or
-- per-entry hash chaining; both are the right next step and neither belongs in
-- the first migration.  Documented as a known gap in docs/AML_COMPLIANCE.md.
CREATE OR REPLACE FUNCTION compliance_events_append_only()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF JSONB_ARRAY_LENGTH(NEW.events) < JSONB_ARRAY_LENGTH(OLD.events) THEN
    RAISE EXCEPTION
      'compliance_cases.events is append-only (attempted to shrink from % to % entries on case %)',
      JSONB_ARRAY_LENGTH(OLD.events), JSONB_ARRAY_LENGTH(NEW.events), OLD.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compliance_cases_append_only ON compliance_cases;
CREATE TRIGGER trg_compliance_cases_append_only
  BEFORE UPDATE ON compliance_cases
  FOR EACH ROW EXECUTE FUNCTION compliance_events_append_only();

-- ===========================================================================
-- Retention
-- ===========================================================================
-- Five years, per RECORD_RETENTION_YEARS in lib/compliance/config.ts.  Run from
-- a scheduled job, not from the application.
--
-- Ordering matters: SARs reference cases, and monitoring rows are only purged
-- once no case still points at the transaction — an account under
-- investigation must keep its full history even where individual rows have
-- aged out.
--
--   DELETE FROM compliance_sars
--   WHERE  created_at < NOW() - INTERVAL '5 years';
--
--   DELETE FROM compliance_cases
--   WHERE  created_at < NOW() - INTERVAL '5 years'
--     AND  id NOT IN (SELECT case_id FROM compliance_sars);
--
--   DELETE FROM compliance_transactions
--   WHERE  occurred_at < NOW() - INTERVAL '5 years'
--     AND  transaction_id NOT IN (SELECT transaction_id FROM compliance_cases);
