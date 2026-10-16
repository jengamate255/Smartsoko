-- ============================================================================
-- Merchant OS follow-ups found by auditing the LIVE database
-- (see merchant-dashboard-bug-report.md §9, §15.5 and the recommendations).
--
-- Safe to re-run: every statement is idempotent, and the one constraint is
-- added NOT VALID so an unforeseen legacy value cannot fail the migration.
--
-- Apply with:  supabase db push        (or psql -f <this file>)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. The merchant audit table.
--
-- server/src/services/audit.js writes to `merchant_audit_logs`, and that table
-- already exists in the deployed database with exactly matching columns. It is
-- NOT created by 20260825120000_merchant_os_tables.sql: that migration declares
-- `CREATE TABLE IF NOT EXISTS audit_logs (...)` with the merchant shape, but
-- `audit_logs` already existed as the *platform* audit log (user_id,
-- entity_type, old_values, new_values, ip_address, created_at — see
-- config.sql), so the statement silently no-opped.
--
-- Created here defensively so a fresh environment gets the table the code
-- actually uses. Do not "fix" audit.js to write to audit_logs: the shapes
-- differ and that write would be rejected.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS merchant_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id TEXT,
  actor_email TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  merchant_id UUID,
  before JSONB,
  after JSONB,
  ip TEXT,
  user_agent TEXT,
  ts TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_merchant_audit_ts ON merchant_audit_logs(merchant_id, ts DESC);
ALTER TABLE merchant_audit_logs ENABLE ROW LEVEL SECURITY;
-- The API reaches this table with a service_role key (lib/server-db.js), which
-- bypasses RLS, so no permissive policy is needed. Verified: the server's
-- SUPABASE_SERVICE_KEY carries role=service_role.

-- ────────────────────────────────────────────────────────────────────────────
-- 2. products.min_stock / products.cost.
--
-- POST/PUT /api/merchant/products accept and validate both, but the columns do
-- not exist, so lib/server-db.js drops the writes (TABLE_FIELD_MAP sets them to
-- null). The API now returns the persisted row instead of echoing the patch, so
-- the merchant sees the truth — but low-stock thresholds still fall back to 5
-- and /inventory's `value`/inventoryValue is 0 for every SKU.
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost NUMERIC(12, 2);

COMMENT ON COLUMN products.min_stock IS 'Low-stock threshold per product; falls back to the merchant default (5) when null';
COMMENT ON COLUMN products.cost IS 'Unit cost snapshot used for inventory value and gross profit';

-- Records the ones lib/server-db.js currently drops. Both are declared null in
-- TABLE_FIELD_MAP; once these columns exist, remove those two overrides so the
-- adapter stops discarding the writes.
--   products: { minStock: null, cost: null }   <-- delete these two lines

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Order status vocabulary.
--
-- The live orders table contained case variants and legacy aliases alongside
-- canonical values: COMPLETED, REFUNDED, confirmed, topup_completed. The API now
-- folds case and canonicalizes on write, but existing rows stay dirty, so
-- normalize them and then constrain the column.
-- ────────────────────────────────────────────────────────────────────────────
UPDATE orders SET status = 'pending' WHERE status IS NULL OR btrim(status) = '';
UPDATE orders SET status = lower(btrim(status)) WHERE status <> lower(btrim(status));

-- Legacy aliases (mirrors STATUS_ALIASES in server/src/services/order-state-machine.js).
UPDATE orders SET status = 'accepted'           WHERE status = 'confirmed';
UPDATE orders SET status = 'in_transit'         WHERE status = 'dispatched';
UPDATE orders SET status = 'ready_for_delivery' WHERE status = 'ready';
UPDATE orders SET status = 'picked_up'          WHERE status = 'pickedup';
UPDATE orders SET status = 'completed'          WHERE status = 'topup_completed';

-- NOT VALID: enforced for every new insert/update, but existing rows are not
-- re-checked, so this cannot fail on a value we did not anticipate. Once
--   SELECT status, count(*) FROM orders GROUP BY 1 ORDER BY 2 DESC;
-- shows only canonical values, run:
--   ALTER TABLE orders VALIDATE CONSTRAINT orders_status_canonical;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_canonical;
ALTER TABLE orders ADD CONSTRAINT orders_status_canonical
  CHECK (status IN (
    'pending', 'accepted', 'preparing', 'ready_for_delivery',
    'assigned', 'picked_up', 'in_transit', 'delivered', 'completed',
    'cancelled', 'refunded'
  )) NOT VALID;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Report-only: orders whose restaurant_id is not a sellers.id.
--
-- Of 81 live orders, 46 had no merchant attribution and only 15 pointed at a
-- real seller. This is deliberately NOT fixed here — deciding which merchant an
-- orphaned order belongs to is a business decision, not a migration.
-- ────────────────────────────────────────────────────────────────────────────
-- SELECT o.restaurant_id, count(*)
--   FROM orders o
--   LEFT JOIN sellers s ON s.id = o.restaurant_id
--  WHERE o.restaurant_id IS NULL OR s.id IS NULL
--  GROUP BY 1 ORDER BY 2 DESC;
