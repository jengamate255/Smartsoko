-- ============================================
-- MIGRATION: Escrow, Wallets & Payment Splits
-- ============================================

-- 1. Add escrow/ split columns to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_price INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_fee INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_paid INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS escrow_status TEXT DEFAULT 'pending'
  CHECK (escrow_status IN ('pending', 'held', 'released', 'refunded', 'disputed'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS escrow_released_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS non_refundable_fee INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dispute_id UUID;

-- 2. Wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id),
  role TEXT NOT NULL CHECK (role IN ('seller', 'driver')),
  balance INTEGER NOT NULL DEFAULT 0,
  pending_balance INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_withdrawn INTEGER NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'TZS',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),
  order_id UUID REFERENCES orders(id),
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit', 'hold', 'release', 'refund')),
  amount INTEGER NOT NULL,
  balance_before INTEGER NOT NULL DEFAULT 0,
  balance_after INTEGER NOT NULL DEFAULT 0,
  reference TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Escrow holds (for disputes)
CREATE TABLE IF NOT EXISTS escrow_holds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id),
  total_amount INTEGER NOT NULL,
  seller_amount INTEGER NOT NULL,
  driver_amount INTEGER NOT NULL,
  platform_amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'held'
    CHECK (status IN ('held', 'released', 'partially_released', 'refunded')),
  disputed_by UUID REFERENCES profiles(id),
  dispute_reason TEXT,
  resolution TEXT,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Refunds table (enhanced)
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS escrow_release_id UUID REFERENCES escrow_holds(id);
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS non_refundable_fee INTEGER DEFAULT 0;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS refund_breakdown JSONB;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_role ON wallets(role);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_escrow_holds_order_id ON escrow_holds(order_id);
CREATE INDEX IF NOT EXISTS idx_escrow_holds_status ON escrow_holds(status);
CREATE INDEX IF NOT EXISTS idx_orders_escrow_status ON orders(escrow_status);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_holds ENABLE ROW LEVEL SECURITY;

-- Wallets: users see their own
CREATE POLICY "Users view own wallet" ON wallets FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Service role manages wallets" ON wallets FOR ALL
  USING (auth.role() = 'service_role');

-- Transactions: users see their own
CREATE POLICY "Users view own transactions" ON transactions FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Service role manages transactions" ON transactions FOR ALL
  USING (auth.role() = 'service_role');

-- Escrow holds: order participants + service_role
CREATE POLICY "View escrow holds" ON escrow_holds FOR SELECT
  USING (
    auth.role() = 'service_role' OR
    order_id IN (SELECT id FROM orders WHERE customer_id = auth.uid())
  );
CREATE POLICY "Manage escrow holds" ON escrow_holds FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- FUNCTIONS
-- ============================================

-- Credit a wallet and record transaction
CREATE OR REPLACE FUNCTION credit_wallet(
  p_user_id UUID,
  p_amount INTEGER,
  p_order_id UUID DEFAULT NULL,
  p_type TEXT DEFAULT 'credit',
  p_description TEXT DEFAULT '',
  p_metadata JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet wallets%ROWTYPE;
  v_balance_before INTEGER;
  v_balance_after INTEGER;
BEGIN
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
  END IF;

  v_balance_before := v_wallet.balance;
  v_balance_after := v_wallet.balance + p_amount;

  UPDATE wallets
  SET balance = v_balance_after,
      total_earned = total_earned + p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  INSERT INTO transactions (user_id, order_id, type, amount, balance_before, balance_after, description, metadata)
  VALUES (p_user_id, p_order_id, p_type, p_amount, v_balance_before, v_balance_after, p_description, p_metadata);

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'amount', p_amount,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after
  );
END;
$$;

-- Debit a wallet and record transaction
CREATE OR REPLACE FUNCTION debit_wallet(
  p_user_id UUID,
  p_amount INTEGER,
  p_order_id UUID DEFAULT NULL,
  p_type TEXT DEFAULT 'debit',
  p_description TEXT DEFAULT '',
  p_metadata JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet wallets%ROWTYPE;
  v_balance_before INTEGER;
  v_balance_after INTEGER;
BEGIN
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
  END IF;
  IF v_wallet.balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance: have %, need %', v_wallet.balance, p_amount;
  END IF;

  v_balance_before := v_wallet.balance;
  v_balance_after := v_wallet.balance - p_amount;

  UPDATE wallets
  SET balance = v_balance_after,
      total_withdrawn = total_withdrawn + p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  INSERT INTO transactions (user_id, order_id, type, amount, balance_before, balance_after, description, metadata)
  VALUES (p_user_id, p_order_id, p_type, p_amount, v_balance_before, v_balance_after, p_description, p_metadata);

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'amount', p_amount,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after
  );
END;
$$;

-- Create wallet for new seller/driver
CREATE OR REPLACE FUNCTION create_wallet(
  p_user_id UUID,
  p_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet wallets%ROWTYPE;
BEGIN
  INSERT INTO wallets (user_id, role)
  VALUES (p_user_id, p_role)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING * INTO v_wallet;

  IF v_wallet.id IS NULL THEN
    SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id;
    RETURN jsonb_build_object('success', true, 'wallet', row_to_jsonb(v_wallet), 'existing', true);
  END IF;

  RETURN jsonb_build_object('success', true, 'wallet', row_to_jsonb(v_wallet), 'existing', false);
END;
$$;

-- Confirm payment: move funds to escrow
CREATE OR REPLACE FUNCTION confirm_payment_escrow(
  p_order_id UUID,
  p_product_price INTEGER,
  p_delivery_fee INTEGER,
  p_service_fee INTEGER,
  p_total_paid INTEGER,
  p_non_refundable_fee INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order orders%ROWTYPE;
  p_pesapal_fee INTEGER;
  p_platform_fee INTEGER;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  UPDATE orders SET
    product_price = p_product_price,
    delivery_fee = p_delivery_fee,
    service_fee = p_service_fee,
    total_paid = p_total_paid,
    non_refundable_fee = p_non_refundable_fee,
    escrow_status = 'held',
    payment_status = 'paid',
    status = 'PAID',
    updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'escrow_status', 'held',
    'total_paid', p_total_paid
  );
END;
$$;

-- Confirm delivery: release funds to seller and driver
CREATE OR REPLACE FUNCTION confirm_delivery_release(
  p_order_id UUID,
  p_seller_id UUID,
  p_driver_id UUID,
  p_seller_amount INTEGER,
  p_driver_amount INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_seller_result JSONB;
  v_driver_result JSONB;
  v_hold_id UUID;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.escrow_status != 'held' THEN
    RAISE EXCEPTION 'Order escrow is not in held state (current: %)', v_order.escrow_status;
  END IF;

  -- Create escrow hold record
  INSERT INTO escrow_holds (order_id, total_amount, seller_amount, driver_amount, platform_amount, status)
  VALUES (p_order_id, v_order.total_paid, p_seller_amount, p_driver_amount,
          v_order.total_paid - p_seller_amount - p_driver_amount, 'released')
  RETURNING id INTO v_hold_id;

  -- Credit seller
  v_seller_result := credit_wallet(p_seller_id, p_seller_amount, p_order_id, 'credit',
    CONCAT('Payment for order ', substring(p_order_id::text, 1, 8)),
    jsonb_build_object('order_id', p_order_id, 'hold_id', v_hold_id, 'role', 'seller'));

  -- Credit driver
  IF p_driver_id IS NOT NULL AND p_driver_amount > 0 THEN
    v_driver_result := credit_wallet(p_driver_id, p_driver_amount, p_order_id, 'credit',
      CONCAT('Delivery fee for order ', substring(p_order_id::text, 1, 8)),
      jsonb_build_object('order_id', p_order_id, 'hold_id', v_hold_id, 'role', 'driver'));
  END IF;

  -- Update order
  UPDATE orders SET
    escrow_status = 'released',
    escrow_released_at = NOW(),
    status = 'COMPLETED',
    updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'escrow_status', 'released',
    'seller', v_seller_result,
    'driver', v_driver_result,
    'hold_id', v_hold_id
  );
END;
$$;

-- Process refund
CREATE OR REPLACE FUNCTION process_refund(
  p_order_id UUID,
  p_reason TEXT DEFAULT '',
  p_non_refundable_fee INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_refund_amount INTEGER;
  v_actual_non_refundable INTEGER;
  v_refund_id UUID;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.escrow_status NOT IN ('held', 'disputed') THEN
    RAISE EXCEPTION 'Order escrow cannot be refunded (status: %)', v_order.escrow_status;
  END IF;

  v_actual_non_refundable := COALESCE(p_non_refundable_fee, v_order.non_refundable_fee, 0);
  v_refund_amount := v_order.total_paid - v_actual_non_refundable;

  -- Create refund record
  INSERT INTO refunds (order_id, amount, reason, status, non_refundable_fee,
    refund_breakdown, payment_method)
  VALUES (p_order_id, v_refund_amount, p_reason, 'processed',
    v_actual_non_refundable,
    jsonb_build_object(
      'total_paid', v_order.total_paid,
      'non_refundable_fee', v_actual_non_refundable,
      'refund_amount', v_refund_amount,
      'product_price', v_order.product_price,
      'delivery_fee', v_order.delivery_fee,
      'service_fee', v_order.service_fee
    ),
    'pesapal')
  RETURNING id INTO v_refund_id;

  -- Update order
  UPDATE orders SET
    escrow_status = 'refunded',
    status = 'REFUNDED',
    updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'refund_id', v_refund_id,
    'refund_amount', v_refund_amount,
    'non_refundable_fee', v_actual_non_refundable
  );
END;
$$;

-- Open dispute: hold seller's portion
CREATE OR REPLACE FUNCTION open_dispute(
  p_order_id UUID,
  p_disputed_by UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_hold_id UUID;
  v_seller_amount INTEGER;
  v_driver_amount INTEGER;
  v_platform_amount INTEGER;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  v_seller_amount := v_order.product_price - (v_order.product_price * 0.10)::INTEGER;
  v_driver_amount := v_order.delivery_fee;
  v_platform_amount := v_order.total_paid - v_seller_amount - v_driver_amount;

  INSERT INTO escrow_holds (order_id, total_amount, seller_amount, driver_amount, platform_amount,
    status, disputed_by, dispute_reason)
  VALUES (p_order_id, v_order.total_paid, v_seller_amount, v_driver_amount, v_platform_amount,
    'held', p_disputed_by, p_reason)
  RETURNING id INTO v_hold_id;

  UPDATE orders SET
    escrow_status = 'disputed',
    dispute_id = v_hold_id,
    updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'hold_id', v_hold_id
  );
END;
$$;

-- Resolve dispute
CREATE OR REPLACE FUNCTION resolve_dispute(
  p_hold_id UUID,
  p_resolved_by UUID,
  p_resolution TEXT,
  p_release_seller BOOLEAN DEFAULT true,
  p_release_driver BOOLEAN DEFAULT true,
  p_refund_buyer BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hold escrow_holds%ROWTYPE;
  v_order orders%ROWTYPE;
BEGIN
  SELECT * INTO v_hold FROM escrow_holds WHERE id = p_hold_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Escrow hold not found'; END IF;
  IF v_hold.status != 'held' THEN
    RAISE EXCEPTION 'Hold already resolved (status: %)', v_hold.status;
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = v_hold.order_id FOR UPDATE;

  IF p_refund_buyer THEN
    UPDATE orders SET escrow_status = 'refunded', status = 'REFUNDED', updated_at = NOW()
    WHERE id = v_hold.order_id;
  ELSE
    IF p_release_seller THEN
      PERFORM credit_wallet(
        (SELECT owner_id FROM restaurants WHERE id = (SELECT restaurant_id FROM orders WHERE id = v_hold.order_id)),
        v_hold.seller_amount, v_hold.order_id, 'credit', 'Dispute resolved - seller payment released');
    END IF;
    IF p_release_driver THEN
      PERFORM credit_wallet(
        (SELECT driver_id FROM orders WHERE id = v_hold.order_id),
        v_hold.driver_amount, v_hold.order_id, 'credit', 'Dispute resolved - driver fee released');
    END IF;
    UPDATE orders SET escrow_status = 'released', escrow_released_at = NOW(), updated_at = NOW()
    WHERE id = v_hold.order_id;
  END IF;

  UPDATE escrow_holds SET
    status = CASE WHEN p_refund_buyer THEN 'refunded' ELSE 'released' END,
    resolution = p_resolution,
    resolved_by = p_resolved_by,
    resolved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_hold_id;

  RETURN jsonb_build_object('success', true, 'hold_id', p_hold_id);
END;
$$;

-- Helper: row_to_jsonb for the functions above
CREATE OR REPLACE FUNCTION row_to_jsonb(r RECORD)
RETURNS JSONB LANGUAGE plpgsql AS $$
BEGIN
  RETURN to_jsonb(r);
END;
$$;
