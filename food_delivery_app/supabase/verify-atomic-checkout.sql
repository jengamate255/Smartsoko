-- Read-only verification after applying the atomic checkout migration.
SELECT t.tgname, t.tgenabled FROM pg_trigger t
WHERE t.tgrelid = 'public.orders'::regclass
  AND t.tgname IN ('reserve_checkout_stock','release_checkout_stock','protect_reserved_order');

SELECT role_name,
  has_table_privilege(role_name, 'public.orders', 'INSERT') AS can_insert,
  has_any_column_privilege(role_name, 'public.orders', 'UPDATE') AS can_update,
  has_table_privilege(role_name, 'public.orders', 'DELETE') AS can_delete,
  has_function_privilege(role_name, 'public.apply_inventory_movement(jsonb)', 'EXECUTE') AS can_adjust_stock
FROM (VALUES ('anon'),('authenticated'),('service_role')) r(role_name);
-- Expect all client write values false; service_role values true.

SELECT p.oid::regprocedure AS function_name,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN (
  'confirm_payment_escrow','confirm_delivery_release','customer_pay_from_wallet',
  'create_topup_order','complete_wallet_topup','refund_order_to_wallet',
  'process_customer_refund','process_refund','settle_delivery',
  'settle_all_delivered_orders','credit_wallet','debit_wallet',
  'topup_wallet_balance','deduct_wallet_balance','auto_assign_driver'
);
-- Expect both columns false for every listed RPC.
