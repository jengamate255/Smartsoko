import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RideRequest {
  id: string;
  customer_id: string;
  vehicle_type_id: string;
  pickup_latitude: number;
  pickup_longitude: number;
  pickup_address: string;
  dropoff_latitude: number;
  dropoff_longitude: number;
  dropoff_address: string;
  estimated_distance_km: number;
  estimated_duration_minutes: number;
  estimated_fare: number;
  surge_multiplier: number;
  scheduled_for?: string;
  is_scheduled: boolean;
}

interface DriverProfile {
  user_id: string;
  vehicle_type_id: string;
  current_latitude: number;
  current_longitude: number;
  status: string;
  is_online: boolean;
  rating: number;
  total_rides: number;
  completed_rides: number;
  cancelled_rides: number;
  acceptance_rate: number;
  cancellation_rate: number;
  is_priority_driver: boolean;
  is_corporate_driver: boolean;
  preferred_zones: string[];
  max_distance_from_zone: number;
  current_zone_id: string;
}

interface DriverLocation {
  driver_id: string;
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  is_online: boolean;
  is_on_trip: boolean;
  current_ride_id: string;
  recorded_at: string;
}

interface MatchResult {
  driver_id: string;
  distance_km: number;
  eta_minutes: number;
  score: number;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MAPBOX_TOKEN = Deno.env.get('MAPBOX_ACCESS_TOKEN')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Haversine formula for distance calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Calculate ETA using Mapbox Directions API (simplified - uses straight line + buffer)
async function calculateETA(pickupLat: number, pickupLon: number, driverLat: number, driverLon: number): Promise<number> {
  // For performance, use simplified calculation with traffic factor
  const distance = calculateDistance(pickupLat, pickupLon, driverLat, driverLon);
  // Average urban speed ~25 km/h with stops
  const baseTimeMinutes = (distance / 25) * 60;
  // Add buffer for traffic, pickup time
  return Math.ceil(baseTimeMinutes * 1.3 + 2);
}

// Score driver based on multiple factors
function scoreDriver(
  driver: DriverProfile & { distance_km: number; eta_minutes: number },
  request: RideRequest
): number {
  let score = 100;

  // Distance factor (closer is better) - max 30 points
  score -= Math.min(driver.distance_km * 2, 30);

  // ETA factor - max 20 points
  score -= Math.min(driver.eta_minutes * 0.5, 20);

  // Rating factor (higher is better) - max 15 points
  score += (driver.rating - 3) * 3;

  // Acceptance rate factor - max 15 points
  score += (driver.acceptance_rate / 100) * 15;

  // Cancellation rate penalty - max -10 points
  score -= (driver.cancellation_rate / 100) * 10;

  // Priority driver bonus
  if (driver.is_priority_driver) score += 10;

  // Corporate driver bonus for corporate rides
  if (driver.is_corporate_driver) score += 5;

  // Vehicle type match
  if (driver.vehicle_type_id === request.vehicle_type_id) score += 10;

  // Zone preference
  if (driver.preferred_zones.includes(request.pickup_address.split(',')[0]?.trim() || '')) {
    score += 5;
  }

  // Current zone match
  // Could add zone-based scoring here

  return Math.max(0, score);
}

async function findNearbyDrivers(
  request: RideRequest,
  searchRadiusKm: number = 5
): Promise<MatchResult[]> {
  // Get online drivers of matching vehicle type
  const { data: drivers, error } = await supabase
    .from('driver_profiles')
    .select(`
      user_id,
      vehicle_type_id,
      current_latitude,
      current_longitude,
      status,
      is_online,
      rating,
      total_rides,
      completed_rides,
      cancelled_rides,
      acceptance_rate,
      cancellation_rate,
      is_priority_driver,
      is_corporate_driver,
      preferred_zones,
      max_distance_from_zone,
      current_zone_id
    `)
    .eq('vehicle_type_id', request.vehicle_type_id)
    .eq('status', 'approved')
    .eq('is_online', true)
    .not('current_latitude', 'is', null)
    .not('current_longitude', 'is', null);

  if (error || !drivers) {
    console.error('Error fetching drivers:', error);
    return [];
  }

  // Filter by distance and calculate scores
  const matches: MatchResult[] = [];

  for (const driver of drivers as unknown as DriverProfile[]) {
    if (!driver.current_latitude || !driver.current_longitude) continue;

    const distance = calculateDistance(
      request.pickup_latitude,
      request.pickup_longitude,
      driver.current_latitude,
      driver.current_longitude
    );

    if (distance > searchRadiusKm) continue;

    // Check if driver is already on a trip
    const { data: currentRide } = await supabase
      .from('rides')
      .select('id')
      .eq('driver_id', driver.user_id)
      .in('status', ['assigned', 'driver_en_route', 'driver_arrived', 'in_progress'])
      .limit(1)
      .single();

    if (currentRide) continue; // Skip busy drivers

    const eta = await calculateETA(
      request.pickup_latitude,
      request.pickup_longitude,
      driver.current_latitude,
      driver.current_longitude
    );

    const score = scoreDriver({ ...driver, distance_km: distance, eta_minutes: eta }, request);

    matches.push({
      driver_id: driver.user_id,
      distance_km: distance,
      eta_minutes: eta,
      score,
    });
  }

  // Sort by score descending
  return matches.sort((a, b) => b.score - a.score);
}

async function assignDriverToRide(
  rideRequestId: string,
  driverId: string,
  surgeMultiplier: number
): Promise<boolean> {
  const { error } = await supabase.rpc('assign_driver_to_ride', {
    p_ride_request_id: rideRequestId,
    p_driver_id: driverId,
    p_surge_multiplier: surgeMultiplier,
  });

  return !error;
}

// RPC function to assign driver (will be created in migration)
async function createAssignmentRpc() {
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE OR REPLACE FUNCTION assign_driver_to_ride(
        p_ride_request_id UUID,
        p_driver_id UUID,
        p_surge_multiplier DECIMAL(4,2)
      ) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
      DECLARE
        v_request ride_requests%ROWTYPE;
        v_driver driver_profiles%ROWTYPE;
      BEGIN
        SELECT * INTO v_request FROM ride_requests WHERE id = p_ride_request_id FOR UPDATE;
        IF NOT FOUND THEN RETURN FALSE; END IF;
        
        SELECT * INTO v_driver FROM driver_profiles WHERE user_id = p_driver_id FOR UPDATE;
        IF NOT FOUND THEN RETURN FALSE; END IF;
        
        IF v_request.status != 'searching' THEN RETURN FALSE; END IF;
        IF v_driver.is_online = false THEN RETURN FALSE; END IF;
        
        -- Check if driver already has active ride
        IF EXISTS (
          SELECT 1 FROM rides 
          WHERE driver_id = p_driver_id 
          AND status IN ('assigned', 'driver_en_route', 'driver_arrived', 'in_progress')
        ) THEN RETURN FALSE; END IF;
        
        -- Create assignment record
        INSERT INTO driver_ride_assignments (ride_request_id, driver_id, surge_multiplier)
        VALUES (p_ride_request_id, p_driver_id, p_surge_multiplier);
        
        -- Update ride request
        UPDATE ride_requests SET
          status = 'driver_assigned',
          assigned_driver_id = p_driver_id,
          assigned_at = NOW(),
          surge_multiplier = p_surge_multiplier,
          updated_at = NOW()
        WHERE id = p_ride_request_id;
        
        -- Log event
        INSERT INTO ride_events (ride_id, event_type, event_data, triggered_by, triggered_by_role)
        SELECT id, 'driver_assigned', 
          jsonb_build_object('driver_id', p_driver_id, 'surge_multiplier', p_surge_multiplier),
          p_driver_id, 'system'
        FROM ride_requests WHERE id = p_ride_request_id;
        
        RETURN TRUE;
      END;
      $$;
    `
  });

  if (error) console.error('Error creating RPC:', error);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, ride_request_id, search_radius_km } = await req.json();

    if (action === 'find_drivers') {
      // Get ride request
      const { data: request, error: reqError } = await supabase
        .from('ride_requests')
        .select('*')
        .eq('id', ride_request_id)
        .single();

      if (reqError || !request) {
        return new Response(
          JSON.stringify({ error: 'Ride request not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if already assigned
      if (request.status !== 'searching') {
        return new Response(
          JSON.stringify({ error: 'Ride request no longer searching', status: request.status }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const matches = await findNearbyDrivers(request as RideRequest, search_radius_km || 5);

      return new Response(
        JSON.stringify({ matches: matches.slice(0, 10) }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'assign_driver') {
      const { driver_id, surge_multiplier } = await req.json();
      
      const success = await assignDriverToRide(ride_request_id, driver_id, surge_multiplier || 1.0);

      return new Response(
        JSON.stringify({ success }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'auto_assign') {
      // Get ride request
      const { data: request, error: reqError } = await supabase
        .from('ride_requests')
        .select('*')
        .eq('id', ride_request_id)
        .single();

      if (reqError || !request) {
        return new Response(
          JSON.stringify({ error: 'Ride request not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Find best driver
      const matches = await findNearbyDrivers(request as RideRequest, search_radius_km || 5);

      if (matches.length === 0) {
        // Expand search radius
        const expandedMatches = await findNearbyDrivers(request as RideRequest, 15);
        
        if (expandedMatches.length === 0) {
          // No drivers found - mark as no_drivers_found
          await supabase
            .from('ride_requests')
            .update({ status: 'no_drivers_found', updated_at: new Date().toISOString() })
            .eq('id', ride_request_id);

          return new Response(
            JSON.stringify({ success: false, error: 'No drivers available' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Assign best match from expanded search
        const bestMatch = expandedMatches[0];
        const success = await assignDriverToRide(ride_request_id, bestMatch.driver_id, request.surge_multiplier);
        
        return new Response(
          JSON.stringify({ success, assigned_driver: bestMatch.driver_id, expanded_search: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Assign best match
      const bestMatch = matches[0];
      const success = await assignDriverToRide(ride_request_id, bestMatch.driver_id, request.surge_multiplier);

      return new Response(
        JSON.stringify({ success, assigned_driver: bestMatch.driver_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in ride matching:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});