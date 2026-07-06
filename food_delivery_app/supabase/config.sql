-- Food Delivery Database Schema for Supabase

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  phone TEXT UNIQUE,
  role TEXT DEFAULT 'customer', -- customer, restaurant_admin, driver, super_admin
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Restaurants table
CREATE TABLE restaurants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Menu items table
CREATE TABLE menu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  category TEXT,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  stock INTEGER DEFAULT 0,
  preparation_time_minutes INTEGER DEFAULT 10,
  allergens TEXT[], -- Array of allergens
  nutritional_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES profiles(id),
  restaurant_id UUID REFERENCES restaurants(id),
  driver_id UUID REFERENCES profiles(id),
  customer_name TEXT,
  customer_phone TEXT,
  delivery_address TEXT,
  delivery_latitude DECIMAL(10, 8),
  delivery_longitude DECIMAL(11, 8),
  items JSONB NOT NULL, -- Array of order items with quantities
  subtotal INTEGER NOT NULL,
  delivery_fee INTEGER DEFAULT 0,
  tax INTEGER DEFAULT 0,
  discount_amount INTEGER DEFAULT 0,
  total INTEGER NOT NULL,
  payment_method TEXT DEFAULT 'cash', -- cash, card, mobile_money
  payment_status TEXT DEFAULT 'pending', -- pending, paid, failed, refunded
  order_type TEXT DEFAULT 'now', -- now, scheduled
  scheduled_for TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending', -- pending, confirmed, preparing, ready, dispatched, out_for_delivery, delivered, cancelled
  special_instructions TEXT,
  promo_code TEXT,
  loyalty_points_earned INTEGER DEFAULT 0,
  estimated_delivery_time TIMESTAMP WITH TIME ZONE,
  actual_delivery_time TIMESTAMP WITH TIME ZONE,
  preparation_started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drivers table
CREATE TABLE drivers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) UNIQUE,
  vehicle_type TEXT, -- car, motorcycle, bicycle
  vehicle_number TEXT,
  vehicle_color TEXT,
  license_plate TEXT,
  current_latitude DECIMAL(10, 8),
  current_longitude DECIMAL(11, 8),
  status TEXT DEFAULT 'offline', -- online, offline, busy, on_break
  current_order_id UUID REFERENCES orders(id),
  rating DECIMAL(3,2) DEFAULT 0.0,
  total_deliveries INTEGER DEFAULT 0,
  total_earnings INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Promotions table
CREATE TABLE promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT,
  description TEXT,
  discount_type TEXT DEFAULT 'percentage', -- percentage, fixed_amount, free_delivery
  discount_value INTEGER NOT NULL,
  min_order_amount INTEGER DEFAULT 0,
  max_discount_amount INTEGER,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  applicable_restaurants UUID[] REFERENCES restaurants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Loyalty points table
CREATE TABLE loyalty_points (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES profiles(id),
  order_id UUID REFERENCES orders(id),
  points_earned INTEGER NOT NULL,
  points_spent INTEGER DEFAULT 0,
  transaction_type TEXT NOT NULL, -- earned, spent, expired
  description TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order tracking table
CREATE TABLE order_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  location_latitude DECIMAL(10, 8),
  location_longitude DECIMAL(11, 8),
  notes TEXT,
  driver_id UUID REFERENCES profiles(id)
);

-- Reviews and ratings table
CREATE TABLE reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  customer_id UUID REFERENCES profiles(id),
  restaurant_id UUID REFERENCES restaurants(id),
  driver_id UUID REFERENCES profiles(id),
  restaurant_rating INTEGER CHECK (restaurant_rating >= 1 AND restaurant_rating <= 5),
  driver_rating INTEGER CHECK (driver_rating >= 1 AND driver_rating <= 5),
  food_quality_rating INTEGER CHECK (food_quality_rating >= 1 AND food_quality_rating <= 5),
  delivery_time_rating INTEGER CHECK (delivery_time_rating >= 1 AND delivery_time_rating <= 5),
  comment TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat/messages table
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  sender_id UUID REFERENCES profiles(id),
  receiver_id UUID REFERENCES profiles(id),
  message_type TEXT DEFAULT 'text', -- text, image, location
  content TEXT NOT NULL,
  attachment_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Delivery zones table
CREATE TABLE delivery_zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  polygon JSONB NOT NULL, -- GeoJSON polygon for delivery area
  base_delivery_fee INTEGER DEFAULT 0,
  free_delivery_above INTEGER,
  estimated_time_minutes INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_menu_items_restaurant_id ON menu_items(restaurant_id);
CREATE INDEX idx_menu_items_is_available ON menu_items(is_available);
CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_drivers_location ON drivers(current_latitude, current_longitude);
CREATE INDEX idx_promotions_code ON promotions(code);
CREATE INDEX idx_promotions_active ON promotions(is_active, valid_from, valid_until);
CREATE INDEX idx_loyalty_points_customer_id ON loyalty_points(customer_id);
CREATE INDEX idx_reviews_order_id ON reviews(order_id);
CREATE INDEX idx_messages_order_id ON messages(order_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Row Level Security (RLS) Policies

-- Profiles RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Restaurants RLS
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view open restaurants" ON restaurants FOR SELECT USING (is_open = true);
CREATE POLICY "Restaurant owners can manage their restaurants" ON restaurants FOR ALL USING (auth.uid() = owner_id);

-- Menu items RLS
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view available menu items" ON menu_items FOR SELECT USING (is_available = true);
CREATE POLICY "Restaurant owners can manage their menu items" ON menu_items FOR ALL USING (
  restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
);

-- Orders RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers can view own orders" ON orders FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Restaurants can view their orders" ON orders FOR SELECT USING (
  restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
);
CREATE POLICY "Drivers can view assigned orders" ON orders FOR SELECT USING (driver_id = auth.uid());
CREATE POLICY "Customers can create orders" ON orders FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Restaurants can update order status" ON orders FOR UPDATE USING (
  restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
);
CREATE POLICY "Drivers can update assigned orders" ON orders FOR UPDATE USING (driver_id = auth.uid());

-- Drivers RLS
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view online drivers" ON drivers FOR SELECT USING (status = 'online');
CREATE POLICY "Drivers can view own profile" ON drivers FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "Drivers can update own profile" ON drivers FOR UPDATE USING (profile_id = auth.uid());

-- Reviews RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view public reviews" ON reviews FOR SELECT USING (is_public = true);
CREATE POLICY "Users can manage own reviews" ON reviews FOR ALL USING (customer_id = auth.uid());

-- Messages RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own messages" ON messages FOR SELECT USING (
  sender_id = auth.uid() OR receiver_id = auth.uid()
);
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Functions for automatic timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON promotions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate order total
CREATE OR REPLACE FUNCTION calculate_order_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total = NEW.subtotal + NEW.delivery_fee + NEW.tax - NEW.discount_amount;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_order_total_trigger BEFORE INSERT OR UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION calculate_order_total();

-- Function to award loyalty points
CREATE OR REPLACE FUNCTION award_loyalty_points()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
        INSERT INTO loyalty_points (customer_id, order_id, points_earned, transaction_type, description)
        VALUES (NEW.customer_id, NEW.id, FLOOR(NEW.total / 100), 'earned', 'Points earned from order');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER award_loyalty_points_trigger AFTER UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION award_loyalty_points();

-- ============================================
-- EXTENDED ADMIN TABLES
-- ============================================

-- KYC Verification table for Africa markets
CREATE TABLE kyc_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  document_type TEXT NOT NULL, -- national_id, business_permit, drivers_license
  document_number TEXT,
  document_front_url TEXT,
  document_back_url TEXT,
  selfie_url TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  verified_at TIMESTAMP WITH TIME ZONE,
  rejected_reason TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor/Shop extended info
CREATE TABLE vendors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) UNIQUE,
  restaurant_id UUID REFERENCES restaurants(id),
  business_name TEXT,
  business_type TEXT, -- restaurant, grocery, pharmacy, etc.
  commission_rate DECIMAL(5,2) DEFAULT 10.00,
  commission_type TEXT DEFAULT 'percentage', -- percentage, fixed
  subscription_plan TEXT DEFAULT 'free', -- free, basic, premium
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  bank_name TEXT,
  bank_account TEXT,
  mobile_money_number TEXT,
  mpesa_number TEXT,
  payout_status TEXT DEFAULT 'pending', -- pending, approved, blocked
  payout_balance INTEGER DEFAULT 0,
  total_earnings INTEGER DEFAULT 0,
  total_paid INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product variants (size, color, etc.)
CREATE TABLE product_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL, -- Size, Color, Weight
  variant_value TEXT NOT NULL, -- Large, Red, 500g
  price_modifier INTEGER DEFAULT 0,
  stock INTEGER DEFAULT 0,
  sku TEXT,
  barcode TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Refunds table
CREATE TABLE refunds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  amount INTEGER NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, processed, rejected
  processed_by UUID REFERENCES profiles(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  payment_method TEXT,
  transaction_ref TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disputes table
CREATE TABLE disputes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  customer_id UUID REFERENCES profiles(id),
  vendor_id UUID REFERENCES profiles(id),
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open', -- open, in_review, resolved, closed
  resolution TEXT,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments with escrow support
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  customer_id UUID REFERENCES profiles(id),
  vendor_id UUID REFERENCES profiles(id),
  amount INTEGER NOT NULL,
  method TEXT DEFAULT 'cash', -- cash, card, mpesa, tigopesa, airtelmoney
  status TEXT DEFAULT 'pending', -- pending, held, released, refunded, failed
  transaction_ref TEXT,
  escrow_released_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor payouts
CREATE TABLE vendor_payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID REFERENCES vendors(id),
  amount INTEGER NOT NULL,
  method TEXT DEFAULT 'bank_transfer', -- bank_transfer, mobile_money
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  transaction_ref TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Delivery zones extended
CREATE TABLE delivery_zones_extended (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID REFERENCES vendors(id),
  name TEXT NOT NULL,
  zone_type TEXT DEFAULT 'polygon', -- polygon, radius
  coordinates JSONB NOT NULL, -- GeoJSON
  base_fee INTEGER DEFAULT 0,
  per_km_fee INTEGER DEFAULT 0,
  free_delivery_above INTEGER,
  estimated_minutes INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CMS: Banners
CREATE TABLE banners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT,
  position TEXT DEFAULT 'home', -- home, category, checkout
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CMS: Pages
CREATE TABLE pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT,
  meta_title TEXT,
  meta_description TEXT,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CMS: Promo campaigns
CREATE TABLE campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'discount', -- discount, bogo, free_delivery
  discount_type TEXT,
  discount_value INTEGER,
  min_order_amount INTEGER,
  max_discount INTEGER,
  target_segment TEXT, -- all, new_users, vip, inactive
  status TEXT DEFAULT 'draft', -- draft, scheduled, active, ended
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs
CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT, -- user, order, vendor, product, settings
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Platform settings
CREATE TABLE platform_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Login activity tracking
CREATE TABLE login_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  location TEXT,
  success BOOLEAN DEFAULT true,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin notifications
CREATE TABLE admin_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  type TEXT NOT NULL, -- new_order, new_vendor, kyc, refund, dispute
  title TEXT NOT NULL,
  message TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR EXTENDED TABLES
-- ============================================
CREATE INDEX idx_kyc_user_id ON kyc_verifications(user_id);
CREATE INDEX idx_kyc_status ON kyc_verifications(status);
CREATE INDEX idx_vendors_profile_id ON vendors(profile_id);
CREATE INDEX idx_vendors_restaurant_id ON vendors(restaurant_id);
CREATE INDEX idx_product_variants_item_id ON product_variants(menu_item_id);
CREATE INDEX idx_refunds_order_id ON refunds(order_id);
CREATE INDEX idx_refunds_status ON refunds(status);
CREATE INDEX idx_disputes_order_id ON disputes(order_id);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_vendor_payouts_vendor_id ON vendor_payouts(vendor_id);
CREATE INDEX idx_vendor_payouts_status ON vendor_payouts(status);
CREATE INDEX idx_banners_position ON banners(position);
CREATE INDEX idx_banners_active ON banners(is_active);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_login_activity_user_id ON login_activity(user_id);
CREATE INDEX idx_login_activity_created ON login_activity(created_at);
CREATE INDEX idx_admin_notifications_user ON admin_notifications(user_id);
CREATE INDEX idx_admin_notifications_read ON admin_notifications(is_read);
