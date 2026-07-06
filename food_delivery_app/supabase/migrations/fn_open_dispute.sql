CREATE OR REPLACE FUNCTION open_dispute(
  p_order_id UUID, p_disputed_by UUID, p_reason TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $BODY$
DECLARE
  v_order orders%ROWTYPE;
  v_hold_id UUID;
  v_seller_amount INTEGER;
  v_driver_amount INTEGER;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  v_seller_amount := v_order.product_price - (v_order.product_price * 0.10)::INTEGER;
  v_driver_amount := v_order.delivery_fee;
  INSERT INTO escrow_holds (order_id, total_amount, seller_amount, driver_amount, platform_amount, status, disputed_by, dispute_reason)
  VALUES (p_order_id, v_order.total_paid, v_seller_amount, v_driver_amount,
          v_order.total_paid - v_seller_amount - v_driver_amount, 'held', p_disputed_by, p_reason)
  RETURNING id INTO v_hold_id;
  UPDATE orders SET escrow_status = 'disputed', dispute_id = v_hold_id, updated_at = NOW() WHERE id = p_order_id;
  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'hold_id', v_hold_id);
END;
$BODY$;
