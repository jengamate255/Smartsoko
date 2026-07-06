-- ============================================
-- MIGRATION: Merchant Finance Query Functions
-- SECURITY DEFINER to bypass RLS for merchant wallet/escrow access
-- All functions accept p_email to look up the merchant via profiles
-- ============================================

-- Wallet + earnings summary for merchant dashboard cards
CREATE OR REPLACE FUNCTION get_merchant_earnings_summary(p_email TEXT)
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
    SELECT * FROM wallets WHERE user_id = v_pid AND role = 'seller' LIMIT 1
  ),
  today_earned AS (
    SELECT COALESCE(SUM(amount), 0) AS val
    FROM transactions
    WHERE user_id = v_pid AND type = 'credit' AND created_at >= CURRENT_DATE
  ),
  week_earned AS (
    SELECT COALESCE(SUM(amount), 0) AS val
    FROM transactions
    WHERE user_id = v_pid AND type = 'credit' AND created_at >= CURRENT_DATE - INTERVAL '7 days'
  ),
  month_earned AS (
    SELECT COALESCE(SUM(amount), 0) AS val
    FROM transactions
    WHERE user_id = v_pid AND type = 'credit' AND created_at >= CURRENT_DATE - INTERVAL '30 days'
  ),
  escrow_stats AS (
    SELECT
      COALESCE(SUM(o.total_paid), 0) AS pending_in_escrow,
      COUNT(*) AS pending_orders
    FROM orders o
    JOIN restaurants r ON r.id = o.restaurant_id
    WHERE r.owner_id = v_pid AND o.escrow_status = 'held'
  ),
  recent_payouts AS (
    SELECT COALESCE(SUM(amount), 0) AS val
    FROM transactions
    WHERE user_id = v_pid AND type = 'debit' AND created_at >= CURRENT_DATE - INTERVAL '30 days'
  )
  SELECT jsonb_build_object(
    'balance',         COALESCE((SELECT balance FROM wallet), 0),
    'pending_balance', COALESCE((SELECT pending_balance FROM wallet), 0),
    'total_earned',    COALESCE((SELECT total_earned FROM wallet), 0),
    'total_withdrawn', COALESCE((SELECT total_withdrawn FROM wallet), 0),
    'today_earned',    (SELECT val FROM today_earned),
    'week_earned',     (SELECT val FROM week_earned),
    'month_earned',    (SELECT val FROM month_earned),
    'pending_in_escrow', (SELECT pending_in_escrow FROM escrow_stats),
    'pending_orders',    (SELECT pending_orders FROM escrow_stats),
    'recent_payouts',    (SELECT val FROM recent_payouts)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Single merchant wallet lookup
CREATE OR REPLACE FUNCTION get_merchant_wallet(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', w.id,
    'user_id', w.user_id,
    'role', w.role,
    'balance', w.balance,
    'pending_balance', w.pending_balance,
    'total_earned', w.total_earned,
    'total_withdrawn', w.total_withdrawn,
    'currency', w.currency,
    'created_at', w.created_at,
    'updated_at', w.updated_at
  ) INTO v_result
  FROM wallets w
  JOIN profiles p ON p.id = w.user_id
  WHERE p.email = p_email AND w.role = 'seller';

  RETURN v_result;
END;
$$;

-- Merchant transaction history
CREATE OR REPLACE FUNCTION get_merchant_transactions(
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

-- Merchant escrow orders
CREATE OR REPLACE FUNCTION get_merchant_orders_escrow(
  p_email TEXT,
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', o.id,
      'customer_name', o.customer_name,
      'total', o.total,
      'total_paid', o.total_paid,
      'product_price', o.product_price,
      'delivery_fee', o.delivery_fee,
      'service_fee', o.service_fee,
      'non_refundable_fee', o.non_refundable_fee,
      'escrow_status', o.escrow_status,
      'payment_status', o.payment_status,
      'payment_method', o.payment_method,
      'status', o.status,
      'created_at', o.created_at,
      'escrow_released_at', o.escrow_released_at
    ) ORDER BY o.created_at DESC
  ) INTO v_result
  FROM orders o
  JOIN restaurants r ON r.id = o.restaurant_id
  JOIN profiles p ON p.id = r.owner_id
  WHERE p.email = p_email
    AND o.escrow_status IS NOT NULL
    AND o.escrow_status != 'pending'
    AND (p_status IS NULL OR o.escrow_status = p_status)
  LIMIT p_limit;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;
