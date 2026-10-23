-- A profile owning multiple stores is not enough to assign a restaurant
-- liability to one of them. Until an explicit store mapping is supplied, fail
-- closed rather than expose another store's earnings to tenant-scoped staff.
do $$
declare definition text; needle text;
begin
  definition := pg_get_functiondef('public.complete_verified_vendor_payout(uuid,uuid,integer,text,text)'::regprocedure);
  needle := 'where s.id=p_merchant_id and v.restaurant_id::text=payout.wallet_id';
  if position(needle in definition)=0 then raise exception 'Unexpected payout ownership function definition'; end if;
  definition := replace(definition,needle,
    needle || ' and (select count(*) from public.sellers owner_store where owner_store.owner_id=s.owner_id)=1');
  execute definition;
end $$;
