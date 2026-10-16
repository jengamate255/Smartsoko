-- ============================================================
-- Merchant OS tables (Supabase fallback parity)
-- The createDualDb adapter falls back from Firestore to Supabase on quota
-- errors. These tables mirror the collections written by /api/merchant/*.
-- Idempotent — safe to re-run. RLS: service-role only (dashboard access is
-- mediated exclusively by the Express API; no direct client table access).
-- 2026-08-25 Graph Engineering build.
-- ============================================================

-- Auditable stock movements (§6 inventory ledger)
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  product_id TEXT NOT NULL,
  delta NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase_receive','sale','return','damage','adjustment','audit')),
  reason TEXT,
  ref_id TEXT,
  balance_after NUMERIC,
  actor_id TEXT,
  ts TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inv_mov_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_mov_merchant ON inventory_movements(merchant_id);

-- Suppliers (§11)
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  contact_person TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  outstanding_balance NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Purchase orders (§12): draft→submitted→approved→partially_received/received→closed
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  supplier_name TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','approved','partially_received','received','closed')),
  total_cost NUMERIC DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Expenses (§13)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('rent','electricity','internet','transport','salaries','marketing','packaging','supplies','other')),
  description TEXT DEFAULT '',
  date TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_expenses_merchant ON expenses(merchant_id);

-- CRM notes (§7)
CREATE TABLE IF NOT EXISTS customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  customer_id TEXT NOT NULL,
  note TEXT NOT NULL,
  author_id TEXT,
  ts TIMESTAMPTZ DEFAULT now()
);

-- Audit log (§28)
CREATE TABLE IF NOT EXISTS audit_logs (
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
CREATE INDEX IF NOT EXISTS idx_audit_merchant ON audit_logs(merchant_id, ts DESC);

-- Notification center (§16)
CREATE TABLE IF NOT EXISTS merchant_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  ts TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_notif_merchant ON merchant_notifications(merchant_id, ts DESC);

-- ─── RLS: lock down to service role (API-mediated access only) ───
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_notifications ENABLE ROW LEVEL SECURITY;

-- No policies are created ⇒ only the service role (used by the server) can
-- read/write. This is intentional: merchants go through /api/merchant/*.