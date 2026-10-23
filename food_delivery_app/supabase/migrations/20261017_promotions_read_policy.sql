-- SmartSoko — promo codes are read straight from Supabase by the Flutter app
-- using the anon key, but `promotions` has RLS enabled with *no* policies, so
-- anon SELECT returns an empty set:
--
--   GET /rest/v1/promotions?select=id&limit=1   ->  []   (with the anon key)
--
-- This adds a narrow, read-only policy for active promos. Writes stay
-- service_role-only, which is how lib/server-db.js manages them today.
--
-- NOTE: this deliberately creates NO tables. An earlier draft of this
-- migration created `promo_codes` and `riders`; both were dropped as
-- redundant:
--   * promo codes  -> the existing `promotions` table (see the
--                     TABLE_FIELD_MAP.promotions overrides in lib/server-db.js).
--   * rider/riders -> the existing `drivers` + `driver_locations` tables.

drop policy if exists "promotions active read" on public.promotions;
create policy "promotions active read"
  on public.promotions
  for select
  to anon, authenticated
  using (is_active = true);
