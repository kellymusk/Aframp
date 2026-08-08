-- Migration: 002_notifications
-- Purpose: Persistent notifications table for wallet events
--          (payments, onramp/offramp status, price alerts, KYC updates).
--
-- The primary query pattern is:
--
--   SELECT * FROM notifications
--   WHERE  user_id = $1
--   ORDER  BY created_at DESC
--   LIMIT  50;
--
-- The secondary query is the unread count badge:
--
--   SELECT COUNT(*) FROM notifications
--   WHERE  user_id = $1 AND is_read = false;
--
-- Both are covered by the composite index below.

-- -------------------------------------------------------------------------
-- Table
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT        PRIMARY KEY,
  user_id     TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  category    TEXT        NOT NULL
              CHECK (category IN (
                'payment', 'onramp', 'offramp', 'price_alert', 'kyc', 'system'
              )),
  priority    TEXT        NOT NULL DEFAULT 'normal'
              CHECK (priority IN ('low', 'normal', 'high')),
  is_read     BOOLEAN     NOT NULL DEFAULT false,
  metadata    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- Index — composite on (user_id, created_at) for the feed query.
-- INCLUDE columns allow index-only scans for badge count (is_read).
-- -------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications (user_id, created_at DESC)
  INCLUDE (is_read, priority, category);

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

DROP TRIGGER IF EXISTS trg_notifications_updated_at ON notifications;
CREATE TRIGGER trg_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
