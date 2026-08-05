CREATE OR REPLACE FUNCTION confirm_payment_escrow(
  p_order_id UUID, p_product_price INTEGER, p_delivery_fee INTEGER,
  p_service_fee INTEGER, p_total_paid INTEGER, p_non_refundable_fee INTEGER DEFAULT 0
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $BODY$
DECLARE v_order orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  UPDATE orders SET
    product_price = p_product_price, delivery_fee = p_delivery_fee,
    service_fee = p_service_fee, total_paid = p_total_paid,
    non_refundable_fee = p_non_refundable_fee,
    escrow_status = 'held', payment_status = 'paid', status = 'PAID', updated_at = NOW()
  WHERE id = p_order_id;
  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'escrow_status', 'held', 'total_paid', p_total_paid);
END;
$BODY$;
