-- Existing orders remain unreserved: never retroactively debit historical sales.
BEGIN;
ALTER TABLE public.orders ADD COLUMN stock_reserved boolean NOT NULL DEFAULT false;

CREATE FUNCTION public.reserve_checkout_stock() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  line record;
  product public.products%ROWTYPE;
  balance integer;
BEGIN
  -- Legacy wallet topups use an empty, non-merchandise order as a reference.
  IF NEW.order_type = 'wallet_topup' AND NEW.status = 'topup_pending'
     AND NEW.restaurant_id IS NULL AND NEW.items = '[]'::jsonb AND NEW.total > 0 THEN
    NEW.stock_reserved := false;
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM 'pending' OR jsonb_typeof(NEW.items) <> 'array'
     OR jsonb_array_length(NEW.items) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Invalid checkout' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.items) i
             WHERE coalesce(i->>'id', '') = '' OR
             coalesce(i->>'quantity', '') !~ '^[1-9][0-9]{0,4}$' OR
             (i->>'quantity')::numeric > 10000) THEN
    RAISE EXCEPTION 'Invalid checkout quantity' USING ERRCODE = 'P0001';
  END IF;
  -- Consistent product order prevents deadlocks for baskets with shared items.
  FOR line IN SELECT i->>'id' AS id, sum((i->>'quantity')::integer)::integer AS qty
              FROM jsonb_array_elements(NEW.items) i GROUP BY 1 ORDER BY 1 LOOP
    SELECT * INTO product FROM public.products WHERE id = line.id::uuid FOR UPDATE;
    IF NOT FOUND OR product.seller_id IS DISTINCT FROM NEW.restaurant_id
       OR product.is_available IS FALSE OR product.stock IS NULL
       OR product.stock < line.qty THEN
      RAISE EXCEPTION 'Product unavailable or insufficient stock' USING ERRCODE = 'P0001';
    END IF;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.items) i
               WHERE i->>'id' = line.id AND (i->>'price')::numeric IS DISTINCT FROM product.price) THEN
      RAISE EXCEPTION 'Catalog price changed; refresh your checkout' USING ERRCODE = 'P0001';
    END IF;
    UPDATE public.products SET stock = stock - line.qty, updated_at = now()
      WHERE id = product.id RETURNING stock INTO balance;
    INSERT INTO public.inventory_movements(merchant_id, product_id, delta, type, reason, ref_id, balance_after)
      VALUES(NEW.restaurant_id, line.id, -line.qty, 'sale', 'checkout reservation', NEW.id::text, balance);
  END LOOP;
  IF NEW.promo_code IS NOT NULL THEN
    UPDATE public.promotions SET usage_count = coalesce(usage_count, 0) + 1
      WHERE code = NEW.promo_code AND is_active IS TRUE
        AND (merchant_id IS NULL OR merchant_id = NEW.restaurant_id)
        AND (valid_from IS NULL OR valid_from <= now())
        AND (valid_until IS NULL OR valid_until > now())
        AND (usage_limit IS NULL OR coalesce(usage_count, 0) < usage_limit);
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Promotion is no longer available' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  NEW.stock_reserved := true;
  RETURN NEW;
END $$;

CREATE FUNCTION public.release_checkout_stock() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE line record; balance integer;
BEGIN
  -- Reservation contents and ownership cannot change after checkout.
  IF (NEW.items, NEW.restaurant_id, NEW.customer_id, NEW.promo_code, NEW.subtotal, NEW.delivery_fee, NEW.tax, NEW.discount_amount, NEW.total)
     IS DISTINCT FROM (OLD.items, OLD.restaurant_id, OLD.customer_id, OLD.promo_code, OLD.subtotal, OLD.delivery_fee, OLD.tax, OLD.discount_amount, OLD.total) THEN
    RAISE EXCEPTION 'Order contents are immutable' USING ERRCODE = 'P0001';
  END IF;
  IF lower(OLD.status) = 'cancelled' AND lower(NEW.status) IS DISTINCT FROM 'cancelled' THEN
    RAISE EXCEPTION 'Cancelled orders cannot reopen' USING ERRCODE = 'P0001';
  END IF;
  NEW.stock_reserved := OLD.stock_reserved;
  IF lower(NEW.status) = 'cancelled' AND OLD.stock_reserved THEN
    IF lower(OLD.status) IN ('delivered', 'completed', 'refunded') THEN
      RAISE EXCEPTION 'Fulfilled orders require a separate return' USING ERRCODE = 'P0001';
    END IF;
    FOR line IN SELECT i->>'id' AS id, sum((i->>'quantity')::integer)::integer AS qty
                FROM jsonb_array_elements(OLD.items) i GROUP BY 1 ORDER BY 1 LOOP
      UPDATE public.products SET stock = stock + line.qty, updated_at = now()
        WHERE id = line.id::uuid RETURNING stock INTO balance;
      IF NOT FOUND THEN RAISE EXCEPTION 'Reserved product is missing'; END IF;
      INSERT INTO public.inventory_movements(merchant_id, product_id, delta, type, reason, ref_id, balance_after)
        VALUES(OLD.restaurant_id, line.id, line.qty, 'return', 'checkout cancellation', OLD.id::text, balance);
    END LOOP;
    IF OLD.promo_code IS NOT NULL THEN
      UPDATE public.promotions SET usage_count = greatest(0, coalesce(usage_count, 0) - 1)
        WHERE code = OLD.promo_code;
    END IF;
    NEW.stock_reserved := false;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER reserve_checkout_stock BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.reserve_checkout_stock();
CREATE TRIGGER release_checkout_stock BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.release_checkout_stock();

CREATE FUNCTION public.protect_reserved_order() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF OLD.stock_reserved THEN RAISE EXCEPTION 'Cancel reserved orders before deleting them'; END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER protect_reserved_order BEFORE DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.protect_reserved_order();

-- The server uses this instead of a read/add/update sequence for adjustments.
CREATE FUNCTION public.apply_inventory_movement(entry jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE product public.products%ROWTYPE; movement_id uuid; balance integer; delta integer;
BEGIN
  IF coalesce(entry->>'delta', '') !~ '^-?[0-9]+$' THEN RAISE EXCEPTION 'Invalid inventory delta'; END IF;
  delta := (entry->>'delta')::integer;
  IF entry->>'type' IS NULL OR entry->>'type' NOT IN ('purchase_receive','sale','return','damage','adjustment','audit')
     OR (entry->>'type' = 'sale' AND delta >= 0)
     OR (entry->>'type' = 'purchase_receive' AND delta <= 0) THEN
    RAISE EXCEPTION 'Invalid inventory movement';
  END IF;
  SELECT * INTO product FROM public.products WHERE id = (entry->>'productId')::uuid FOR UPDATE;
  IF NOT FOUND OR product.seller_id::text IS DISTINCT FROM entry->>'merchantId' THEN
    RAISE EXCEPTION 'Product does not belong to merchant';
  END IF;
  balance := coalesce(product.stock, 0) + delta;
  IF balance < 0 THEN RAISE EXCEPTION 'Insufficient stock' USING ERRCODE = 'P0001'; END IF;
  UPDATE public.products SET stock = balance, updated_at = now() WHERE id = product.id;
  INSERT INTO public.inventory_movements(merchant_id, product_id, delta, type, reason, ref_id, balance_after, actor_id)
    VALUES(product.seller_id, product.id::text, delta, entry->>'type', entry->>'reason', entry->>'refId', balance, entry->>'actorId')
    RETURNING id INTO movement_id;
  RETURN jsonb_build_object('movementId', movement_id, 'newStock', balance);
END $$;

-- Clients must use authenticated server routes for authoritative order writes.
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.orders FROM PUBLIC, anon, authenticated;
-- Column grants survive a table-level REVOKE, so revoke those as well.
DO $$ DECLARE columns text; BEGIN
  SELECT string_agg(quote_ident(attname), ',') INTO columns FROM pg_attribute
    WHERE attrelid = 'public.orders'::regclass AND attnum > 0 AND NOT attisdropped;
  EXECUTE format('REVOKE INSERT (%s), UPDATE (%s), REFERENCES (%s) ON public.orders FROM PUBLIC, anon, authenticated', columns, columns, columns);
END $$;
REVOKE ALL ON FUNCTION public.reserve_checkout_stock(), public.release_checkout_stock(), public.protect_reserved_order(), public.apply_inventory_movement(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_checkout_stock(), public.release_checkout_stock(), public.protect_reserved_order(), public.apply_inventory_movement(jsonb) TO service_role;
-- Table REVOKEs do not stop SECURITY DEFINER RPCs from writing on a caller's
-- behalf. Existing money/order mutation RPCs are server-only as well.
DO $$ DECLARE fn record; BEGIN
  FOR fn IN SELECT p.oid::regprocedure AS signature FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN (
      'confirm_payment_escrow','confirm_delivery_release','customer_pay_from_wallet',
      'create_topup_order','complete_wallet_topup','refund_order_to_wallet',
      'process_customer_refund','process_refund','settle_delivery',
      'settle_all_delivered_orders','credit_wallet','debit_wallet',
      'topup_wallet_balance','deduct_wallet_balance','auto_assign_driver'
    ) LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.signature);
  END LOOP;
END $$;
NOTIFY pgrst, 'reload schema';
COMMIT;
