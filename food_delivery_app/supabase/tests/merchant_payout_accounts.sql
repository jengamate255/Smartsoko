-- Run as database owner. No fixture data or balances survive the rollback.
begin;
do $$
declare merchant uuid; payout uuid:=gen_random_uuid(); foreign_payout uuid:=gen_random_uuid(); result jsonb; baseline float8;
begin
  select s.id into merchant from public.sellers s
    where not exists(select 1 from public.merchant_payout_accounts a where a.id=s.id) limit 1;
  if merchant is null then raise exception 'No unused fixture merchant available'; end if;
  insert into public.merchant_payout_accounts(id,method,account_name,phone_number,status)
    values(merchant,'mobile_money','SQL TEST ONLY','+255712345678','verified');
  assert (select status='pending' and revision=1 from public.merchant_payout_accounts where id=merchant);
  perform public.credit_wallet(merchant::text,42,null,'probe_credit','temporary verification');
  select balance into baseline from public.wallets where id=merchant::text;
  insert into public.vendor_payouts(id,wallet_id,amount,method,status) values(payout,merchant::text,42,'manual','pending');
  begin
    perform public.complete_verified_vendor_payout(payout,merchant,1,'TEST');
    raise exception using errcode='ZX001',message='Unverified details accepted';
  exception when raise_exception then null; end;
  perform public.verify_merchant_payout_account(merchant,1,'test-admin');
  update public.merchant_payout_accounts set phone_number='+255712345679' where id=merchant;
  assert (select status='pending' and revision=2 and verified_at is null from public.merchant_payout_accounts where id=merchant);
  begin
    perform public.verify_merchant_payout_account(merchant,1,'test-admin');
    raise exception using errcode='ZX001',message='Stale revision accepted';
  exception when raise_exception then null; end;
  perform public.verify_merchant_payout_account(merchant,2,'test-admin');
  insert into public.vendor_payouts(id,wallet_id,amount,method,status) values(foreign_payout,gen_random_uuid()::text,42,'manual','pending');
  begin
    perform public.complete_verified_vendor_payout(foreign_payout,merchant,2,'TEST');
    raise exception using errcode='ZX001',message='Foreign wallet accepted';
  exception when raise_exception then null; end;
  result:=public.complete_verified_vendor_payout(payout,merchant,2,'TEST');
  assert (result->>'success')::boolean;
  assert (select balance=baseline-42 from public.wallets where id=merchant::text);
  assert (select destination::jsonb->>'phoneNumber'='+255712345679' from public.vendor_payouts where id=payout);
  assert not has_function_privilege('anon','public.verify_merchant_payout_account(uuid,integer,text)','execute');
  assert not has_table_privilege('authenticated','public.merchant_payout_accounts','UPDATE');
end $$;
rollback;
