-- ============================================
-- MIGRATION: Admin Finance Query Functions
-- SECURITY DEFINER to bypass RLS for admin access
-- ============================================

-- Summary: aggregate stats for finance overview
CREATE OR REPLACE FUNCTION get_admin_finance_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  WITH wallet_stats AS (
    SELECT
      COALESCE(SUM(balance) FILTER (WHERE role = 'seller'), 0) AS seller_balances,
      COALESCE(SUM(balance) FILTER (WHERE role = 'driver'), 0) AS driver_balances,
      COALESCE(SUM(total_earned) FILTER (WHERE role = 'seller'), 0) AS seller_earned,
      COALESCE(SUM(total_earned) FILTER (WHERE role = 'driver'), 0) AS driver_earned,
      COUNT(*) AS total_wallets
    FROM wallets
  ),
  escrow_stats AS (
    SELECT
      COALESCE(SUM(total_amount) FILTER (WHERE status = 'held'), 0) AS total_in_escrow,
      COALESCE(SUM(total_amount) FILTER (WHERE status = 'released'), 0) AS total_released,
      COALESCE(SUM(total_amount) FILTER (WHERE status = 'refunded'), 0) AS total_refunded,
      COUNT(*) AS total_escrows
    FROM escrow_holds
  ),
  platform_fees AS (
    SELECT COALESCE(SUM(non_refundable_fee), 0) AS total_fees
    FROM orders WHERE escrow_status = 'released'
  ),
  pending_settlements AS (
    SELECT COALESCE(SUM(total_paid), 0) AS total_pending
    FROM orders WHERE escrow_status = 'held'
  ),
  dispute_stats AS (
    SELECT COUNT(*) AS open_disputes FROM disputes WHERE status = 'open'
  ),
  refund_stats AS (
    SELECT COUNT(*) AS total_refunds FROM refunds WHERE status IN ('pending', 'processed')
  )
  SELECT jsonb_build_object(
    'totalInEscrow', (SELECT total_in_escrow FROM escrow_stats),
    'totalReleased', (SELECT total_released FROM escrow_stats),
    'totalRefunded', (SELECT total_refunded FROM escrow_stats),
    'sellerBalances', (SELECT seller_balances FROM wallet_stats),
    'driverBalances', (SELECT driver_balances FROM wallet_stats),
    'sellerEarned', (SELECT seller_earned FROM wallet_stats),
    'driverEarned', (SELECT driver_earned FROM wallet_stats),
    'totalPlatformFees', (SELECT total_fees FROM platform_fees),
    'pendingSettlements', (SELECT total_pending FROM pending_settlements),
    'openDisputes', (SELECT open_disputes FROM dispute_stats),
    'totalWallets', (SELECT total_wallets FROM wallet_stats),
    'totalEscrows', (SELECT total_escrows FROM escrow_stats),
    'totalRefunds', (SELECT total_refunds FROM refund_stats)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- All wallets with user profile info
CREATE OR REPLACE FUNCTION get_admin_wallets()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', w.id,
      'user_id', w.user_id,
      'role', w.role,
      'balance', w.balance,
      'pending_balance', w.pending_balance,
      'total_earned', w.total_earned,
      'total_withdrawn', w.total_withdrawn,
      'currency', w.currency,
      'created_at', w.created_at,
      'updated_at', w.updated_at,
      'profile', jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'email', p.email,
        'phone', p.phone,
        'role', p.role
      )
    )
    ORDER BY w.updated_at DESC
  ) INTO v_result
  FROM wallets w
  LEFT JOIN profiles p ON p.id = w.user_id;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Wallet summary by role
CREATE OR REPLACE FUNCTION get_admin_wallets_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'sellers', jsonb_build_object(
      'count', COUNT(*) FILTER (WHERE role = 'seller'),
      'totalBalance', COALESCE(SUM(balance) FILTER (WHERE role = 'seller'), 0),
      'totalEarned', COALESCE(SUM(total_earned) FILTER (WHERE role = 'seller'), 0),
      'totalWithdrawn', COALESCE(SUM(total_withdrawn) FILTER (WHERE role = 'seller'), 0)
    ),
    'drivers', jsonb_build_object(
      'count', COUNT(*) FILTER (WHERE role = 'driver'),
      'totalBalance', COALESCE(SUM(balance) FILTER (WHERE role = 'driver'), 0),
      'totalEarned', COALESCE(SUM(total_earned) FILTER (WHERE role = 'driver'), 0),
      'totalWithdrawn', COALESCE(SUM(total_withdrawn) FILTER (WHERE role = 'driver'), 0)
    )
  ) INTO v_result
  FROM wallets;

  RETURN v_result;
END;
$$;

-- Transactions with user profile
CREATE OR REPLACE FUNCTION get_admin_transactions(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0,
  p_type TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_data JSONB;
  v_total INTEGER;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'user_id', t.user_id,
      'order_id', t.order_id,
      'type', t.type,
      'amount', t.amount,
      'balance_before', t.balance_before,
      'balance_after', t.balance_after,
      'reference', t.reference,
      'description', t.description,
      'status', t.status,
      'metadata', t.metadata,
      'created_at', t.created_at,
      'profile', jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'email', p.email,
        'role', p.role
      )
    )
    ORDER BY t.created_at DESC
  ) INTO v_data
  FROM transactions t
  LEFT JOIN profiles p ON p.id = t.user_id
  WHERE (p_type IS NULL OR t.type = p_type)
  LIMIT p_limit OFFSET p_offset;

  SELECT COUNT(*) INTO v_total FROM transactions
  WHERE (p_type IS NULL OR type = p_type);

  RETURN jsonb_build_object('data', COALESCE(v_data, '[]'::jsonb), 'total', v_total);
END;
$$;

-- Escrow holds with related order info
CREATE OR REPLACE FUNCTION get_admin_escrow_holds(
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', e.id,
      'order_id', e.order_id,
      'total_amount', e.total_amount,
      'seller_amount', e.seller_amount,
      'driver_amount', e.driver_amount,
      'platform_amount', e.platform_amount,
      'status', e.status,
      'disputed_by', e.disputed_by,
      'dispute_reason', e.dispute_reason,
      'resolution', e.resolution,
      'resolved_by', e.resolved_by,
      'resolved_at', e.resolved_at,
      'created_at', e.created_at,
      'updated_at', e.updated_at,
      'order', jsonb_build_object(
        'id', o.id,
        'customer_name', o.customer_name,
        'customer_id', o.customer_id,
        'total', o.total,
        'total_paid', o.total_paid,
        'status', o.status,
        'escrow_status', o.escrow_status
      )
    )
    ORDER BY e.created_at DESC
  ) INTO v_result
  FROM escrow_holds e
  LEFT JOIN orders o ON o.id = e.order_id
  WHERE (p_status IS NULL OR e.status = p_status)
  LIMIT p_limit;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Orders with escrow data
CREATE OR REPLACE FUNCTION get_admin_orders_escrow(
  p_escrow_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', o.id,
      'customer_id', o.customer_id,
      'customer_name', o.customer_name,
      'restaurant_id', o.restaurant_id,
      'driver_id', o.driver_id,
      'total', o.total,
      'total_paid', o.total_paid,
      'product_price', o.product_price,
      'delivery_fee', o.delivery_fee,
      'service_fee', o.service_fee,
      'non_refundable_fee', o.non_refundable_fee,
      'escrow_status', o.escrow_status,
      'escrow_released_at', o.escrow_released_at,
      'payment_status', o.payment_status,
      'status', o.status,
      'created_at', o.created_at,
      'updated_at', o.updated_at
    )
    ORDER BY o.created_at DESC
  ) INTO v_result
  FROM orders o
  WHERE o.escrow_status IS NOT NULL AND o.escrow_status != 'pending'
    AND (p_escrow_status IS NULL OR o.escrow_status = p_escrow_status)
  LIMIT p_limit;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Refunds with order info
CREATE OR REPLACE FUNCTION get_admin_refunds(
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'order_id', r.order_id,
      'amount', r.amount,
      'reason', r.reason,
      'status', r.status,
      'non_refundable_fee', r.non_refundable_fee,
      'refund_breakdown', r.refund_breakdown,
      'processed_by', r.processed_by,
      'processed_at', r.processed_at,
      'payment_method', r.payment_method,
      'created_at', r.created_at,
      'order', jsonb_build_object(
        'id', o.id,
        'customer_name', o.customer_name,
        'total', o.total
      )
    )
    ORDER BY r.created_at DESC
  ) INTO v_result
  FROM refunds r
  LEFT JOIN orders o ON o.id = r.order_id
  WHERE (p_status IS NULL OR r.status = p_status)
  LIMIT p_limit;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Disputes with order info
CREATE OR REPLACE FUNCTION get_admin_disputes(
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', d.id,
      'order_id', d.order_id,
      'customer_id', d.customer_id,
      'reason', d.reason,
      'description', d.description,
      'status', d.status,
      'resolution', d.resolution,
      'resolved_by', d.resolved_by,
      'resolved_at', d.resolved_at,
      'created_at', d.created_at,
      'order', jsonb_build_object(
        'id', o.id,
        'customer_name', o.customer_name,
        'total', o.total
      )
    )
    ORDER BY d.created_at DESC
  ) INTO v_result
  FROM disputes d
  LEFT JOIN orders o ON o.id = d.order_id
  WHERE (p_status IS NULL OR d.status = p_status)
  LIMIT p_limit;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;
