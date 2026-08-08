-- Migration: 001_index_withdrawals_created_at
-- Purpose:   Create the withdrawals table and add a covering index on
--            (user_id, created_at) so the rolling 24-hour window query
--            never performs a full table scan.
--
-- The rolling window query pattern used by withdrawalLimitService.ts is:
--
--   SELECT COALESCE(SUM(amount_cents), 0)
--   FROM   withdrawals
--   WHERE  user_id    = $1
--     AND  status     IN ('pending', 'completed')
--     AND  created_at >= NOW() - INTERVAL '24 hours';
--
-- Without the index below, this query degrades to O(n) as the table grows.
-- With the composite index the planner can seek directly to the user's rows
-- and then range-scan only the last 24 hours — O(log n + k).

-- -------------------------------------------------------------------------
-- Table
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS withdrawals (
  id           TEXT        PRIMARY KEY,
  user_id      TEXT        NOT NULL,
  amount_cents INTEGER     NOT NULL CHECK (amount_cents > 0),
  status       TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  asset        TEXT        NOT NULL,
  chain        TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- Index — composite on (user_id, created_at) covering status and amount_cents
-- -------------------------------------------------------------------------
-- The INCLUDE columns allow index-only scans for the rolling window query:
-- the planner never needs to visit the heap for status or amount_cents.
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_created
  ON withdrawals (user_id, created_at DESC)
  INCLUDE (status, amount_cents);

-- -------------------------------------------------------------------------
-- Trigger: keep updated_at current
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_withdrawals_updated_at ON withdrawals;
CREATE TRIGGER trg_withdrawals_updated_at
  BEFORE UPDATE ON withdrawals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
