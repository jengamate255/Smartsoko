-- Run as a database owner/service-role test session. Every fixture rolls back.
begin;
do $$
declare
  oid uuid := gen_random_uuid(); cancelled uuid := gen_random_uuid();
  invalid uuid := gen_random_uuid(); seller uuid := gen_random_uuid();
  driver text := 'finance-probe-' || gen_random_uuid()::text;
  customer uuid; result jsonb; payout uuid;
begin
  select id into customer from public.profiles limit 1;
  insert into public.orders(id,items,subtotal,total,total_paid,delivery_fee,non_refundable_fee,tax,
    status,payment_status,payment_method,escrow_status,restaurant_id,driver_id)
  values(oid,'[]',3000,5540,5540,2000,540,540,'delivered','paid','pesapal','held',seller,driver);
  result := public.transition_order_escrow(oid,'release');
  assert (result->>'released')::boolean, 'release failed';
  assert (select balance=3000 from public.wallets where id=seller::text), 'seller credit';
  assert (select balance=2000 from public.wallets where id=driver), 'text driver credit';
  result := public.transition_order_escrow(oid,'release');
  assert not (result->>'released')::boolean, 'duplicate release';
  assert (select count(*)=2 from public.wallet_transactions where order_id=oid), 'duplicate ledger';
  assert (select count(*)=1 from public.vendor_payouts where order_id=oid), 'duplicate payout';
  result := public.transition_order_escrow(oid,'refund');
  assert not (result->>'refunded')::boolean, 'refund after release';
  select id into payout from public.vendor_payouts where order_id=oid;
  result := public.complete_vendor_payout(payout,'SQL-PROBE','paid');
  assert (result->>'success')::boolean, 'payout completion';
  assert (select balance=0 and total_withdrawn=3000 from public.wallets where id=seller::text), 'payout debit';
  result := public.complete_vendor_payout(payout,'SQL-PROBE-REPLAY','paid');
  assert not (result->>'success')::boolean, 'duplicate payout debit';

  insert into public.orders(id,items,subtotal,total,delivery_fee,non_refundable_fee,tax,customer_id,
    status,payment_status,payment_method,escrow_status)
  values(cancelled,'[]',3000,5540,2000,540,540,customer,'cancelled','failed','pesapal','pending');
  result := public.transition_order_escrow(cancelled,'hold',5540);
  assert (result->>'cancelled')::boolean, 'late payment detection';
  assert (select escrow_status='refunded' and payment_status='refunded' from public.orders where id=cancelled), 'late payment refund';
  assert (select count(*)=1 from public.payments where transaction_ref='REFUND-' || cancelled::text), 'refund credit';
  perform public.transition_order_escrow(cancelled,'refund');
  assert (select count(*)=1 from public.payments where transaction_ref='REFUND-' || cancelled::text), 'refund replay';

  insert into public.orders(id,items,subtotal,total,total_paid,delivery_fee,non_refundable_fee,tax,
    status,payment_status,payment_method,escrow_status,restaurant_id)
  values(invalid,'[]',3000,5540,5540,2000,540,540,'delivered','paid','pesapal','held',gen_random_uuid());
  begin
    perform public.transition_order_escrow(invalid,'release');
    raise exception using errcode='ZX001',message='missing driver was accepted';
  exception when raise_exception then null;
  end;
  assert (select escrow_status='held' from public.orders where id=invalid), 'failed release state';
  assert not exists(select 1 from public.wallet_transactions where order_id=invalid), 'partial credit';
  assert not exists(select 1 from public.vendor_payouts where order_id=invalid), 'partial payout';
  assert not has_function_privilege('anon','public.transition_order_escrow(uuid,text,integer,text)','EXECUTE'), 'anonymous mutation';
  assert not has_function_privilege('authenticated','public.credit_wallet(text,double precision,uuid,text,text,jsonb,text)','EXECUTE'), 'client mutation';
end $$;
rollback;
