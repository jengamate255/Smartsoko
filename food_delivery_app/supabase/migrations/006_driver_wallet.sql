-- 006_driver_wallet.sql
-- Driver wallet functions: balance, transactions, withdrawal, auto-settlement

CREATE OR REPLACE FUNCTION get_driver_wallet_summary(p_driver_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet wallets%ROWTYPE;
  v_pending_from_escrow INTEGER DEFAULT 0;
  v_recent_transactions JSONB;
BEGIN
  INSERT INTO wallets (user_id, role, balance, pending_balance, total_earned, total_withdrawn, currency)
  VALUES (p_driver_id, 'driver', 0, 0, 0, 0, 'TZS')
  ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_driver_id AND role = 'driver';
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Driver wallet not found'); END IF;
  SELECT COALESCE(SUM(o.delivery_fee), 0) INTO v_pending_from_escrow
  FROM orders o WHERE o.driver_id = p_driver_id AND o.escrow_status = 'held';
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', t.id, 'type', t.type, 'amount', t.amount,
    'balance_before', t.balance_before, 'balance_after', t.balance_after,
    'description', t.description, 'reference', t.reference,
    'created_at', t.created_at, 'metadata', t.metadata
  ) ORDER BY t.created_at DESC), '[]'::jsonb)
  INTO v_recent_transactions
  FROM transactions t WHERE t.user_id = p_driver_id LIMIT 5;
  RETURN jsonb_build_object(
    'wallet_id', v_wallet.id, 'user_id', v_wallet.user_id,
    'balance', v_wallet.balance, 'pending_balance', v_wallet.pending_balance,
    'total_earned', v_wallet.total_earned, 'total_withdrawn', v_wallet.total_withdrawn,
    'currency', v_wallet.currency, 'pending_from_escrow', v_pending_from_escrow,
    'recent_transactions', v_recent_transactions
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_driver_transactions(
  p_driver_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
  v_items JSONB;
BEGIN
  SELECT COUNT(*) INTO v_count FROM transactions t WHERE t.user_id = p_driver_id;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', t.id, 'type', t.type, 'amount', t.amount,
    'balance_before', t.balance_before, 'balance_after', t.balance_after,
    'description', t.description, 'reference', t.reference,
    'order_id', t.order_id, 'created_at', t.created_at, 'metadata', t.metadata
  ) ORDER BY t.created_at DESC), '[]'::jsonb)
  INTO v_items
  FROM transactions t WHERE t.user_id = p_driver_id LIMIT p_limit OFFSET p_offset;
  RETURN jsonb_build_object('items', v_items, 'total', v_count, 'limit', p_limit, 'offset', p_offset);
END;
$$;

CREATE OR REPLACE FUNCTION withdraw_driver_wallet(
  p_driver_id UUID,
  p_amount INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet wallets%ROWTYPE;
  v_ref TEXT;
BEGIN
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_driver_id AND role = 'driver' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Driver wallet not found'); END IF;
  IF v_wallet.balance < p_amount THEN
    RETURN jsonb_build_object('error', 'Insufficient balance', 'balance', v_wallet.balance, 'requested', p_amount);
  END IF;
  IF p_amount <= 0 THEN RETURN jsonb_build_object('error', 'Amount must be positive'); END IF;
  v_ref := 'WITHDRAW-' || gen_random_uuid()::text;
  UPDATE wallets SET balance = balance - p_amount, total_withdrawn = total_withdrawn + p_amount, updated_at = NOW()
  WHERE id = v_wallet.id;
  INSERT INTO transactions (user_id, order_id, type, amount, balance_before, balance_after, reference, description, status, metadata)
  VALUES (p_driver_id, NULL, 'debit', p_amount, v_wallet.balance, v_wallet.balance - p_amount, v_ref, 'Driver wallet withdrawal', 'completed',
    jsonb_build_object('withdrawal', true, 'role', 'driver'));
  RETURN jsonb_build_object('success', true, 'reference', v_ref, 'amount', p_amount,
    'balance_before', v_wallet.balance, 'balance_after', v_wallet.balance - p_amount);
END;
$$;

-- Settle delivery: release escrow to seller (restaurant_id) and driver
CREATE OR REPLACE FUNCTION settle_delivery(
  p_order_id UUID,
  p_driver_amount INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_seller_amount INTEGER;
  v_driver_amount INTEGER;
  v_platform_amount INTEGER;
  v_hold_id UUID;
  v_seller_result JSONB;
  v_driver_result JSONB;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Order not found'); END IF;
  IF v_order.escrow_status != 'held' THEN
    RETURN jsonb_build_object('error', 'Order escrow is not held (current: ' || v_order.escrow_status || ')');
  END IF;
  IF v_order.restaurant_id IS NULL THEN RETURN jsonb_build_object('error', 'Order has no restaurant_id'); END IF;
  v_seller_amount := v_order.total_paid - COALESCE(v_order.non_refundable_fee, 0) - COALESCE(v_order.delivery_fee, 0);
  v_driver_amount := COALESCE(NULLIF(p_driver_amount, 0), v_order.delivery_fee, 0);
  v_platform_amount := COALESCE(v_order.non_refundable_fee, 0);
  INSERT INTO escrow_holds (order_id, total_amount, seller_amount, driver_amount, platform_amount, status)
  VALUES (p_order_id, v_order.total_paid, v_seller_amount, v_driver_amount, v_platform_amount, 'released')
  RETURNING id INTO v_hold_id;
  v_seller_result := credit_wallet(v_order.restaurant_id, v_seller_amount, p_order_id, 'credit',
    CONCAT('Payment for order ', substring(p_order_id::text, 1, 8)),
    jsonb_build_object('order_id', p_order_id, 'hold_id', v_hold_id, 'role', 'seller'));
  IF v_order.driver_id IS NOT NULL AND v_driver_amount > 0 THEN
    v_driver_result := credit_wallet(v_order.driver_id, v_driver_amount, p_order_id, 'credit',
      CONCAT('Delivery fee for order ', substring(p_order_id::text, 1, 8)),
      jsonb_build_object('order_id', p_order_id, 'hold_id', v_hold_id, 'role', 'driver'));
  END IF;
  UPDATE orders SET escrow_status = 'released', escrow_released_at = NOW(), status = 'COMPLETED', updated_at = NOW()
  WHERE id = p_order_id;
  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'escrow_status', 'released',
    'seller_amount', v_seller_amount, 'driver_amount', v_driver_amount, 'platform_amount', v_platform_amount,
    'hold_id', v_hold_id, 'seller_result', v_seller_result, 'driver_result', v_driver_result);
END;
$$;

-- Bulk settle all eligible orders
CREATE OR REPLACE FUNCTION settle_all_delivered_orders()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rec RECORD;
  v_results JSONB[] DEFAULT '{}';
  v_settled INTEGER DEFAULT 0;
  v_errors INTEGER DEFAULT 0;
BEGIN
  FOR v_rec IN SELECT id FROM orders WHERE escrow_status = 'held' AND status IN ('COMPLETED', 'delivered') AND restaurant_id IS NOT NULL
  LOOP
    BEGIN
      v_results := array_append(v_results, settle_delivery(v_rec.id));
      v_settled := v_settled + 1;
    EXCEPTION WHEN OTHERS THEN
      v_results := array_append(v_results, jsonb_build_object('order_id', v_rec.id, 'error', SQLERRM));
      v_errors := v_errors + 1;
    END;
  END LOOP;
  RETURN jsonb_build_object('settled', v_settled, 'errors', v_errors, 'results', v_results);
END;
$$;
