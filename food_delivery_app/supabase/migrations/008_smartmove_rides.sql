-- ============================================
-- MIGRATION: SmartMove Ride-Hailing Module
-- ============================================

-- Vehicle Types
CREATE TABLE IF NOT EXISTS vehicle_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  base_fare INTEGER NOT NULL DEFAULT 0,
  per_km_rate INTEGER NOT NULL DEFAULT 0,
  per_minute_rate INTEGER NOT NULL DEFAULT 0,
  min_fare INTEGER NOT NULL DEFAULT 0,
  max_passengers INTEGER NOT NULL DEFAULT 4,
  has_ac BOOLEAN DEFAULT true,
  has_trunk BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Driver Profiles (extends existing profiles)
CREATE TABLE IF NOT EXISTS driver_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  license_number TEXT NOT NULL UNIQUE,
  license_expiry DATE NOT NULL,
  license_image_url TEXT,
  badge_number TEXT UNIQUE,
  badge_expiry DATE,
  vehicle_type_id UUID REFERENCES vehicle_types(id),
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  vehicle_color TEXT,
  vehicle_plate TEXT UNIQUE,
  vehicle_image_url TEXT,
  vehicle_registration_url TEXT,
  vehicle_insurance_url TEXT,
  vehicle_inspection_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended', 'deactivated')),
  is_online BOOLEAN DEFAULT false,
  current_latitude DOUBLE PRECISION,
  current_longitude DOUBLE PRECISION,
  current_heading DOUBLE PRECISION,
  last_location_update TIMESTAMP WITH TIME ZONE,
  current_zone_id UUID,
  rating DECIMAL(3,2) DEFAULT 5.00,
  total_ratings INTEGER DEFAULT 0,
  total_rides INTEGER DEFAULT 0,
  completed_rides INTEGER DEFAULT 0,
  cancelled_rides INTEGER DEFAULT 0,
  acceptance_rate DECIMAL(5,2) DEFAULT 100.00,
  cancellation_rate DECIMAL(5,2) DEFAULT 0.00,
  is_priority_driver BOOLEAN DEFAULT false,
  is_corporate_driver BOOLEAN DEFAULT false,
  preferred_zones UUID[] DEFAULT '{}',
  max_distance_from_zone INTEGER DEFAULT 10000,
  documents_verified BOOLEAN DEFAULT false,
  vehicle_verified BOOLEAN DEFAULT false,
  background_check_status TEXT DEFAULT 'pending' CHECK (background_check_status IN ('pending', 'passed', 'failed', 'expired')),
  background_check_date DATE,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES profiles(id),
  rejection_reason TEXT,
  suspension_reason TEXT,
  suspended_at TIMESTAMP WITH TIME ZONE,
  suspended_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Driver Status/Location Tracking
CREATE TABLE IF NOT EXISTS driver_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES driver_profiles(user_id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  heading DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  accuracy DOUBLE PRECISION,
  altitude DOUBLE PRECISION,
  is_online BOOLEAN DEFAULT true,
  is_on_trip BOOLEAN DEFAULT false,
  current_ride_id UUID,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Driver Availability/Shifts
CREATE TABLE IF NOT EXISTS driver_availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES driver_profiles(user_id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_recurring BOOLEAN DEFAULT true,
  specific_date DATE,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Driver Documents
CREATE TABLE IF NOT EXISTS driver_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES driver_profiles(user_id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'license', 'badge', 'vehicle_registration', 'vehicle_insurance', 
    'vehicle_inspection', 'background_check', 'medical_certificate', 'other'
  )),
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES profiles(id),
  rejection_reason TEXT,
  expiry_date DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ride Requests (Customer requests a ride)
CREATE TABLE IF NOT EXISTS ride_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_type_id UUID REFERENCES vehicle_types(id),
  pickup_latitude DOUBLE PRECISION NOT NULL,
  pickup_longitude DOUBLE PRECISION NOT NULL,
  pickup_address TEXT NOT NULL,
  pickup_place_id TEXT,
  dropoff_latitude DOUBLE PRECISION NOT NULL,
  dropoff_longitude DOUBLE PRECISION NOT NULL,
  dropoff_address TEXT NOT NULL,
  dropoff_place_id TEXT,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  is_scheduled BOOLEAN DEFAULT false,
  estimated_distance_km DECIMAL(10,2),
  estimated_duration_minutes INTEGER,
  estimated_fare INTEGER,
  surge_multiplier DECIMAL(4,2) DEFAULT 1.00,
  promo_code_id UUID,
  payment_method TEXT DEFAULT 'wallet' CHECK (payment_method IN ('wallet', 'cash', 'card', 'pesapal', 'mpesa', 'airtel_money', 'halopesa', 'tigopesa', 'selcom')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partial')),
  status TEXT NOT NULL DEFAULT 'searching' CHECK (status IN (
    'searching', 'driver_assigned', 'driver_en_route', 'driver_arrived', 
    'in_progress', 'completed', 'cancelled', 'expired', 'no_drivers_found'
  )),
  assigned_driver_id UUID REFERENCES driver_profiles(user_id),
  assigned_at TIMESTAMP WITH TIME ZONE,
  driver_accepted_at TIMESTAMP WITH TIME ZONE,
  driver_arrived_at TIMESTAMP WITH TIME ZONE,
  ride_started_at TIMESTAMP WITH TIME ZONE,
  ride_completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by UUID REFERENCES profiles(id),
  cancellation_reason TEXT,
  cancellation_fee INTEGER DEFAULT 0,
  actual_distance_km DECIMAL(10,2),
  actual_duration_minutes INTEGER,
  actual_fare INTEGER,
  platform_fee INTEGER DEFAULT 0,
  driver_earnings INTEGER DEFAULT 0,
  tip_amount INTEGER DEFAULT 0,
  rating DECIMAL(3,2),
  feedback TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ride Stops (for multi-stop rides)
CREATE TABLE IF NOT EXISTS ride_stops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_request_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE CASCADE,
  stop_order INTEGER NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT NOT NULL,
  place_id TEXT,
  stop_type TEXT DEFAULT 'dropoff' CHECK (stop_type IN ('pickup', 'dropoff', 'via')),
  estimated_arrival TIMESTAMP WITH TIME ZONE,
  actual_arrival TIMESTAMP WITH TIME ZONE,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rides (Active/Completed ride tracking)
CREATE TABLE IF NOT EXISTS rides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_request_id UUID NOT NULL UNIQUE REFERENCES ride_requests(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES driver_profiles(user_id) ON DELETE CASCADE,
  vehicle_type_id UUID REFERENCES vehicle_types(id),
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN (
    'assigned', 'driver_en_route', 'driver_arrived', 'in_progress', 
    'completed', 'cancelled', 'disputed'
  )),
  pickup_latitude DOUBLE PRECISION NOT NULL,
  pickup_longitude DOUBLE PRECISION NOT NULL,
  pickup_address TEXT NOT NULL,
  dropoff_latitude DOUBLE PRECISION NOT NULL,
  dropoff_longitude DOUBLE PRECISION NOT NULL,
  dropoff_address TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by UUID REFERENCES profiles(id),
  cancellation_reason TEXT,
  actual_distance_km DECIMAL(10,2),
  actual_duration_minutes INTEGER,
  route_geometry JSONB,
  route_distance_km DECIMAL(10,2),
  route_duration_minutes INTEGER,
  fare_breakdown JSONB DEFAULT '{}',
  total_fare INTEGER,
  platform_fee INTEGER DEFAULT 0,
  driver_earnings INTEGER DEFAULT 0,
  tip_amount INTEGER DEFAULT 0,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method TEXT,
  transaction_id UUID REFERENCES transactions(id),
  customer_rating DECIMAL(3,2),
  customer_feedback TEXT,
  driver_rating DECIMAL(3,2),
  driver_feedback TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ride Events (for real-time tracking and audit trail)
CREATE TABLE IF NOT EXISTS ride_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'requested', 'searching_driver', 'driver_assigned', 'driver_accepted',
    'driver_rejected', 'driver_timeout', 'driver_en_route', 'driver_arrived',
    'ride_started', 'ride_paused', 'ride_resumed', 'ride_completed',
    'ride_cancelled', 'payment_initiated', 'payment_completed', 
    'payment_failed', 'refund_initiated', 'refund_completed',
    'rating_submitted', 'dispute_opened', 'dispute_resolved',
    'location_update', 'route_update', 'eta_update'
  )),
  event_data JSONB DEFAULT '{}',
  triggered_by UUID REFERENCES profiles(id),
  triggered_by_role TEXT CHECK (triggered_by_role IN ('customer', 'driver', 'system', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ride Promotions/Coupons
CREATE TABLE IF NOT EXISTS ride_promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_ride')),
  discount_value INTEGER NOT NULL,
  max_discount INTEGER,
  min_fare INTEGER DEFAULT 0,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  usage_per_customer INTEGER DEFAULT 1,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  applicable_vehicle_types UUID[] DEFAULT '{}',
  applicable_zones UUID[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_first_ride_only BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer Promotion Usage
CREATE TABLE IF NOT EXISTS customer_promotion_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  promotion_id UUID NOT NULL REFERENCES ride_promotions(id) ON DELETE CASCADE,
  ride_request_id UUID REFERENCES ride_requests(id) ON DELETE SET NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  discount_applied INTEGER DEFAULT 0,
  UNIQUE(customer_id, promotion_id, ride_request_id)
);

-- Ride Pricing Rules
CREATE TABLE IF NOT EXISTS ride_pricing_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_type_id UUID NOT NULL REFERENCES vehicle_types(id) ON DELETE CASCADE,
  zone_id UUID,
  name TEXT NOT NULL,
  base_fare INTEGER NOT NULL DEFAULT 0,
  per_km_rate INTEGER NOT NULL DEFAULT 0,
  per_minute_rate INTEGER NOT NULL DEFAULT 0,
  min_fare INTEGER NOT NULL DEFAULT 0,
  max_fare INTEGER,
  surge_threshold DECIMAL(4,2) DEFAULT 1.00,
  max_surge_multiplier DECIMAL(4,2) DEFAULT 3.00,
  waiting_fee_per_minute INTEGER DEFAULT 0,
  cancellation_fee INTEGER DEFAULT 0,
  airport_fee INTEGER DEFAULT 0,
  night_surcharge_percentage DECIMAL(5,2) DEFAULT 0,
  peak_hours_start TIME,
  peak_hours_end TIME,
  peak_surcharge_percentage DECIMAL(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ride Transactions (linked to existing transactions table)
CREATE TABLE IF NOT EXISTS ride_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'customer_payment', 'driver_payout', 'platform_fee', 
    'refund', 'cancellation_fee', 'tip', 'promo_discount'
  )),
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ride Ratings
CREATE TABLE IF NOT EXISTS ride_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES driver_profiles(user_id) ON DELETE CASCADE,
  rating DECIMAL(3,2) NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback TEXT,
  categories JSONB DEFAULT '{}',
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Driver Earnings Summary (daily/weekly)
CREATE TABLE IF NOT EXISTS driver_earnings_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES driver_profiles(user_id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_rides INTEGER DEFAULT 0,
  completed_rides INTEGER DEFAULT 0,
  cancelled_rides INTEGER DEFAULT 0,
  total_distance_km DECIMAL(10,2) DEFAULT 0,
  total_duration_minutes INTEGER DEFAULT 0,
  gross_earnings INTEGER DEFAULT 0,
  platform_fees INTEGER DEFAULT 0,
  net_earnings INTEGER DEFAULT 0,
  tips_received INTEGER DEFAULT 0,
  bonuses INTEGER DEFAULT 0,
  penalties INTEGER DEFAULT 0,
  wallet_credited INTEGER DEFAULT 0,
  is_finalized BOOLEAN DEFAULT false,
  finalized_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(driver_id, period_type, period_start)
);

-- Driver Bonuses/Incentives
CREATE TABLE IF NOT EXISTS driver_bonuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES driver_profiles(user_id) ON DELETE CASCADE,
  bonus_type TEXT NOT NULL CHECK (bonus_type IN (
    'signup', 'referral', 'completion', 'peak_hours', 'rating', 
    'milestone', 'corporate', 'promotion', 'adjustment'
  )),
  title TEXT NOT NULL,
  description TEXT,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'TZS',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  ride_request_id UUID REFERENCES ride_requests(id) ON DELETE SET NULL,
  referred_driver_id UUID REFERENCES driver_profiles(user_id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Zones/Geofences for pricing and heatmaps
CREATE TABLE IF NOT EXISTS zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  boundary GEOMETRY(POLYGON, 4326) NOT NULL,
  center_latitude DOUBLE PRECISION,
  center_longitude DOUBLE PRECISION,
  zone_type TEXT DEFAULT 'pricing' CHECK (zone_type IN ('pricing', 'heatmap', 'airport', 'restricted', 'priority')),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Heatmap Data (aggregated for performance)
CREATE TABLE IF NOT EXISTS heatmap_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hour INTEGER NOT NULL CHECK (hour BETWEEN 0 AND 23),
  request_count INTEGER DEFAULT 0,
  completed_ride_count INTEGER DEFAULT 0,
  avg_wait_time_seconds INTEGER,
  avg_surge_multiplier DECIMAL(4,2) DEFAULT 1.00,
  active_driver_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(zone_id, date, hour)
);

-- Trip Receipts
CREATE TABLE IF NOT EXISTS trip_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID NOT NULL UNIQUE REFERENCES rides(id) ON DELETE CASCADE,
  receipt_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES driver_profiles(user_id) ON DELETE CASCADE,
  pdf_url TEXT,
  html_content TEXT,
  fare_breakdown JSONB NOT NULL,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Favorite Places
CREATE TABLE IF NOT EXISTS favorite_places (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  place_id TEXT,
  place_type TEXT DEFAULT 'custom' CHECK (place_type IN ('home', 'work', 'custom', 'airport', 'hotel', 'landmark')),
  icon_name TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Saved Routes
CREATE TABLE IF NOT EXISTS saved_routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pickup_latitude DOUBLE PRECISION NOT NULL,
  pickup_longitude DOUBLE PRECISION NOT NULL,
  pickup_address TEXT NOT NULL,
  dropoff_latitude DOUBLE PRECISION NOT NULL,
  dropoff_longitude DOUBLE PRECISION NOT NULL,
  dropoff_address TEXT NOT NULL,
  vehicle_type_id UUID REFERENCES vehicle_types(id),
  estimated_fare INTEGER,
  estimated_duration_minutes INTEGER,
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Emergency Contacts / SOS
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT,
  relationship TEXT,
  is_primary BOOLEAN DEFAULT false,
  notify_on_sos BOOLEAN DEFAULT true,
  notify_on_ride_start BOOLEAN DEFAULT false,
  notify_on_ride_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SOS Events
CREATE TABLE IF NOT EXISTS sos_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ride_id UUID REFERENCES rides(id) ON DELETE SET NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT,
  trigger_type TEXT DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'automatic', 'crash_detection', 'long_stop')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'false_alarm')),
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  response_time_seconds INTEGER,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shared Trips
CREATE TABLE IF NOT EXISTS shared_trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shared_with UUID REFERENCES profiles(id) ON DELETE SET NULL,
  share_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business/Corporate Trips
CREATE TABLE IF NOT EXISTS corporate_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  company_email TEXT UNIQUE,
  billing_email TEXT,
  contact_person TEXT,
  contact_phone TEXT,
  address TEXT,
  tax_id TEXT,
  credit_limit INTEGER DEFAULT 0,
  used_credit INTEGER DEFAULT 0,
  payment_terms INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS corporate_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  corporate_account_id UUID NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee')),
  department TEXT,
  cost_center TEXT,
  monthly_limit INTEGER,
  used_this_month INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(corporate_account_id, user_id)
);

CREATE TABLE IF NOT EXISTS corporate_trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID NOT NULL UNIQUE REFERENCES rides(id) ON DELETE CASCADE,
  corporate_account_id UUID NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
  corporate_user_id UUID NOT NULL REFERENCES corporate_users(id) ON DELETE CASCADE,
  project_code TEXT,
  cost_center TEXT,
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  billing_status TEXT DEFAULT 'pending' CHECK (billing_status IN ('pending', 'invoiced', 'paid', 'disputed')),
  invoice_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Driver Referral Program
CREATE TABLE IF NOT EXISTS driver_referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES driver_profiles(user_id) ON DELETE CASCADE,
  referred_id UUID REFERENCES driver_profiles(user_id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL UNIQUE,
  referred_email TEXT,
  referred_phone TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'document_submitted', 'approved', 'first_ride_completed', 'bonus_paid')),
  bonus_amount INTEGER DEFAULT 0,
  bonus_paid_at TIMESTAMP WITH TIME ZONE,
  completed_rides_count INTEGER DEFAULT 0,
  required_rides_for_bonus INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vehicle Maintenance
CREATE TABLE IF NOT EXISTS vehicle_maintenance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES driver_profiles(user_id) ON DELETE CASCADE,
  vehicle_type_id UUID REFERENCES vehicle_types(id),
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN (
    'oil_change', 'tire_rotation', 'brake_service', 'inspection', 
    'insurance_renewal', 'registration_renewal', 'repair', 'other'
  )),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  completed_date DATE,
  mileage_at_due INTEGER,
  mileage_at_completion INTEGER,
  cost INTEGER,
  service_provider TEXT,
  receipt_url TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'overdue', 'cancelled')),
  reminder_sent BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fuel Tracking
CREATE TABLE IF NOT EXISTS fuel_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES driver_profiles(user_id) ON DELETE CASCADE,
  date DATE NOT NULL,
  odometer_reading INTEGER NOT NULL,
  fuel_amount_liters DECIMAL(8,2) NOT NULL,
  cost_per_liter DECIMAL(10,2) NOT NULL,
  total_cost INTEGER NOT NULL,
  fuel_type TEXT DEFAULT 'petrol' CHECK (fuel_type IN ('petrol', 'diesel', 'cng', 'electric', 'hybrid')),
  station_name TEXT,
  station_location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  receipt_url TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ride Matching Queue (for real-time driver assignment)
CREATE TABLE IF NOT EXISTS ride_matching_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_request_id UUID NOT NULL UNIQUE REFERENCES ride_requests(id) ON DELETE CASCADE,
  vehicle_type_id UUID REFERENCES vehicle_types(id),
  pickup_latitude DOUBLE PRECISION NOT NULL,
  pickup_longitude DOUBLE PRECISION NOT NULL,
  priority INTEGER DEFAULT 0,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'matching', 'assigned', 'expired', 'cancelled')),
  search_radius_meters INTEGER DEFAULT 5000,
  max_search_radius_meters INTEGER DEFAULT 20000,
  search_expands_at TIMESTAMP WITH TIME ZONE,
  assigned_driver_id UUID REFERENCES driver_profiles(user_id),
  assigned_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Driver-Ride Request Assignments (for tracking accept/reject)
CREATE TABLE IF NOT EXISTS driver_ride_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_request_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES driver_profiles(user_id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  response TEXT CHECK (response IN ('accepted', 'rejected', 'timeout', 'cancelled')),
  response_time_seconds INTEGER,
  was_priority BOOLEAN DEFAULT false,
  surge_multiplier DECIMAL(4,2) DEFAULT 1.00,
  estimated_pickup_eta_minutes INTEGER,
  distance_to_pickup_km DECIMAL(8,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Driver Profiles
CREATE INDEX IF NOT EXISTS idx_driver_profiles_user_id ON driver_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_status ON driver_profiles(status);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_is_online ON driver_profiles(is_online) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_driver_profiles_vehicle_type ON driver_profiles(vehicle_type_id);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_current_location ON driver_profiles(current_latitude, current_longitude) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_driver_profiles_rating ON driver_profiles(rating DESC);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_current_zone ON driver_profiles(current_zone_id);

-- Driver Locations (for real-time tracking)
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON driver_locations(driver_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_locations_online ON driver_locations(is_online, recorded_at DESC) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_driver_locations_current ON driver_locations(driver_id, recorded_at DESC) 
  WHERE is_online = true AND is_on_trip = false;

-- Driver Availability
CREATE INDEX IF NOT EXISTS idx_driver_availability_driver_id ON driver_availability(driver_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_driver_availability_date ON driver_availability(specific_date, day_of_week);

-- Driver Documents
CREATE INDEX IF NOT EXISTS idx_driver_documents_driver_id ON driver_documents(driver_id, document_type);
CREATE INDEX IF NOT EXISTS idx_driver_documents_status ON driver_documents(status);

-- Ride Requests
CREATE INDEX IF NOT EXISTS idx_ride_requests_customer_id ON ride_requests(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ride_requests_status ON ride_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ride_requests_assigned_driver ON ride_requests(assigned_driver_id, status);
CREATE INDEX IF NOT EXISTS idx_ride_requests_scheduled ON ride_requests(scheduled_for, status) WHERE is_scheduled = true;
CREATE INDEX IF NOT EXISTS idx_ride_requests_searching ON ride_requests(created_at DESC) WHERE status = 'searching';
CREATE INDEX IF NOT EXISTS idx_ride_requests_pickup_location ON ride_requests(pickup_latitude, pickup_longitude);

-- Ride Stops
CREATE INDEX IF NOT EXISTS idx_ride_stops_ride_request_id ON ride_stops(ride_request_id, stop_order);

-- Rides
CREATE INDEX IF NOT EXISTS idx_rides_customer_id ON rides(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rides_driver_id ON rides(driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rides_ride_request_id ON rides(ride_request_id);

-- Ride Events
CREATE INDEX IF NOT EXISTS idx_ride_events_ride_id ON ride_events(ride_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ride_events_type ON ride_events(event_type, created_at DESC);

-- Ride Promotions
CREATE INDEX IF NOT EXISTS idx_ride_promotions_code ON ride_promotions(code);
CREATE INDEX IF NOT EXISTS idx_ride_promotions_active ON ride_promotions(is_active, valid_from, valid_until);

-- Ride Pricing Rules
CREATE INDEX IF NOT EXISTS idx_ride_pricing_vehicle_type ON ride_pricing_rules(vehicle_type_id, zone_id, is_active);

-- Ride Transactions
CREATE INDEX IF NOT EXISTS idx_ride_transactions_ride_id ON ride_transactions(ride_id);
CREATE INDEX IF NOT EXISTS idx_ride_transactions_transaction_id ON ride_transactions(transaction_id);

-- Ride Ratings
CREATE INDEX IF NOT EXISTS idx_ride_ratings_ride_id ON ride_ratings(ride_id);
CREATE INDEX IF NOT EXISTS idx_ride_ratings_driver_id ON ride_ratings(driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ride_ratings_customer_id ON ride_ratings(customer_id, created_at DESC);

-- Driver Earnings
CREATE INDEX IF NOT EXISTS idx_driver_earnings_driver_period ON driver_earnings_summary(driver_id, period_type, period_start DESC);

-- Driver Bonuses
CREATE INDEX IF NOT EXISTS idx_driver_bonuses_driver_id ON driver_bonuses(driver_id, status, created_at DESC);

-- Zones
CREATE INDEX IF NOT EXISTS idx_zones_boundary ON zones USING GIST(boundary);
CREATE INDEX IF NOT EXISTS idx_zones_type_active ON zones(zone_type, is_active);

-- Heatmap Data
CREATE INDEX IF NOT EXISTS idx_heatmap_zone_date ON heatmap_data(zone_id, date DESC, hour);

-- Trip Receipts
CREATE INDEX IF NOT EXISTS idx_trip_receipts_ride_id ON trip_receipts(ride_id);
CREATE INDEX IF NOT EXISTS idx_trip_receipts_customer_id ON trip_receipts(customer_id, issued_at DESC);

-- Favorite Places
CREATE INDEX IF NOT EXISTS idx_favorite_places_customer_id ON favorite_places(customer_id, place_type, sort_order);

-- Saved Routes
CREATE INDEX IF NOT EXISTS idx_saved_routes_customer_id ON saved_routes(customer_id, use_count DESC);

-- Emergency Contacts
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user_id ON emergency_contacts(user_id, is_primary);

-- SOS Events
CREATE INDEX IF NOT EXISTS idx_sos_events_user_id ON sos_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sos_events_status ON sos_events(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sos_events_ride_id ON sos_events(ride_id);

-- Shared Trips
CREATE INDEX IF NOT EXISTS idx_shared_trips_ride_id ON shared_trips(ride_id);
CREATE INDEX IF NOT EXISTS idx_shared_trips_token ON shared_trips(share_token);

-- Corporate
CREATE INDEX IF NOT EXISTS idx_corporate_users_account_id ON corporate_users(corporate_account_id);
CREATE INDEX IF NOT EXISTS idx_corporate_users_user_id ON corporate_users(user_id);
CREATE INDEX IF NOT EXISTS idx_corporate_trips_account_id ON corporate_trips(corporate_account_id, created_at DESC);

-- Driver Referrals
CREATE INDEX IF NOT EXISTS idx_driver_referrals_referrer_id ON driver_referrals(referrer_id, status);
CREATE INDEX IF NOT EXISTS idx_driver_referrals_code ON driver_referrals(referral_code);

-- Vehicle Maintenance
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_driver_id ON vehicle_maintenance(driver_id, due_date, status);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_due_date ON vehicle_maintenance(due_date, status);

-- Fuel Logs
CREATE INDEX IF NOT EXISTS idx_fuel_logs_driver_id ON fuel_logs(driver_id, date DESC);

-- Ride Matching Queue
CREATE INDEX IF NOT EXISTS idx_ride_matching_queue_status ON ride_matching_queue(status, priority DESC, created_at);
CREATE INDEX IF NOT EXISTS idx_ride_matching_queue_location ON ride_matching_queue(pickup_latitude, pickup_longitude);

-- Driver Ride Assignments
CREATE INDEX IF NOT EXISTS idx_driver_ride_assignments_request ON driver_ride_assignments(ride_request_id, assigned_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_ride_assignments_driver ON driver_ride_assignments(driver_id, assigned_at DESC);