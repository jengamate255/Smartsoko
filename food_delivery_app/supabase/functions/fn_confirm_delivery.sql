CREATE OR REPLACE FUNCTION confirm_delivery_release(
  p_order_id UUID, p_seller_id UUID, p_driver_id UUID,
  p_seller_amount INTEGER, p_driver_amount INTEGER
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $BODY$
DECLARE
  v_order orders%ROWTYPE;
  v_hold_id UUID;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.escrow_status != 'held' THEN RAISE EXCEPTION 'Order escrow not in held state: %', v_order.escrow_status; END IF;
  INSERT INTO escrow_holds (order_id, total_amount, seller_amount, driver_amount, platform_amount, status)
  VALUES (p_order_id, v_order.total_paid, p_seller_amount, p_driver_amount,
          v_order.total_paid - p_seller_amount - p_driver_amount, 'released')
  RETURNING id INTO v_hold_id;
  PERFORM credit_wallet(p_seller_id, p_seller_amount, p_order_id, 'credit',
    CONCAT('Payment for order #', substring(p_order_id::text, 1, 8)),
    jsonb_build_object('order_id', p_order_id, 'hold_id', v_hold_id, 'role', 'seller'));
  IF p_driver_id IS NOT NULL AND p_driver_amount > 0 THEN
    PERFORM credit_wallet(p_driver_id, p_driver_amount, p_order_id, 'credit',
      CONCAT('Delivery fee for order #', substring(p_order_id::text, 1, 8)),
      jsonb_build_object('order_id', p_order_id, 'hold_id', v_hold_id, 'role', 'driver'));
  END IF;
  UPDATE orders SET escrow_status = 'released', escrow_released_at = NOW(), status = 'COMPLETED', updated_at = NOW() WHERE id = p_order_id;
  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'escrow_status', 'released', 'hold_id', v_hold_id);
END;
$BODY$;
