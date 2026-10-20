-- 20261018120000_wallet_layer_rebuild.sql
--
-- Rebuild the wallet layer against the *deployed* schema.
--
-- The wallet/escrow SQL written in 002/003/005/006/007 assumes a normalized
-- schema: `wallets.user_id` as the owner key, snake_case `transactions` rows
-- carrying order_id/balance_before/balance_after/reference, and uuid ids
-- everywhere. The deployed tables are still the Firebase-era shapes:
-- `wallets.id` is the owner key (text), `transactions` is camelCase with a uuid
-- `userId` and no order/balance columns. So every money function failed with
--   42703: column "user_id" does not exist
-- and a text driver id (orders.driver_id, e.g. 'test-driver-002') could never
-- satisfy a `uuid` parameter.
--
-- This migration makes the deployed schema usable rather than rewriting every
-- caller:
--   * wallets gains the account columns the API expects (role, currency,
--     pending_balance, total_withdrawn). `id` stays the owner key.
--   * wallet_transactions is the snake_case ledger the wallet functions were
--     written for. `transactions` (Firebase-era, read by the web driver app) is
--     left untouched.
--   * vendor_payouts gains order_id/wallet_id, so a released escrow can be
--     tracked as one pending manual disbursement per order.
--   * credit_wallet/debit_wallet are recreated taking TEXT owner ids and
--     double-precision amounts, and provision the wallet on demand.
--
-- The read-only summary functions (get_*_wallet*, settle_delivery, …) that
-- still reference wallets.user_id are dead code — nothing calls them — and are
-- deliberately left alone; the money path lives in
-- server/src/services/escrow.js on top of the primitives below.

-- ── wallets ────────────────────────────────────────────────────────────────
alter table public.wallets
  add column if not exists role text,
  add column if not exists currency text not null default 'TZS',
  add column if not exists pending_balance double precision not null default 0,
  add column if not exists total_withdrawn double precision not null default 0;

comment on column public.wallets.id is
  'Wallet owner id: profiles.id (customer), restaurants.id (merchant) or a driver id. TEXT because driver ids are Firebase-style and not always uuids.';
comment on column public.wallets.role is 'customer | merchant | driver (informational)';

-- Old rows have no role, so NULL has to stay allowed.
do $$
begin
  alter table public.wallets
    add constraint wallets_role_check
    check (role is null or role in ('customer', 'merchant', 'driver', 'admin'));
exception
  when duplicate_object then null;
end $$;

-- ── wallet_transactions: the ledger the wallet functions expect ────────────
create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id text not null references public.wallets (id) on delete cascade,
  order_id uuid,
  vendor_payout_id uuid,
  type text not null,
  amount double precision not null,
  balance_before double precision,
  balance_after double precision,
  description text not null default '',
  status text not null default 'completed',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create index if not exists wallet_transactions_wallet_created_idx
  on public.wallet_transactions (wallet_id, created_at desc);
create index if not exists wallet_transactions_order_idx
  on public.wallet_transactions (order_id) where order_id is not null;

-- One credit of a given type per order per wallet: a retried escrow release
-- must never pay the same seller (escrow_release) or driver (delivery_fee) twice.
create unique index if not exists wallet_transactions_order_type_key
  on public.wallet_transactions (wallet_id, order_id, type) where order_id is not null;

alter table public.wallet_transactions enable row level security;

-- ── vendor_payouts: link a disbursement back to its order and its wallet ───
alter table public.vendor_payouts
  add column if not exists order_id uuid,
  add column if not exists wallet_id text;

create index if not exists vendor_payouts_order_idx
  on public.vendor_payouts (order_id) where order_id is not null;
create index if not exists vendor_payouts_wallet_idx
  on public.vendor_payouts (wallet_id) where wallet_id is not null;

-- ── wallet primitives ──────────────────────────────────────────────────────
-- The uuid-parameter versions cannot be replaced in place (that is a different
-- signature), so they are dropped. Their callers (settle_delivery,
-- get_driver_wallet_summary, the smartmove-matching edge function) were already
-- failing on wallets.user_id and pass uuid strings, which the TEXT versions
-- accept unchanged.
drop function if exists public.credit_wallet(uuid, integer, uuid, text, text, jsonb);
drop function if exists public.debit_wallet(uuid, integer, uuid, text, text, jsonb);
drop function if exists public.create_wallet(uuid, text);

-- Provision a wallet on demand. Idempotent: an existing wallet keeps its
-- balance and only has a missing role filled in.
create or replace function public.ensure_wallet(p_user_id text, p_role text default null)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_user_id is null or btrim(p_user_id) = '' then
    raise exception 'ensure_wallet: user id is required';
  end if;
  insert into public.wallets (id, balance, role, currency, total_earned, total_deliveries, updated_at)
  values (p_user_id, 0, p_role, 'TZS', 0, 0, now())
  on conflict (id) do nothing;
  update public.wallets
     set role = p_role, updated_at = now()
   where id = p_user_id and role is null and p_role is not null;
  return p_user_id;
end;
$$;

-- Credit a wallet and record the movement in one transaction. Returns
-- {success, duplicate, balance_before, balance_after}; `duplicate` means the
-- (wallet, order, type) movement already happened and nothing was changed.
create or replace function public.credit_wallet(
  p_user_id text,
  p_amount double precision,
  p_order_id uuid default null,
  p_type text default 'credit',
  p_description text default '',
  p_metadata jsonb default '{}'::jsonb,
  p_role text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_before double precision;
  v_after double precision;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'credit_wallet: amount must be positive (got %)', p_amount;
  end if;
  perform public.ensure_wallet(p_user_id, p_role);

  if p_order_id is not null and exists (
      select 1 from public.wallet_transactions
       where wallet_id = p_user_id and order_id = p_order_id and type = p_type
  ) then
    return jsonb_build_object('success', false, 'duplicate', true,
      'wallet_id', p_user_id, 'order_id', p_order_id, 'type', p_type);
  end if;

  select balance into v_before from public.wallets where id = p_user_id for update;
  v_after := coalesce(v_before, 0) + p_amount;

  update public.wallets
     set balance = v_after,
         total_earned = coalesce(total_earned, 0) + p_amount,
         updated_at = now()
   where id = p_user_id;

  insert into public.wallet_transactions
    (wallet_id, order_id, type, amount, balance_before, balance_after, description, status, metadata)
  values
    (p_user_id, p_order_id, p_type, p_amount, coalesce(v_before, 0), v_after,
     coalesce(p_description, ''), 'completed', coalesce(p_metadata, '{}'::jsonb));

  return jsonb_build_object('success', true, 'wallet_id', p_user_id, 'amount', p_amount,
    'balance_before', coalesce(v_before, 0), 'balance_after', v_after,
    'order_id', p_order_id, 'type', p_type);
end;
$$;

-- Debit a wallet, refusing to go below zero. `duplicate` behaves as above.
create or replace function public.debit_wallet(
  p_user_id text,
  p_amount double precision,
  p_order_id uuid default null,
  p_type text default 'debit',
  p_description text default '',
  p_metadata jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_before double precision;
  v_after double precision;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'debit_wallet: amount must be positive (got %)', p_amount;
  end if;
  perform public.ensure_wallet(p_user_id, null);

  if p_order_id is not null and exists (
      select 1 from public.wallet_transactions
       where wallet_id = p_user_id and order_id = p_order_id and type = p_type
  ) then
    return jsonb_build_object('success', false, 'duplicate', true,
      'wallet_id', p_user_id, 'order_id', p_order_id, 'type', p_type);
  end if;

  select balance into v_before from public.wallets where id = p_user_id for update;
  if coalesce(v_before, 0) < p_amount then
    raise exception 'debit_wallet: insufficient balance for % (balance %, requested %)',
      p_user_id, coalesce(v_before, 0), p_amount;
  end if;

  v_after := coalesce(v_before, 0) - p_amount;

  update public.wallets
     set balance = v_after, updated_at = now()
   where id = p_user_id;

  insert into public.wallet_transactions
    (wallet_id, order_id, type, amount, balance_before, balance_after, description, status, metadata)
  values
    (p_user_id, p_order_id, p_type, p_amount, coalesce(v_before, 0), v_after,
     coalesce(p_description, ''), 'completed', coalesce(p_metadata, '{}'::jsonb));

  return jsonb_build_object('success', true, 'wallet_id', p_user_id, 'amount', p_amount,
    'balance_before', coalesce(v_before, 0), 'balance_after', v_after);
end;
$$;

create or replace function public.create_wallet(p_user_id text, p_role text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.ensure_wallet(p_user_id, p_role);
  return jsonb_build_object('success', true, 'wallet_id', p_user_id, 'role', p_role);
end;
$$;

-- Mark a vendor_payouts row as disbursed (or failed/rejected) and, on success,
-- draw the money out of the payee's wallet so the balance and the outstanding
-- payout can never both be spent.
create or replace function public.complete_vendor_payout(
  p_payout_id uuid,
  p_transaction_ref text default null,
  p_status text default 'paid',
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payout public.vendor_payouts%rowtype;
  v_wallet text;
  v_before double precision;
  v_after double precision;
begin
  select * into v_payout from public.vendor_payouts where id = p_payout_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'payout not found');
  end if;
  if v_payout.status in ('paid', 'completed') then
    return jsonb_build_object('success', false, 'error', 'payout already ' || v_payout.status);
  end if;
  if p_status not in ('paid', 'processing', 'failed', 'rejected') then
    return jsonb_build_object('success', false, 'error', 'unsupported status ' || p_status);
  end if;

  if p_status = 'paid' then
    v_wallet := coalesce(v_payout.wallet_id, v_payout.vendor_id::text);
    if v_wallet is null then
      return jsonb_build_object('success', false, 'error', 'payout has no wallet to debit');
    end if;
    perform public.ensure_wallet(v_wallet, 'merchant');
    select balance into v_before from public.wallets where id = v_wallet for update;
    v_after := coalesce(v_before, 0) - v_payout.amount;

    update public.wallets
       set balance = v_after,
           total_withdrawn = coalesce(total_withdrawn, 0) + v_payout.amount,
           updated_at = now()
     where id = v_wallet;

    insert into public.wallet_transactions
      (wallet_id, order_id, vendor_payout_id, type, amount, balance_before, balance_after,
       description, status, metadata)
    values
      (v_wallet, v_payout.order_id, v_payout.id, 'payout', v_payout.amount,
       coalesce(v_before, 0), v_after,
       coalesce(p_note, 'Vendor payout disbursed'), 'completed',
       jsonb_build_object('payout_id', v_payout.id, 'transaction_ref', p_transaction_ref,
                          'vendor_id', v_payout.vendor_id));
  end if;

  update public.vendor_payouts
     set status = p_status,
         transaction_ref = coalesce(p_transaction_ref, transaction_ref),
         processed_at = case when p_status in ('paid', 'failed', 'rejected') then now() else processed_at end,
         failure_reason = case when p_status in ('failed', 'rejected') then p_note else failure_reason end,
         updated_at = now()
   where id = p_payout_id;

  return jsonb_build_object('success', true, 'payout_id', p_payout_id, 'status', p_status,
    'wallet_id', v_wallet, 'balance_after', v_after,
    'overdrawn', case when v_after is not null and v_after < 0 then true else false end);
end;
$$;

-- ── privileges: the money primitives are service-role only ─────────────────
revoke all on function public.ensure_wallet(text, text) from public, anon, authenticated;
revoke all on function public.credit_wallet(text, double precision, uuid, text, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.debit_wallet(text, double precision, uuid, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.create_wallet(text, text) from public, anon, authenticated;
revoke all on function public.complete_vendor_payout(uuid, text, text, text) from public, anon, authenticated;

grant execute on function public.ensure_wallet(text, text) to service_role;
grant execute on function public.credit_wallet(text, double precision, uuid, text, text, jsonb, text) to service_role;
grant execute on function public.debit_wallet(text, double precision, uuid, text, text, jsonb) to service_role;
grant execute on function public.create_wallet(text, text) to service_role;
grant execute on function public.complete_vendor_payout(uuid, text, text, text) to service_role;
