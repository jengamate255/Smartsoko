-- Create missing tables for the SmartSoko app (sellers, products, chats)

-- Sellers table (mirrors restaurants with extended fields)
CREATE TABLE IF NOT EXISTS sellers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  industry TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  delivery_fee INTEGER DEFAULT 0,
  delivery_time_minutes INTEGER DEFAULT 30,
  rating DECIMAL(3,2) DEFAULT 0.0,
  is_open BOOLEAN DEFAULT true,
  owner_id UUID REFERENCES profiles(id),
  phone TEXT,
  email TEXT,
  website TEXT,
  is_verified BOOLEAN DEFAULT false,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table (mirrors menu_items with extended fields)
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  compare_at_price INTEGER,
  category TEXT,
  subcategory TEXT,
  image_url TEXT,
  images TEXT[],
  is_available BOOLEAN DEFAULT true,
  stock INTEGER DEFAULT 0,
  sku TEXT,
  barcode TEXT,
  weight TEXT,
  unit TEXT,
  min_order INTEGER DEFAULT 1,
  max_order INTEGER,
  preparation_time_minutes INTEGER DEFAULT 10,
  allergens TEXT[],
  nutritional_info JSONB,
  ingredients TEXT[],
  tags TEXT[],
  rating DECIMAL(3,2) DEFAULT 0.0,
  review_count INTEGER DEFAULT 0,
  sale_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chats table for messaging between customers, vendors, and drivers
CREATE TABLE IF NOT EXISTS chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  participant_1_id UUID REFERENCES profiles(id),
  participant_2_id UUID REFERENCES profiles(id),
  participant_1_role TEXT DEFAULT 'customer',
  participant_2_role TEXT DEFAULT 'driver',
  last_message_text TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  unread_count_1 INTEGER DEFAULT 0,
  unread_count_2 INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id),
  sender_role TEXT,
  text TEXT NOT NULL,
  image_url TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sellers_category ON sellers(category);
CREATE INDEX IF NOT EXISTS idx_sellers_is_open ON sellers(is_open);
CREATE INDEX IF NOT EXISTS idx_sellers_owner ON sellers(owner_id);
CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_available ON products(is_available);
CREATE INDEX IF NOT EXISTS idx_products_name ON products USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_chats_order ON chats(order_id);
CREATE INDEX IF NOT EXISTS idx_chats_participant1 ON chats(participant_1_id);
CREATE INDEX IF NOT EXISTS idx_chats_participant2 ON chats(participant_2_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);

-- Enable RLS
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for sellers
DROP POLICY IF EXISTS "Anyone can view open sellers" ON sellers;
CREATE POLICY "Anyone can view open sellers" ON sellers FOR SELECT USING (is_open = true);
DROP POLICY IF EXISTS "Owners can manage their sellers" ON sellers;
CREATE POLICY "Owners can manage their sellers" ON sellers FOR ALL USING (auth.uid() = owner_id);

-- RLS policies for products
DROP POLICY IF EXISTS "Anyone can view available products" ON products;
CREATE POLICY "Anyone can view available products" ON products FOR SELECT USING (is_available = true);
DROP POLICY IF EXISTS "Sellers can manage their products" ON products;
CREATE POLICY "Sellers can manage their products" ON products FOR ALL USING (
  seller_id IN (SELECT id FROM sellers WHERE owner_id = auth.uid())
);

-- RLS policies for chats
DROP POLICY IF EXISTS "Participants can view chats" ON chats;
CREATE POLICY "Participants can view chats" ON chats FOR SELECT USING (
  auth.uid() = participant_1_id OR auth.uid() = participant_2_id
);
DROP POLICY IF EXISTS "Participants can update chats" ON chats;
CREATE POLICY "Participants can update chats" ON chats FOR UPDATE USING (
  auth.uid() = participant_1_id OR auth.uid() = participant_2_id
);

-- RLS policies for chat messages
DROP POLICY IF EXISTS "Participants can view messages" ON chat_messages;
CREATE POLICY "Participants can view messages" ON chat_messages FOR SELECT USING (
  chat_id IN (SELECT id FROM chats WHERE participant_1_id = auth.uid() OR participant_2_id = auth.uid())
);
DROP POLICY IF EXISTS "Participants can send messages" ON chat_messages;
CREATE POLICY "Participants can send messages" ON chat_messages FOR INSERT WITH CHECK (
  chat_id IN (SELECT id FROM chats WHERE participant_1_id = auth.uid() OR participant_2_id = auth.uid())
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_sellers_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ language 'plpgsql';
DROP TRIGGER IF EXISTS update_sellers_updated_at_trigger ON sellers;
CREATE TRIGGER update_sellers_updated_at_trigger BEFORE UPDATE ON sellers FOR EACH ROW EXECUTE FUNCTION update_sellers_updated_at();

CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ language 'plpgsql';
DROP TRIGGER IF EXISTS update_products_updated_at_trigger ON products;
CREATE TRIGGER update_products_updated_at_trigger BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_products_updated_at();

CREATE OR REPLACE FUNCTION update_chats_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ language 'plpgsql';
DROP TRIGGER IF EXISTS update_chats_updated_at_trigger ON chats;
CREATE TRIGGER update_chats_updated_at_trigger BEFORE UPDATE ON chats FOR EACH ROW EXECUTE FUNCTION update_chats_updated_at();
