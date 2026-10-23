CREATE TABLE IF NOT EXISTS public.admin_order_refunds (
  request_id uuid PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id),
  amount integer NOT NULL CHECK (amount>0),
  actor text NOT NULL,
  reason text NOT NULL,
  destination text NOT NULL DEFAULT 'wallet' CHECK(destination='wallet'),
  status text NOT NULL DEFAULT 'completed' CHECK(status='completed'),
  payment_reference text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS admin_full_refund_once ON public.admin_order_refunds(order_id);
ALTER TABLE public.admin_order_refunds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_order_refunds FROM anon,authenticated;
GRANT ALL ON public.admin_order_refunds TO service_role;

CREATE OR REPLACE FUNCTION public.admin_refund_order(p_order_id uuid,p_request_id uuid,p_amount integer,p_actor text,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.orders; previous public.admin_order_refunds; reserved uuid; refundable integer; result jsonb; credited_amount numeric;
BEGIN
  IF p_request_id IS NULL OR p_amount IS NULL OR p_amount<=0 OR nullif(btrim(p_actor),'') IS NULL OR nullif(btrim(p_reason),'') IS NULL THEN
    RETURN jsonb_build_object('success',false,'error','Valid request, amount, actor and reason required');
  END IF;
  SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Order not found'); END IF;
  SELECT * INTO previous FROM public.admin_order_refunds WHERE request_id=p_request_id;
  IF FOUND THEN
    IF previous.order_id<>p_order_id OR previous.amount<>p_amount OR previous.actor<>p_actor THEN
      RETURN jsonb_build_object('success',false,'error','Idempotency key already used for a different refund');
    END IF;
    RETURN jsonb_build_object('success',true,'replayed',true,'refund',to_jsonb(previous));
  END IF;
  IF o.customer_id IS NULL OR o.refund_to_wallet IS FALSE THEN RETURN jsonb_build_object('success',false,'error','Wallet refund unavailable; manual provider review required'); END IF;
  IF o.escrow_status IN ('released','disputed') THEN RETURN jsonb_build_object('success',false,'error','Released or disputed funds require manual review'); END IF;
  IF o.payment_status IS DISTINCT FROM 'paid' AND coalesce(o.escrow_status,'') NOT IN ('held','refunded') THEN RETURN jsonb_build_object('success',false,'error','No collected payment to refund'); END IF;
  IF o.total_paid IS NULL OR o.total_paid<=0 THEN RETURN jsonb_build_object('success',false,'error','Collected amount unverified; manual review required'); END IF;
  refundable:=greatest(0,coalesce(o.total_paid,o.total,0)-coalesce(o.non_refundable_fee,0));
  IF refundable<>p_amount THEN RETURN jsonb_build_object('success',false,'error','Refund must equal the full refundable balance excluding the non-refundable fee'); END IF;
  SELECT * INTO previous FROM public.admin_order_refunds WHERE order_id=p_order_id;
  IF FOUND THEN RETURN jsonb_build_object('success',true,'replayed',true,'refund',to_jsonb(previous)); END IF;
  INSERT INTO public.admin_order_refunds(request_id,order_id,amount,actor,reason,payment_reference)
    VALUES(p_request_id,p_order_id,p_amount,p_actor,left(p_reason,1000),'REFUND-'||p_order_id::text)
    ON CONFLICT DO NOTHING RETURNING request_id INTO reserved;
  IF reserved IS NULL THEN RETURN jsonb_build_object('success',false,'error','Idempotency key already used'); END IF;
  result:=public.transition_order_escrow(p_order_id,'refund',NULL,'admin:'||p_actor||':'||p_request_id::text);
  SELECT amount INTO credited_amount FROM public.payments
    WHERE transaction_ref='REFUND-'||p_order_id::text AND customer_id=o.customer_id AND method='refund' AND status='completed';
  IF credited_amount IS DISTINCT FROM p_amount::numeric THEN RAISE EXCEPTION 'Refund wallet credit could not be verified'; END IF;
  SELECT * INTO previous FROM public.admin_order_refunds WHERE request_id=p_request_id;
  RETURN jsonb_build_object('success',true,'replayed',coalesce((result->>'credited')::boolean,false)=false,'refund',to_jsonb(previous));
END $$;
REVOKE ALL ON FUNCTION public.admin_refund_order(uuid,uuid,integer,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_refund_order(uuid,uuid,integer,text,text) TO service_role;
