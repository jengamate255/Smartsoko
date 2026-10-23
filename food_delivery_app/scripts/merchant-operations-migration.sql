-- Persist the merchant's default reorder threshold. Existing products and
-- orders are unchanged; the default is the previous application default.
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS min_stock integer NOT NULL DEFAULT 5
  CHECK (min_stock >= 0 AND min_stock <= 10000);
