create table public.merchant_payout_accounts (
  id uuid primary key references public.sellers(id),
  method text not null check(method in ('mobile_money','bank_transfer')),
  account_name text not null,
  phone_number text,
  bank_name text,
  account_number text,
  status text not null default 'pending' check(status in ('pending','verified')),
  revision integer not null default 1,
  verified_by text,
  verified_at timestamptz,
  updated_at timestamptz not null default now(),
  check((method='mobile_money' and phone_number is not null) or
        (method='bank_transfer' and bank_name is not null and account_number is not null))
);
alter table public.merchant_payout_accounts enable row level security;
revoke all on public.merchant_payout_accounts from anon,authenticated;
grant all on public.merchant_payout_accounts to service_role;

create function public.invalidate_payout_account_verification() returns trigger
language plpgsql set search_path=public,pg_temp as $$
begin
  if tg_op='INSERT' then
    new.status:='pending'; new.revision:=1; new.verified_by:=null; new.verified_at:=null;
  elsif row(new.method,new.account_name,new.phone_number,new.bank_name,new.account_number)
    is distinct from row(old.method,old.account_name,old.phone_number,old.bank_name,old.account_number) then
    new.status:='pending'; new.revision:=old.revision+1; new.verified_by:=null; new.verified_at:=null;
  end if;
  new.updated_at:=now();
  return new;
end $$;
create trigger invalidate_payout_account_verification before insert or update on public.merchant_payout_accounts
for each row execute function public.invalidate_payout_account_verification();

create function public.verify_merchant_payout_account(p_merchant_id uuid,p_revision integer,p_actor text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare account public.merchant_payout_accounts%rowtype;
begin
  select * into account from public.merchant_payout_accounts where id=p_merchant_id for update;
  if not found or account.revision is distinct from p_revision then raise exception 'Payout details changed; review again'; end if;
  if nullif(btrim(p_actor),'') is null then raise exception 'Reviewer required'; end if;
  update public.merchant_payout_accounts set status='verified',verified_by=p_actor,verified_at=now() where id=p_merchant_id;
  return jsonb_build_object('success',true,'merchantId',p_merchant_id,'revision',account.revision,'status','verified');
end $$;

create function public.complete_verified_vendor_payout(
  p_payout_id uuid,p_merchant_id uuid,p_revision integer,p_transaction_ref text,p_note text default null
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare account public.merchant_payout_accounts%rowtype; payout public.vendor_payouts%rowtype; result jsonb;
begin
  select * into account from public.merchant_payout_accounts where id=p_merchant_id for update;
  if not found or account.status<>'verified' or account.revision is distinct from p_revision then
    raise exception 'Current payout details must be verified before recording a transfer';
  end if;
  select * into payout from public.vendor_payouts where id=p_payout_id for update;
  if not found then raise exception 'Payout not found'; end if;
  if payout.wallet_id is distinct from p_merchant_id::text and not exists(
    select 1 from public.sellers s join public.vendors v on v.profile_id=s.owner_id
    where s.id=p_merchant_id and v.restaurant_id::text=payout.wallet_id
  ) then raise exception 'Payout does not belong to this merchant'; end if;
  result:=public.complete_vendor_payout(p_payout_id,p_transaction_ref,'paid',p_note);
  if (result->>'success')::boolean then
    update public.vendor_payouts set method=account.method,destination=jsonb_build_object(
      'merchantId',p_merchant_id,'revision',account.revision,'accountName',account.account_name,
      'phoneNumber',account.phone_number,'bankName',account.bank_name,'accountNumber',account.account_number,
      'verifiedBy',account.verified_by,'verifiedAt',account.verified_at)::text where id=p_payout_id;
  end if;
  return result;
end $$;
revoke all on function public.verify_merchant_payout_account(uuid,integer,text) from public,anon,authenticated;
revoke all on function public.complete_verified_vendor_payout(uuid,uuid,integer,text,text) from public,anon,authenticated;
revoke all on function public.invalidate_payout_account_verification() from public,anon,authenticated;
grant execute on function public.verify_merchant_payout_account(uuid,integer,text) to service_role;
grant execute on function public.complete_verified_vendor_payout(uuid,uuid,integer,text,text) to service_role;
