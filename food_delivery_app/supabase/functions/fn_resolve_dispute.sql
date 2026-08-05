CREATE OR REPLACE FUNCTION resolve_dispute(
  p_hold_id UUID, p_resolved_by UUID, p_resolution TEXT,
  p_release_seller BOOLEAN DEFAULT true, p_release_driver BOOLEAN DEFAULT true,
  p_refund_buyer BOOLEAN DEFAULT false
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $BODY$
DECLARE
  v_hold escrow_holds%ROWTYPE;
  v_order orders%ROWTYPE;
  v_restaurant_record RECORD;
BEGIN
  SELECT * INTO v_hold FROM escrow_holds WHERE id = p_hold_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Escrow hold not found'; END IF;
  IF v_hold.status != 'held' THEN RAISE EXCEPTION 'Hold already resolved: %', v_hold.status; END IF;
  SELECT * INTO v_order FROM orders WHERE id = v_hold.order_id FOR UPDATE;
  IF p_refund_buyer THEN
    UPDATE orders SET escrow_status = 'refunded', status = 'REFUNDED', updated_at = NOW() WHERE id = v_hold.order_id;
  ELSE
    IF p_release_seller THEN
      PERFORM credit_wallet((SELECT owner_id FROM restaurants WHERE id = v_order.restaurant_id),
        v_hold.seller_amount, v_hold.order_id, 'credit', 'Dispute resolved - seller payment');
    END IF;
    IF p_release_driver THEN
      PERFORM credit_wallet(v_order.driver_id, v_hold.driver_amount, v_hold.order_id, 'credit', 'Dispute resolved - driver fee');
    END IF;
    UPDATE orders SET escrow_status = 'released', escrow_released_at = NOW(), updated_at = NOW() WHERE id = v_hold.order_id;
  END IF;
  UPDATE escrow_holds SET status = CASE WHEN p_refund_buyer THEN 'refunded' ELSE 'released' END,
    resolution = p_resolution, resolved_by = p_resolved_by, resolved_at = NOW(), updated_at = NOW() WHERE id = p_hold_id;
  RETURN jsonb_build_object('success', true, 'hold_id', p_hold_id);
END;
$BODY$;
