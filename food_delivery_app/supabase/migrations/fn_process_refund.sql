CREATE OR REPLACE FUNCTION process_refund(
  p_order_id UUID, p_reason TEXT DEFAULT '', p_non_refundable_fee INTEGER DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $BODY$
DECLARE
  v_order orders%ROWTYPE;
  v_refund_amount INTEGER;
  v_actual_fee INTEGER;
  v_refund_id UUID;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.escrow_status NOT IN ('held', 'disputed') THEN RAISE EXCEPTION 'Order cannot be refunded (status: %)', v_order.escrow_status; END IF;
  v_actual_fee := COALESCE(p_non_refundable_fee, v_order.non_refundable_fee, 0);
  v_refund_amount := GREATEST(0, v_order.total_paid - v_actual_fee);
  INSERT INTO refunds (order_id, amount, reason, status, non_refundable_fee, refund_breakdown, payment_method)
  VALUES (p_order_id, v_refund_amount, p_reason, 'processed', v_actual_fee,
    jsonb_build_object('total_paid', v_order.total_paid, 'non_refundable_fee', v_actual_fee,
      'refund_amount', v_refund_amount, 'product_price', v_order.product_price,
      'delivery_fee', v_order.delivery_fee, 'service_fee', v_order.service_fee), 'pesapal')
  RETURNING id INTO v_refund_id;
  UPDATE orders SET escrow_status = 'refunded', status = 'REFUNDED', updated_at = NOW() WHERE id = p_order_id;
  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'refund_id', v_refund_id, 'refund_amount', v_refund_amount, 'non_refundable_fee', v_actual_fee);
END;
$BODY$;
