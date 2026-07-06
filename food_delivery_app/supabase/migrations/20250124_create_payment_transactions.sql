-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  transaction_ref VARCHAR(100) UNIQUE NOT NULL,
  mpesa_conversation_id VARCHAR(100),
  mpesa_transaction_id VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, completed, failed, cancelled
  response_code VARCHAR(50),
  response_description TEXT,
  provider VARCHAR(20) NOT NULL DEFAULT 'mpesa', -- mpesa, card, cash
  callback_received_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX idx_payment_transactions_customer_id ON payment_transactions(customer_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_mpesa_conversation_id ON payment_transactions(mpesa_conversation_id);
CREATE INDEX idx_payment_transactions_transaction_ref ON payment_transactions(transaction_ref);

-- Add RLS policies
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Customers can view their own transactions
CREATE POLICY "Customers can view own transactions"
  ON payment_transactions
  FOR SELECT
  USING (auth.uid() = customer_id);

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role has full access"
  ON payment_transactions
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Add payment_status and payment_method to orders table if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'payment_status') THEN
    ALTER TABLE orders ADD COLUMN payment_status VARCHAR(20) DEFAULT 'pending';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'payment_method') THEN
    ALTER TABLE orders ADD COLUMN payment_method VARCHAR(20);
  END IF;
END $$;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE payment_transactions IS 'Stores payment transaction records for M-Pesa and other payment providers';
