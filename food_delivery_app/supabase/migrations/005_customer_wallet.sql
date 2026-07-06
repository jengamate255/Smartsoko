-- ============================================
-- MIGRATION: Customer Wallet System
-- Extends wallet role to include 'customer'
-- Adds lookup/payment/refund functions by email
-- ============================================

-- Extend wallets role CHECK to include 'customer'
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS wallets_role_check;
ALTER TABLE wallets ADD CONSTRAINT wallets_role_check
  CHECK (role IN ('seller', 'driver', 'customer'));

-- Add firebase_uid to profiles for cross-reference
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS firebase_uid TEXT UNIQUE;

-- Add refund_to_wallet flag to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_to_wallet BOOLEAN DEFAULT true;

-- ============================================
-- CUSTOMER WALLET FUNCTIONS
-- ============================================

-- Get or create customer wallet by email (profile must already exist in auth.users)
CREATE OR REPLACE FUNCTION get_or_create_customer_wallet(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pid UUID;
  v_wallet JSONB;
BEGIN
  SELECT id INTO v_pid FROM profiles WHERE email = p_email LIMIT 1;
  IF v_pid IS NULL THEN
    RETURN jsonb_build_object('error', 'Profile not found. User must sign up first.');
  END IF;

  INSERT INTO wallets (user_id, role, balance, pending_balance, total_earned, total_withdrawn, currency)
  VALUES (v_pid, 'customer', 0, 0, 0, 0, 'TZS')
  ON CONFLICT (user_id) DO NOTHING;

  SELECT jsonb_build_object(
    'id', w.id, 'user_id', w.user_id, 'balance', w.balance,
    'pending_balance', w.pending_balance, 'total_earned', w.total_earned,
    'total_withdrawn', w.total_withdrawn, 'currency', w.currency,
    'profile_id', v_pid, 'created_at', w.created_at, 'updated_at', w.updated_at
  ) INTO v_wallet
  FROM wallets w WHERE w.user_id = v_pid;

  RETURN COALESCE(v_wallet, jsonb_build_object('error', 'Failed to create wallet'));
END;
$$;

-- Get customer wallet summary (balance + recent stats)
CREATE OR REPLACE FUNCTION get_customer_wallet_summary(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pid UUID;
  v_result JSONB;
BEGIN
  SELECT id INTO v_pid FROM profiles WHERE email = p_email LIMIT 1;
  IF v_pid IS NULL THEN
    RETURN jsonb_build_object('error', 'Profile not found');
  END IF;

  WITH wallet AS (
    SELECT * FROM wallets WHERE user_id = v_pid AND role = 'customer' LIMIT 1
  ),
  recent_tx AS (
    SELECT COALESCE(SUM(amount) FILTER (WHERE type = 'debit'), 0) AS spent_today,
           COALESCE(SUM(amount) FILTER (WHERE type = 'credit'), 0) AS topped_up_today
    FROM transactions
    WHERE user_id = v_pid AND created_at >= CURRENT_DATE
  ),
  pending_refunds AS (
    SELECT COALESCE(SUM(o.total_paid), 0) AS total
    FROM orders o
    WHERE o.customer_id = v_pid AND o.escrow_status = 'refunded' AND o.refund_to_wallet = true
      AND o.status NOT LIKE '%REFUNDED%'
  )
  SELECT jsonb_build_object(
    'balance',         COALESCE((SELECT balance FROM wallet), 0),
    'pending_balance', COALESCE((SELECT pending_balance FROM wallet), 0),
    'total_earned',    COALESCE((SELECT total_earned FROM wallet), 0),
    'total_withdrawn', COALESCE((SELECT total_withdrawn FROM wallet), 0),
    'spent_today',     (SELECT spent_today FROM recent_tx),
    'topped_up_today', (SELECT topped_up_today FROM recent_tx),
    'pending_refunds', (SELECT total FROM pending_refunds),
    'currency',        COALESCE((SELECT currency FROM wallet), 'TZS'),
    'has_wallet',      (SELECT (SELECT COUNT(*) FROM wallet) > 0)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Customer transaction history
CREATE OR REPLACE FUNCTION get_customer_transactions(
  p_email TEXT,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_data JSONB; v_total INTEGER; v_pid UUID;
BEGIN
  SELECT id INTO v_pid FROM profiles WHERE email = p_email LIMIT 1;
  IF v_pid IS NULL THEN
    RETURN jsonb_build_object('data', '[]'::jsonb, 'total', 0);
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'order_id', t.order_id,
      'type', t.type,
      'amount', t.amount,
      'balance_before', t.balance_before,
      'balance_after', t.balance_after,
      'reference', t.reference,
      'description', t.description,
      'status', t.status,
      'created_at', t.created_at
    ) ORDER BY t.created_at DESC
  ) INTO v_data
  FROM transactions t
  WHERE t.user_id = v_pid
  LIMIT p_limit OFFSET p_offset;

  SELECT COUNT(*) INTO v_total FROM transactions WHERE user_id = v_pid;

  RETURN jsonb_build_object('data', COALESCE(v_data, '[]'::jsonb), 'total', v_total);
END;
$$;

-- ============================================
-- ONE-CLICK PAYMENT FROM WALLET
-- ============================================

-- Pay for an order from customer wallet
-- 1. Debits customer wallet
-- 2. Marks order as paid (payment_status='paid')
-- 3. Creates escrow hold
-- 4. Returns the result
CREATE OR REPLACE FUNCTION customer_pay_from_wallet(
  p_email TEXT,
  p_order_id UUID,
  p_product_price INTEGER DEFAULT 0,
  p_delivery_fee INTEGER DEFAULT 0,
  p_service_fee INTEGER DEFAULT 0,
  p_non_refundable_fee INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pid UUID;
  v_wallet wallets%ROWTYPE;
  v_total INTEGER;
  v_order orders%ROWTYPE;
  v_escrow_id UUID;
BEGIN
  -- Lookup customer
  SELECT id INTO v_pid FROM profiles WHERE email = p_email LIMIT 1;
  IF v_pid IS NULL THEN
    RETURN jsonb_build_object('error', 'Customer profile not found');
  END IF;

  -- Get order
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Order not found');
  END IF;

  -- Calculate total
  v_total := p_product_price + p_delivery_fee + p_service_fee;

  -- Lock and debit wallet
  SELECT * INTO v_wallet FROM wallets WHERE user_id = v_pid AND role = 'customer' FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Wallet not found. Please top up first.');
  END IF;
  IF v_wallet.balance < v_total THEN
    RETURN jsonb_build_object(
      'error', 'Insufficient balance',
      'balance', v_wallet.balance,
      'required', v_total,
      'shortfall', v_total - v_wallet.balance
    );
  END IF;

  -- Debit wallet
  UPDATE wallets
  SET balance = balance - v_total,
      total_withdrawn = total_withdrawn + v_total,
      updated_at = NOW()
  WHERE user_id = v_pid AND role = 'customer';

  -- Record debit transaction
  INSERT INTO transactions (user_id, order_id, type, amount, balance_before, balance_after,
    reference, description, status, metadata)
  VALUES (v_pid, p_order_id, 'debit', v_total, v_wallet.balance, v_wallet.balance - v_total,
    'WALLET-' || p_order_id, 'Payment for order from wallet', 'completed',
    jsonb_build_object('payment_method', 'wallet', 'product_price', p_product_price, 'delivery_fee', p_delivery_fee));

  -- Update order
  UPDATE orders
  SET payment_status = 'paid',
      payment_method = 'wallet',
      status = 'confirmed',
      total_paid = v_total,
      product_price = p_product_price,
      delivery_fee = p_delivery_fee,
      service_fee = p_service_fee,
      non_refundable_fee = p_non_refundable_fee,
      escrow_status = 'held',
      updated_at = NOW()
  WHERE id = p_order_id;

  -- Create escrow hold
  INSERT INTO escrow_holds (order_id, total_amount, seller_amount, driver_amount, platform_amount, status)
  VALUES (p_order_id, v_total,
    v_total - p_delivery_fee - p_non_refundable_fee,  -- seller gets total minus delivery minus fees
    p_delivery_fee,                                    -- driver gets delivery fee
    p_non_refundable_fee,                              -- platform keeps fees
    'held')
  RETURNING id INTO v_escrow_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'amount', v_total,
    'balance_before', v_wallet.balance,
    'balance_after', v_wallet.balance - v_total,
    'escrow_id', v_escrow_id,
    'payment_method', 'wallet'
  );
END;
$$;

-- ============================================
-- AUTO-REFUND FAILED ORDER TO WALLET
-- ============================================

-- Refund a failed/cancelled order to customer's wallet
-- Deducts non_refundable_fee, credits the rest
CREATE OR REPLACE FUNCTION refund_order_to_wallet(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_refund_amount INTEGER;
  v_wallet wallets%ROWTYPE;
  v_escrow escrow_holds%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Order not found');
  END IF;

  -- Calculate refund: total_paid minus non_refundable_fee (PesaPal processing fee)
  v_refund_amount := v_order.total_paid - COALESCE(v_order.non_refundable_fee, 0);
  IF v_refund_amount <= 0 THEN
    v_refund_amount := 0;
  END IF;

  -- Get or create customer wallet
  INSERT INTO wallets (user_id, role, balance, pending_balance, total_earned, total_withdrawn, currency)
  VALUES (v_order.customer_id, 'customer', 0, 0, 0, 0, 'TZS')
  ON CONFLICT (user_id) DO NOTHING;

  -- Lock and credit wallet
  SELECT * INTO v_wallet FROM wallets WHERE user_id = v_order.customer_id FOR UPDATE;

  UPDATE wallets
  SET balance = balance + v_refund_amount,
      total_earned = total_earned + v_refund_amount,
      updated_at = NOW()
  WHERE user_id = v_order.customer_id;

  -- Record credit transaction
  INSERT INTO transactions (user_id, order_id, type, amount, balance_before, balance_after,
    reference, description, status, metadata)
  VALUES (v_order.customer_id, p_order_id, 'credit', v_refund_amount,
    v_wallet.balance, v_wallet.balance + v_refund_amount,
    'REFUND-' || p_order_id,
    'Refund for order ' || p_order_id || ' (deducted non-refundable fee: ' || COALESCE(v_order.non_refundable_fee, 0) || ')',
    'completed',
    jsonb_build_object('refund_type', 'auto_wallet', 'non_refundable_fee', v_order.non_refundable_fee));

  -- Update order escrow status
  UPDATE orders
  SET escrow_status = 'refunded',
      status = 'REFUNDED',
      updated_at = NOW()
  WHERE id = p_order_id;

  -- Release escrow hold if exists
  UPDATE escrow_holds
  SET status = 'refunded', updated_at = NOW()
  WHERE order_id = p_order_id AND status = 'held';

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'refund_amount', v_refund_amount,
    'non_refundable_fee', COALESCE(v_order.non_refundable_fee, 0),
    'balance_before', v_wallet.balance,
    'balance_after', v_wallet.balance + v_refund_amount,
    'customer_id', v_order.customer_id
  );
END;
$$;

-- ============================================
-- WALLET TOP-UP VIA PESAPAL (no edge func changes)
-- Uses dummy orders with order_type='wallet_topup'
-- ============================================

-- Add order_type to distinguish topups from real orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'order'
  CHECK (order_type IN ('order', 'wallet_topup', 'subscription'));

-- Create a topup order (dummy order for PesaPal payment reference)
CREATE OR REPLACE FUNCTION create_topup_order(
  p_email TEXT,
  p_amount INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pid UUID;
  v_order_id UUID;
  v_profile_name TEXT;
BEGIN
  -- Lookup existing profile (must exist in auth.users)
  SELECT id, COALESCE(name, split_part(p_email, '@', 1)) INTO v_pid, v_profile_name
  FROM profiles WHERE email = p_email LIMIT 1;

  IF v_pid IS NULL THEN
    RETURN jsonb_build_object('error', 'Profile not found. User must sign up first.');
  END IF;

  -- Create dummy order for topup
  INSERT INTO orders (
    customer_id, customer_name, total, subtotal, total_paid, status,
    payment_status, payment_method, order_type,
    escrow_status, product_price, delivery_fee, service_fee, non_refundable_fee, items
  ) VALUES (
    v_pid, v_profile_name, p_amount, p_amount, p_amount, 'topup_pending',
    'pending', 'pesapal', 'wallet_topup',
    'pending', p_amount, 0, 0, 0, '[]'::jsonb
  )
  RETURNING id INTO v_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'amount', p_amount,
    'customer_id', v_pid
  );
END;
$$;

-- Check if a topup order has been paid (poll payment_transactions)
CREATE OR REPLACE FUNCTION check_topup_payment_status(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pt payment_transactions%ROWTYPE;
  v_order orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Order not found');
  END IF;

  -- Check if already completed
  IF v_order.payment_status = 'paid' OR v_order.status = 'topup_completed' THEN
    RETURN jsonb_build_object('completed', true, 'status', 'completed');
  END IF;

  -- Check payment_transactions
  SELECT * INTO v_pt FROM payment_transactions
  WHERE order_id = p_order_id
  ORDER BY created_at DESC LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'pending', 'completed', false);
  END IF;

  IF v_pt.status = 'completed' THEN
    RETURN jsonb_build_object('completed', true, 'status', 'completed', 'transaction_ref', v_pt.transaction_ref);
  ELSIF v_pt.status = 'failed' THEN
    RETURN jsonb_build_object('failed', true, 'status', 'failed');
  ELSE
    RETURN jsonb_build_object('status', 'pending', 'completed', false);
  END IF;
END;
$$;

-- Complete a wallet topup: credit wallet after payment confirmed
CREATE OR REPLACE FUNCTION complete_wallet_topup(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_wallet wallets%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Topup order not found');
  END IF;

  IF v_order.order_type != 'wallet_topup' THEN
    RETURN jsonb_build_object('error', 'Not a wallet topup order');
  END IF;

  IF v_order.status = 'topup_completed' THEN
    RETURN jsonb_build_object('error', 'Topup already completed');
  END IF;

  -- Verify payment was completed
  IF v_order.payment_status != 'paid' THEN
    -- Check payment_transactions as fallback
    DECLARE
      v_pt payment_transactions%ROWTYPE;
    BEGIN
      SELECT * INTO v_pt FROM payment_transactions
      WHERE order_id = p_order_id AND status = 'completed'
      LIMIT 1;
      IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Payment not yet completed');
      END IF;
      -- Auto-update order as paid
      UPDATE orders SET payment_status = 'paid' WHERE id = p_order_id;
    END;
  END IF;

  -- Get or create customer wallet
  INSERT INTO wallets (user_id, role, balance, pending_balance, total_earned, total_withdrawn, currency)
  VALUES (v_order.customer_id, 'customer', 0, 0, 0, 0, 'TZS')
  ON CONFLICT (user_id) DO NOTHING;

  -- Lock and credit wallet
  SELECT * INTO v_wallet FROM wallets
  WHERE user_id = v_order.customer_id FOR UPDATE;

  UPDATE wallets
  SET balance = balance + v_order.total,
      total_earned = total_earned + v_order.total,
      updated_at = NOW()
  WHERE user_id = v_order.customer_id;

  -- Record credit transaction
  INSERT INTO transactions (user_id, order_id, type, amount, balance_before, balance_after,
    reference, description, status, metadata)
  VALUES (v_order.customer_id, p_order_id, 'credit', v_order.total,
    v_wallet.balance, v_wallet.balance + v_order.total,
    'TOPUP-' || p_order_id,
    'Wallet top-up via PesaPal',
    'completed',
    jsonb_build_object('payment_method', 'pesapal'));

  -- Mark order as completed
  UPDATE orders
  SET status = 'topup_completed',
      payment_status = 'paid',
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'amount', v_order.total,
    'balance_before', v_wallet.balance,
    'balance_after', v_wallet.balance + v_order.total,
    'customer_id', v_order.customer_id
  );
END;
$$;

-- ============================================
-- REFUND PROCESSING (cont.)
-- ============================================

-- Wrapper: process refund and decide whether to go to wallet or external
CREATE OR REPLACE FUNCTION process_customer_refund(
  p_order_id UUID,
  p_refund_to_wallet BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_refund JSONB;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Order not found');
  END IF;

  -- Update refund_to_wallet flag
  UPDATE orders SET refund_to_wallet = p_refund_to_wallet WHERE id = p_order_id;

  IF p_refund_to_wallet THEN
    -- Refund directly to wallet (instant, no PesaPal fees beyond non_refundable)
    v_refund := refund_order_to_wallet(p_order_id);
    RETURN v_refund;
  ELSE
    -- Use existing process_refund (external refund via PesaPal)
    v_refund := process_refund(p_order_id, 'Order cancelled/failed', null);
    RETURN v_refund;
  END IF;
END;
$$;
