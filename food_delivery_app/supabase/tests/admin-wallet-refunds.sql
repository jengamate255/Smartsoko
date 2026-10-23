BEGIN;
DO $$
DECLARE oid uuid:='00000000-0000-4000-8000-000000000101'; other_id uuid:='00000000-0000-4000-8000-000000000102'; request uuid:=gen_random_uuid(); result jsonb; amount numeric;
BEGIN
  INSERT INTO public.orders(id,customer_id,total,total_paid,non_refundable_fee,delivery_fee,payment_status,escrow_status,status,refund_to_wallet)
    VALUES(oid,gen_random_uuid(),1000,1000,100,200,'paid','held','pending',true),
    (other_id,gen_random_uuid(),1000,1000,100,200,'paid','held','pending',true);
  INSERT INTO public.escrow_holds(order_id,total_amount,seller_amount,driver_amount,platform_amount,status) VALUES(oid,1000,700,200,100,'held');
  result:=public.admin_refund_order(oid,request,100,'admin-qa','partial unsupported');
  IF (result->>'success')::boolean THEN RAISE EXCEPTION 'Partial refund accepted'; END IF;
  result:=public.admin_refund_order(oid,request,900,'admin-qa','QA refund');
  IF NOT (result->>'success')::boolean THEN RAISE EXCEPTION 'Wallet refund failed: %',result; END IF;
  result:=public.admin_refund_order(oid,request,900,'admin-qa','retry');
  IF NOT (result->>'replayed')::boolean THEN RAISE EXCEPTION 'Same-key retry not replayed'; END IF;
  result:=public.admin_refund_order(oid,gen_random_uuid(),900,'admin-qa','new key retry');
  IF NOT (result->>'replayed')::boolean THEN RAISE EXCEPTION 'Different-key retry duplicated refund'; END IF;
  IF (SELECT count(*) FROM public.payments WHERE order_id=oid)<>1 OR (SELECT count(*) FROM public.admin_order_refunds WHERE order_id=oid)<>1 THEN RAISE EXCEPTION 'Duplicate wallet credit'; END IF;
  SELECT sum(p.amount) INTO amount FROM public.payments p WHERE order_id=oid;
  IF amount<>900 THEN RAISE EXCEPTION 'Non-refundable fee was refunded'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.orders WHERE id=oid AND escrow_status='refunded' AND payment_status='refunded') THEN RAISE EXCEPTION 'Refund state not committed'; END IF;
  result:=public.admin_refund_order(other_id,request,900,'admin-qa','reused key');
  IF (result->>'success')::boolean OR EXISTS(SELECT 1 FROM public.payments WHERE order_id=other_id) THEN RAISE EXCEPTION 'Key reuse moved another order money'; END IF;
  UPDATE public.orders SET escrow_status='released' WHERE id=other_id;
  result:=public.admin_refund_order(other_id,gen_random_uuid(),900,'admin-qa','released');
  IF (result->>'success')::boolean THEN RAISE EXCEPTION 'Released funds refunded'; END IF;
  UPDATE public.orders SET escrow_status=NULL,payment_status='pending',total_paid=NULL WHERE id=other_id;
  result:=public.admin_refund_order(other_id,gen_random_uuid(),900,'admin-qa','unpaid');
  IF (result->>'success')::boolean THEN RAISE EXCEPTION 'Unpaid order refunded'; END IF;
  IF has_function_privilege('authenticated','public.admin_refund_order(uuid,uuid,integer,text,text)','EXECUTE') OR has_table_privilege('anon','public.admin_order_refunds','SELECT') THEN RAISE EXCEPTION 'Refund security exposed'; END IF;
END $$;
ROLLBACK;
