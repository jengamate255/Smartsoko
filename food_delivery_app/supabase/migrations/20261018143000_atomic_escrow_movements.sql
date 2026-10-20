-- Serialize escrow transitions on the order row. All state and money writes
-- commit together, including refunds and the manual payout instruction.
create unique index if not exists vendor_payouts_order_unique
  on public.vendor_payouts(order_id) where order_id is not null;

-- Wallet idempotency checks must run after acquiring the wallet lock.
do $$
declare signature text; definition text;
begin
  foreach signature in array array[
    'public.credit_wallet(text,double precision,uuid,text,text,jsonb,text)',
    'public.debit_wallet(text,double precision,uuid,text,text,jsonb)'
  ] loop
    definition := pg_get_functiondef(signature::regprocedure);
    definition := replace(definition,
      '  if p_order_id is not null and exists (',
      '  perform 1 from public.wallets where id = p_user_id for update;
  if p_order_id is not null and exists (');
    definition := replace(definition, 'p_amount <= 0 then',
      'p_amount <= 0 or p_amount in (''NaN''::float8, ''Infinity''::float8, ''-Infinity''::float8) then');
    execute definition;
  end loop;
end $$;

-- Clients must not edit balances directly, even on their own wallet.
drop policy if exists "Users can update own wallet" on public.wallets;

create or replace function public.transition_order_escrow(
  p_order_id uuid, p_action text, p_amount integer default null,
  p_reference text default ''
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  o public.orders%rowtype;
  paid integer; seller integer; driver integer; platform integer;
  split jsonb; vendor uuid; payout public.vendor_payouts%rowtype;
  credited boolean := false; refund_amount integer;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then
    return jsonb_build_object(case p_action when 'hold' then 'held' when 'release' then 'released' else 'refunded' end,
      false, 'reason', 'order_not_found');
  end if;
  if p_action not in ('hold','release','refund') or p_action is null then
    raise exception 'Unsupported escrow action';
  end if;

  if p_action = 'hold' then
    if o.escrow_status in ('released','refunded','disputed') then
      return jsonb_build_object('held',false,'reason','already ' || o.escrow_status);
    end if;
    if p_amount is null or p_amount <= 0 or p_amount <> o.total then
      raise exception 'Collected amount does not match order total';
    end if;
    paid := p_amount;
  else
    paid := o.total_paid;
  end if;
  platform := coalesce(o.non_refundable_fee,0);
  driver := coalesce(o.delivery_fee,0);
  seller := paid - platform - driver;
  split := jsonb_build_object('paid',paid,'seller',seller,'driver',driver,'platform',platform);

  if p_action = 'hold' then
    if seller < 0 or driver < 0 or platform < 0 then raise exception 'Invalid escrow split'; end if;
    if not exists(select 1 from public.escrow_holds where order_id=p_order_id) then
      insert into public.escrow_holds(order_id,total_amount,seller_amount,driver_amount,platform_amount,status)
      values(p_order_id,paid,seller,driver,platform,'held');
    end if;
    update public.orders set payment_status='paid',total_paid=paid,escrow_status='held',updated_at=now()
      where id=p_order_id;
    -- Use the locked row, not a caller's stale status snapshot.
    if lower(o.status) in ('cancelled','canceled') then
      perform public.transition_order_escrow(p_order_id,'refund',null,'late payment on cancelled order');
    end if;
    return jsonb_build_object('held',true,'split',split,'cancelled',lower(o.status) in ('cancelled','canceled'));
  end if;

  if p_action = 'release' then
    if o.escrow_status is distinct from 'held' then
      return jsonb_build_object('released',false,'reason','escrow is ' || coalesce(o.escrow_status,'null'));
    end if;
    if lower(o.status) not in ('delivered','completed') or o.status is null then
      return jsonb_build_object('released',false,'reason','order not delivered');
    end if;
    if paid is null or paid <= 0 or seller < 0 or driver < 0 or platform < 0 then
      raise exception 'Invalid escrow split';
    end if;
    if o.restaurant_id is null then raise exception 'Missing seller account'; end if;
    if driver > 0 and nullif(o.driver_id,'') is null then raise exception 'Missing driver account'; end if;
    if seller > 0 then
      perform public.credit_wallet(o.restaurant_id::text,seller::float8,p_order_id,'escrow_release',
        'Order payment released',jsonb_build_object('orderId',p_order_id),'merchant');
      select id into vendor from public.vendors where restaurant_id=o.restaurant_id limit 1;
      insert into public.vendor_payouts(vendor_id,wallet_id,order_id,amount,method,status,requested_by)
        values(vendor,o.restaurant_id::text,p_order_id,seller,'manual','pending','escrow-release')
        on conflict (order_id) where order_id is not null do nothing;
      select * into payout from public.vendor_payouts where order_id=p_order_id;
    end if;
    if driver > 0 then
      perform public.credit_wallet(o.driver_id,driver::float8,p_order_id,'delivery_fee',
        'Delivery fee',jsonb_build_object('orderId',p_order_id),'driver');
    end if;
    if not exists(select 1 from public.escrow_holds where order_id=p_order_id) then
      insert into public.escrow_holds(order_id,total_amount,seller_amount,driver_amount,platform_amount,status)
        values(p_order_id,paid,seller,driver,platform,'held');
    end if;
    update public.escrow_holds set status='released',updated_at=now() where order_id=p_order_id and status='held';
    update public.orders set escrow_status='released',escrow_released_at=now(),updated_at=now() where id=p_order_id;
    return jsonb_build_object('released',true,'orderId',p_order_id,'split',split,'payout',to_jsonb(payout),'reason',p_reference);
  end if;

  -- Refund credit and terminal state are atomic. A retry can also repair a
  -- pre-migration refunded order whose payments-ledger insert failed.
  if o.escrow_status in ('released','disputed') then
    return jsonb_build_object('refunded',false,'reason','escrow already ' || o.escrow_status || ' to the seller');
  end if;
  if o.payment_status is distinct from 'paid' and o.escrow_status not in ('held','refunded') then
    return jsonb_build_object('refunded',false,'reason','nothing collected');
  end if;
  refund_amount := greatest(0,coalesce(paid,0)-platform);
  if o.refund_to_wallet is distinct from false and refund_amount > 0 then
    if o.customer_id is null then raise exception 'Missing customer wallet owner'; end if;
    if not exists(select 1 from public.payments where transaction_ref='REFUND-' || p_order_id::text) then
      insert into public.payments(order_id,customer_id,amount,method,status,transaction_ref,notes,metadata)
      values(p_order_id,o.customer_id,refund_amount,'refund','completed','REFUND-' || p_order_id::text,
        'Refund to wallet',jsonb_build_object('kind','refund','orderId',p_order_id,'reversedBy',p_reference));
      credited := true;
    end if;
  end if;
  update public.escrow_holds set status='refunded',updated_at=now() where order_id=p_order_id and status='held';
  update public.orders set escrow_status='refunded',payment_status='refunded',updated_at=now() where id=p_order_id;
  return jsonb_build_object('refunded',o.escrow_status is distinct from 'refunded' or credited,
    'orderId',p_order_id,'amount',refund_amount,'credited',credited,'reason','already refunded');
end;
$$;
revoke all on function public.transition_order_escrow(uuid,text,integer,text) from public,anon,authenticated;
grant execute on function public.transition_order_escrow(uuid,text,integer,text) to service_role;

-- Prevent the payout-completion RPC from overdrawing a wallet or processing
-- an unlinked legacy request. It must have a verified money-movement record.
do $$
declare definition text;
begin
  definition := pg_get_functiondef('public.complete_vendor_payout(uuid,text,text,text)'::regprocedure);
  definition := replace(definition, '  if p_status not in (', '  if p_status is null then raise exception ''Payout status required''; end if;
  if p_status not in (');
  definition := replace(definition, '    v_after := coalesce(v_before, 0) - v_payout.amount;',
    '    if v_payout.amount is null or v_payout.amount <= 0 or v_payout.amount in (''NaN''::float8,''Infinity''::float8,''-Infinity''::float8)
       or coalesce(v_before,0) < v_payout.amount then raise exception ''Insufficient or invalid payout balance''; end if;
    if nullif(btrim(p_transaction_ref),'''') is null then raise exception ''Disbursement reference required''; end if;
    v_after := coalesce(v_before, 0) - v_payout.amount;');
  execute definition;
end $$;
