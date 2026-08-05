-- ============================================
-- MIGRATION: SmartMove RLS Policies
-- ============================================

-- Enable RLS on all SmartMove tables
ALTER TABLE vehicle_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_promotion_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_earnings_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE heatmap_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_matching_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_ride_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VEHICLE TYPES - Public read, admin write
-- ============================================
CREATE POLICY "Public read vehicle types" ON vehicle_types FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin manage vehicle types" ON vehicle_types FOR ALL
  USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ============================================
-- DRIVER PROFILES
-- ============================================
-- Drivers can view and update their own profile
CREATE POLICY "Driver view own profile" ON driver_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Driver update own profile" ON driver_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all driver profiles
CREATE POLICY "Admin view all driver profiles" ON driver_profiles FOR SELECT
  USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Admins can manage driver profiles
CREATE POLICY "Admin manage driver profiles" ON driver_profiles FOR ALL
  USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Customers can view basic info of assigned driver (for active ride)
CREATE POLICY "Customer view assigned driver" ON driver_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rides r
      WHERE r.driver_id = driver_profiles.user_id
      AND r.customer_id = auth.uid()
      AND r.status IN ('assigned', 'driver_en_route', 'driver_arrived', 'in_progress')
    )
  );

-- ============================================
-- DRIVER LOCATIONS
-- ============================================
-- Drivers can insert/update their own location
CREATE POLICY "Driver insert own location" ON driver_locations FOR INSERT
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Driver update own location" ON driver_locations FOR UPDATE
  USING (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id);

-- Drivers can view their own location history
CREATE POLICY "Driver view own location history" ON driver_locations FOR SELECT
  USING (auth.uid() = driver_id);

-- Customers can view driver location for active ride
CREATE POLICY "Customer view driver location for active ride" ON driver_locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rides r
      WHERE r.driver_id = driver_locations.driver_id
      AND r.customer_id = auth.uid()
      AND r.status IN ('assigned', 'driver_en_route', 'driver_arrived', 'in_progress')
    )
  );

-- Admins can view all driver locations
CREATE POLICY "Admin view all driver locations" ON driver_locations FOR SELECT
  USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ============================================
-- DRIVER AVAILABILITY
-- ============================================
CREATE POLICY "Driver manage own availability" ON driver_availability FOR ALL
  USING (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Admin manage driver availability" ON driver_availability FOR ALL
  USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ============================================
-- DRIVER DOCUMENTS
-- ============================================
CREATE POLICY "Driver manage own documents" ON driver_documents FOR ALL
  USING (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Admin manage driver documents" ON driver_documents FOR ALL
  USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ============================================
-- RIDE REQUESTS
-- ============================================
-- Customers can create and view their own ride requests
CREATE POLICY "Customer create ride request" ON ride_requests FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customer view own ride requests" ON ride_requests FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Customer update own ride request" ON ride_requests FOR UPDATE
  USING (auth.uid() = customer_id AND status IN ('searching', 'scheduled'))
  WITH CHECK (auth.uid() = customer_id);

-- Drivers can view assigned ride requests
CREATE POLICY "Driver view assigned ride request" ON ride_requests FOR SELECT
  USING (auth.uid() = assigned_driver_id);

-- Admins can view all ride requests
CREATE POLICY "Admin view all ride requests" ON ride_requests FOR SELECT
  USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Service role for matching engine
CREATE POLICY "Service role manage ride requests" ON ride_requests FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- RIDE STOPS
-- ============================================
CREATE POLICY "Customer manage own ride stops" ON ride_stops FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM ride_requests rr
      WHERE rr.id = ride_stops.ride_request_id
      AND rr.customer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ride_requests rr
      WHERE rr.id = ride_stops.ride_request_id
      AND rr.customer_id = auth.uid()
    )
  );

CREATE POLICY "Driver view ride stops for assigned ride" ON ride_stops FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ride_requests rr
      WHERE rr.id = ride_stops.ride_request_id
      AND rr.assigned_driver_id = auth.uid()
    )
  );

CREATE POLICY "Admin view all ride stops" ON ride_stops FOR SELECT
  USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ============================================
-- RIDES
-- ============================================
-- Customers can view their own rides
CREATE POLICY "Customer view own rides" ON rides FOR SELECT
  USING (auth.uid() = customer_id);

-- Drivers can view their own rides
CREATE POLICY "Driver view own rides" ON rides FOR SELECT
  USING (auth.uid() = driver_id);

-- Drivers can update ride status (for active rides)
CREATE POLICY "Driver update ride status" ON rides FOR UPDATE
  USING (auth.uid() = driver_id AND status IN ('assigned', 'driver_en_route', 'driver_arrived', 'in_progress'))
  WITH CHECK (auth.uid() = driver_id);

-- Customers can cancel their rides (if not started)
CREATE POLICY "Customer cancel ride" ON rides FOR UPDATE
  USING (auth.uid() = customer_id AND status IN ('assigned', 'driver_en_route', 'driver_arrived'))
  WITH CHECK (auth.uid() = customer_id);

-- Admins can view and manage all rides
CREATE POLICY "Admin view all rides" ON rides FOR SELECT
  USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admin manage rides" ON rides FOR ALL
  USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Service role for ride operations
CREATE POLICY "Service role manage rides" ON rides FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- RIDE EVENTS
-- ============================================
-- Participants can view events for their rides
CREATE POLICY "Participants view ride events" ON ride_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rides r
      WHERE r.id = ride_events.ride_id
      AND (r.customer_id = auth.uid() OR r.driver_id = auth.uid())
    )
  );

-- System/Admin can insert events
CREATE POLICY "System insert ride events" ON ride_events FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'driver', 'customer')
  ));

CREATE POLICY "Admin view all ride events" ON ride_events FOR SELECT
  USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ============================================
-- RIDE PROMOTIONS
-- ============================================
-- Public can view active promotions
CREATE POLICY "Public view active promotions" ON ride_promotions FOR SELECT
  USING (is_active = true AND valid_from <= NOW() AND valid_until >= NOW());

-- Customers can view their promotion usage
CREATE POLICY "Customer view own promotion usage" ON customer_promotion_usage FOR SELECT
  USING (auth.uid() = customer_id);

-- System can insert promotion usage
CREATE POLICY "System insert promotion usage" ON customer_promotion_usage FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Admins manage promotions
CREATE POLICY "Admin manage promotions" ON ride_promotions FOR ALL
  USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ============================================
-- RIDE PRICING RULES
-- ============================================
CREATE POLICY "Public read pricing rules" ON ride_pricing_rules FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin manage pricing rules" ON ride_pricing_rules FOR ALL
  USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ============================================
-- RIDE TRANSACTIONS
-- ============================================
CREATE POLICY "Participants view ride transactions" ON ride_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rides r
      WHERE r.id = ride_transactions.ride_id
      AND (r.customer_id = auth.uid() OR r.driver_id = auth.uid())
    )
  );

CREATE POLICY "Admin view all ride transactions" ON ride_transactions FOR SELECT
  USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Service role manage ride transactions" ON ride_transactions FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- RIDE RATINGS
-- ============================================
CREATE POLICY "Customer insert rating for own ride" ON ride_ratings FOR INSERT
  WITH CHECK (
    auth.uid() = customer_id
    AND EXISTS (
      SELECT 1 FROM rides r
      WHERE r.id = ride_ratings.ride_id
      AND r.customer_id = auth.uid()
      AND r.status = 'completed'
    )
  );

CREATE POLICY "Driver insert rating for own ride" ON ride_ratings FOR INSERT
  WITH CHECK (
    auth.uid() = driver_id
    AND EXISTS (
      SELECT 1 FROM rides r
      WHERE r.id = ride_ratings.ride_id
      AND r.driver_id = auth.uid()
      AND r.status = 'completed'
    )
  );

CREATE POLICY "Participants view ride ratings" ON ride_ratings FOR SELECT
  USING (
    auth.uid() = customer_id OR auth.uid() = driver_id
    OR EXISTS (
      SELECT 1 FROM rides r
      WHERE r.id = ride_ratings.ride_id
      AND (r.customer_id = auth.uid() OR r.driver_id = auth.uid())
    )
  );

CREATE POLICY "Admin view all ride ratings" ON ride_ratings FOR SELECT
  USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ============================================
-- DRIVER EARNINGS SUMMARY
-- ============================================
CREATE POLICY "Driver view own earnings" ON driver_earnings_summary FOR SELECT
  USING (auth.uid() = driver_id);

CREATE POLICY "Admin view all driver earnings" ON driver_earnings_summary FOR SELECT
  USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Service role manage driver earnings" ON driver_earnings_summary FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- DRIVER BONUSES
-- ============================================
CREATE POLICY "Driver view own bonuses" ON driver_bonuses FOR SELECT
  USING (auth.uid() = driver_id);

CREATE POLICY "Admin manage driver bonuses" ON driver_bonuses FOR ALL
  USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Service role manage driver bonuses" ON driver_bonuses FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- ZONES
-- ============================================
CREATE POLICY "Public read active zones" ON zones FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin manage zones" ON zones FOR ALL
  USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ============================================
-- HEATMAP DATA
-- ============================================
CREATE POLICY "Admin view heatmap data" ON heatmap_data FOR SELECT
  USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Service role manage heatmap data" ON heatmap_data FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- TRIP RECEIPTS
-- ============================================
CREATE POLICY "Customer view own trip receipts" ON trip_receipts FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Driver view own trip receipts" ON trip_receipts FOR SELECT
  USING (auth.uid() = driver_id);

CREATE POLICY "Admin view all trip receipts" ON trip_receipts FOR SELECT
  USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Service role manage trip receipts" ON trip_receipts FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- FAVORITE PLACES
-- ============================================
CREATE POLICY "Customer manage own favorite places" ON favorite_places FOR ALL
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- ============================================
-- SAVED ROUTES
-- ============================================
CREATE POLICY "Customer manage own saved routes" ON saved_routes FOR ALL
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- ============================================
-- EMERGENCY CONTACTS
-- ============================================
CREATE POLICY "User manage own emergency contacts" ON emergency_contacts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Drivers can view emergency contacts of customers on their active ride
CREATE POLICY "Driver view customer emergency contacts" ON emergency_contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rides r
      WHERE r.customer_id = emergency_contacts.user_id
      AND r.driver_id = auth.uid()
      AND r.status IN ('assigned', 'driver_en_route', 'driver_arrived', 'in_progress')
    )
  );

-- ============================================
-- SOS EVENTS
-- ============================================
CREATE POLICY "User insert own SOS event" ON sos_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User view own SOS events" ON sos_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Driver view SOS for active ride" ON sos_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rides r
      WHERE r.id = sos_events.ride_id
      AND r.driver_id = auth.uid()
      AND r.status IN ('assigned', 'driver_en_route', 'driver_arrived', 'in_progress')
    )
  );

CREATE POLICY "Admin view all SOS events" ON sos_events FOR SELECT
  USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admin update SOS events" ON sos_events FOR UPDATE
  USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ============================================
-- SHARED TRIPS
-- ============================================
CREATE POLICY "Customer manage shared trips" ON shared_trips FOR ALL
  USING (auth.uid() = shared_by)
  WITH CHECK (auth.uid() = shared_by);

CREATE POLICY "View shared trip by token" ON shared_trips FOR SELECT
  USING (is_active = true AND expires_at > NOW());

-- ============================================
-- CORPORATE ACCOUNTS
-- ============================================
CREATE POLICY "Admin manage corporate accounts" ON corporate_accounts FOR ALL
  USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Corporate admin view own account" ON corporate_accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM corporate_users cu
      WHERE cu.corporate_account_id = corporate_accounts.id
      AND cu.user_id = auth.uid()
      AND cu.role = 'admin'
    )
  );

-- ============================================
-- CORPORATE USERS
-- ============================================
CREATE POLICY "Corporate admin manage users" ON corporate_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM corporate_users cu
      WHERE cu.corporate_account_id = corporate_users.corporate_account_id
      AND cu.user_id = auth.uid()
      AND cu.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM corporate_users cu
      WHERE cu.corporate_account_id = corporate_users.corporate_account_id
      AND cu.user_id = auth.uid()
      AND cu.role = 'admin'
    )
  );

CREATE POLICY "User view own corporate membership" ON corporate_users FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- CORPORATE TRIPS
-- ============================================
CREATE POLICY "Corporate admin view trips" ON corporate_trips FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM corporate_users cu
      WHERE cu.corporate_account_id = corporate_trips.corporate_account_id
      AND cu.user_id = auth.uid()
      AND cu.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Employee view own corporate trips" ON corporate_trips FOR SELECT
  USING (auth.uid() = corporate_user_id);

CREATE POLICY "Service role manage corporate trips" ON corporate_trips FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- DRIVER REFERRALS
-- ============================================
CREATE POLICY "Driver view own referrals" ON driver_referrals FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "Driver create referral code" ON driver_referrals FOR INSERT
  WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "Admin view all referrals" ON driver_referrals FOR SELECT
  USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Service role manage referrals" ON driver_referrals FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- VEHICLE MAINTENANCE
-- ============================================
CREATE POLICY "Driver manage own vehicle maintenance" ON vehicle_maintenance FOR ALL
  USING (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Admin view all vehicle maintenance" ON vehicle_maintenance FOR SELECT
  USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ============================================
-- FUEL LOGS
-- ============================================
CREATE POLICY "Driver manage own fuel logs" ON fuel_logs FOR ALL
  USING (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Admin view all fuel logs" ON fuel_logs FOR SELECT
  USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ============================================
-- RIDE MATCHING QUEUE
-- ============================================
CREATE POLICY "Service role manage matching queue" ON ride_matching_queue FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- DRIVER RIDE ASSIGNMENTS
-- ============================================
CREATE POLICY "Driver view own assignments" ON driver_ride_assignments FOR SELECT
  USING (auth.uid() = driver_id);

CREATE POLICY "Service role manage assignments" ON driver_ride_assignments FOR ALL
  USING (auth.role() = 'service_role');