-- Migration: 002_referral_analytics
-- Purpose:   Create the referral analytics tables for tracking
--            click events, conversion events, and aggregating
--            stats that power the /referral page and API.
--
-- The referral program generates codes and applies discounts, but
-- there was no way to measure:
--   • How many times a referral link was clicked
--   • How many referred users completed onboarding
--   • Total discount earned by the referrer
--
-- These tables fill that gap.

-- -------------------------------------------------------------------------
-- Table: referral_analytics
-- One row per referral code; aggregates counts and totals.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS referral_analytics (
  id                TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  referral_code     TEXT        NOT NULL,
  owner_address     TEXT        NOT NULL,
  click_count       INTEGER     NOT NULL DEFAULT 0,
  conversion_count  INTEGER     NOT NULL DEFAULT 0,
  total_rebates_earned NUMERIC  NOT NULL DEFAULT 0,
  last_clicked_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_analytics_code
  ON referral_analytics (referral_code);

CREATE INDEX IF NOT EXISTS idx_referral_analytics_owner
  ON referral_analytics (owner_address);

-- -------------------------------------------------------------------------
-- Table: referral_conversions
-- One row per successful conversion (referee completed first onramp).
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS referral_conversions (
  id                TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  referral_code     TEXT        NOT NULL,
  referrer_address  TEXT        NOT NULL,
  referee_address   TEXT        NOT NULL,
  discount_amount   NUMERIC     NOT NULL DEFAULT 0,
  rebate_amount     NUMERIC     NOT NULL DEFAULT 0,
  order_id          TEXT,
  converted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_conversions_code
  ON referral_conversions (referral_code);

CREATE INDEX IF NOT EXISTS idx_referral_conversions_referee
  ON referral_conversions (referee_address);

-- -------------------------------------------------------------------------
-- Trigger: keep referral_analytics.updated_at current
-- -------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_referral_analytics_updated_at ON referral_analytics;
CREATE TRIGGER trg_referral_analytics_updated_at
  BEFORE UPDATE ON referral_analytics
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
