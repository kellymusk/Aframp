-- Migration: 002_create_orders
-- Purpose:   Server-side persistence for in-progress onramp and offramp orders.
--
-- Before this table existed, order state lived only in the browser's
-- localStorage.  Clearing site data, switching devices, or using a private
-- window lost the order entirely — the user had no way back to an in-flight
-- payment.  The client now writes every order here on creation and reads it
-- back on page load, using localStorage purely as an optimistic cache.
--
-- Query patterns served by this table (see lib/orders/order-store.ts):
--
--   -- Resume a specific order (ownership-scoped so an order id alone is not
--   -- enough to read someone else's order):
--   SELECT * FROM orders WHERE id = $1 AND wallet_address = $2;
--
--   -- List a wallet's recent orders, newest first:
--   SELECT * FROM orders
--   WHERE  wallet_address = $1
--     AND  ($2::TEXT IS NULL OR kind = $2)
--   ORDER  BY created_at DESC
--   LIMIT  $3;
--
-- The composite index below keeps the list query a range scan rather than a
-- full table scan as the table grows.

-- -------------------------------------------------------------------------
-- Table
-- -------------------------------------------------------------------------
-- `payload` holds the full client order object verbatim (OnrampOrder /
-- OfframpOrder).  Storing it as JSONB rather than exploding it into columns
-- keeps the two order shapes — which differ, and still change often — in one
-- table without a migration per field.  `status` is denormalised out of the
-- payload because it is the only field queried on its own.
CREATE TABLE IF NOT EXISTS orders (
  id             TEXT        PRIMARY KEY,
  wallet_address TEXT        NOT NULL,
  kind           TEXT        NOT NULL CHECK (kind IN ('onramp', 'offramp')),
  status         TEXT        NOT NULL,
  payload        JSONB       NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- Index — composite on (wallet_address, created_at DESC)
-- -------------------------------------------------------------------------
-- Covers both the ownership-scoped single-order read and the newest-first
-- listing.  `kind` is included so filtering by ramp direction does not need a
-- heap visit.
CREATE INDEX IF NOT EXISTS idx_orders_wallet_created
  ON orders (wallet_address, created_at DESC)
  INCLUDE (kind, status);

-- -------------------------------------------------------------------------
-- Trigger: keep updated_at current
-- -------------------------------------------------------------------------
-- set_updated_at() is created by 001_index_withdrawals_created_at.sql.
-- CREATE OR REPLACE here so this migration can also run standalone.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
