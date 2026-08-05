-- Create index on orders.created_at for faster sorting/pagination
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Also add index for common filter patterns
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_seller_created_at ON orders(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_created_at ON orders(customer_id, created_at DESC);