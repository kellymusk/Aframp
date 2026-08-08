-- Migration: 003_app_state_tables
-- Purpose:   Persistent backing store for state that previously lived only
--            in module-level in-memory Maps/arrays (lost on every
--            serverless cold start or redeploy):
--              lib/kyc/store.ts            -> kyc_submissions
--              lib/referral/index.ts       -> referral_codes
--              lib/business/api-keys.ts    -> api_keys
--              lib/business/team-invites.ts-> team_invites
--              lib/price-alerts.ts         -> price_alert_rules / price_alert_events

-- -------------------------------------------------------------------------
-- Table: kyc_submissions
-- Submission payload is stored as JSONB since the KYC schema evolves
-- independently of this migration; callers validate shape in app code.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kyc_submissions (
  id          TEXT        PRIMARY KEY,
  data        JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_kyc_submissions_updated_at ON kyc_submissions;
CREATE TRIGGER trg_kyc_submissions_updated_at
  BEFORE UPDATE ON kyc_submissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -------------------------------------------------------------------------
-- Table: referral_codes
-- One row per generated referral code (distinct from referral_analytics,
-- which aggregates click/conversion counters for the /referral page).
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS referral_codes (
  code                  TEXT        PRIMARY KEY,
  owner_address         TEXT        NOT NULL,
  referees              JSONB       NOT NULL DEFAULT '[]',
  total_rebates_earned  NUMERIC     NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_owner
  ON referral_codes (owner_address);

-- -------------------------------------------------------------------------
-- Table: api_keys
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_keys (
  id            TEXT        PRIMARY KEY,
  name          TEXT        NOT NULL,
  key_prefix    TEXT        NOT NULL,
  masked_key    TEXT        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at  TIMESTAMPTZ
);

-- -------------------------------------------------------------------------
-- Table: team_invites
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_invites (
  id           TEXT        PRIMARY KEY,
  email        TEXT        NOT NULL,
  name         TEXT        NOT NULL,
  role         TEXT        NOT NULL CHECK (role IN ('admin', 'member')),
  status       TEXT        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  invited_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at  TIMESTAMPTZ
);

-- -------------------------------------------------------------------------
-- Table: price_alert_rules / price_alert_events
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS price_alert_rules (
  id                TEXT        PRIMARY KEY,
  asset             TEXT        NOT NULL DEFAULT 'cNGN',
  direction         TEXT        NOT NULL CHECK (direction IN ('below', 'above')),
  threshold         NUMERIC     NOT NULL,
  email             TEXT        NOT NULL,
  notify_email      BOOLEAN     NOT NULL DEFAULT true,
  notify_push       BOOLEAN     NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_triggered_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS price_alert_events (
  id           TEXT        PRIMARY KEY,
  rule_id      TEXT        NOT NULL REFERENCES price_alert_rules (id) ON DELETE CASCADE,
  asset        TEXT        NOT NULL DEFAULT 'cNGN',
  direction    TEXT        NOT NULL CHECK (direction IN ('below', 'above')),
  threshold    NUMERIC     NOT NULL,
  actual_value NUMERIC     NOT NULL,
  channel      TEXT        NOT NULL CHECK (channel IN ('email', 'push')),
  message      TEXT        NOT NULL,
  notified_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_alert_events_rule
  ON price_alert_events (rule_id, notified_at DESC);
