import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Calculate distance between two points using Haversine formula
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

// Calculate ETA based on distance and average speed
function calculateETA(distanceKm: number): number {
  // Average urban speed ~25 km/h, plus 2 min buffer
  return Math.ceil((distanceKm / 25) * 60 + 2);
}

// Score a driver based on multiple factors
function scoreDriver(driver: any, request: any, distanceKm: number, etaMinutes: number): number {
  let score = 100;

  // Distance factor (closer = higher score)
  score -= Math.min(distanceKm * 3, 30);

  // ETA factor
  score -= Math.min(etaMinutes * 0.5, 20);

  // Rating factor (3-5 stars)
  score += (driver.rating - 3) * 5;

  // Acceptance rate factor
  score += (driver.acceptance_rate / 100) * 15;

  // Cancellation rate penalty
  score -= (driver.cancellation_rate / 100) * 10;

  // Priority driver bonus
  if (driver.is_priority_driver) score += 10;

  // Corporate driver bonus
  if (driver.is_corporate_driver) score += 5;

  // Vehicle type match
  if (driver.vehicle_type_id === request.vehicle_type_id) score += 10;

  // Zone preference
  if (driver.current_zone_id && driver.preferred_zones?.includes(driver.current_zone_id)) {
    score += 5;
  }

  // Online time bonus (drivers online longer get slight priority)
  // This would need additional tracking

  return Math.max(0, score);
}

// Find nearby available drivers
async function findAvailableDrivers(request: any, searchRadiusKm: number = 5): Promise<any[]> {
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

  const candidates = [];

  for (const driver of drivers) {
    // Check if driver has active ride
    const { data: activeRide } = await supabase
      .from('rides')
      .select('id')
      .eq('driver_id', driver.user_id)
      .in('status', ['assigned', 'driver_en_route', 'driver_arrived', 'in_progress'])
      .limit(1)
      .single();

    if (activeRide) continue; // Skip busy drivers

    const distance = calculateDistance(
      request.pickup_latitude,
      request.pickup_longitude,
      driver.current_latitude,
      driver.current_longitude
    );

    if (distance > searchRadiusKm) continue;

    const eta = calculateETA(distance);
    const score = scoreDriver(driver, request, distance, eta);

    candidates.push({
      driver_id: driver.user_id,
      distance_km: Number(distance.toFixed(2)),
      eta_minutes: eta,
      score: Number(score.toFixed(2)),
      driver_rating: driver.rating,
      acceptance_rate: driver.acceptance_rate,
    });
  }

  // Sort by score descending
  return candidates.sort((a, b) => b.score - a.score);
}

// Assign driver to ride request
async function assignDriver(rideRequestId: string, driverId: string, surgeMultiplier: number): Promise<boolean> {
  const { error } = await supabase.rpc('assign_driver_to_ride_request', {
    p_ride_request_id: rideRequestId,
    p_driver_id: driverId,
    p_surge_multiplier: surgeMultiplier,
  });

  return !error;
}

// Handle driver response (accept/reject/timeout)
async function handleDriverResponse(assignmentId: string, driverId: string, response: 'accepted' | 'rejected'): Promise<void> {
  const respondedAt = new Date().toISOString();
  
  const { data: assignment } = await supabase
    .from('driver_ride_assignments')
    .select('*')
    .eq('id', assignmentId)
    .single();

  if (!assignment) return;

  const responseTimeSeconds = Math.floor(
    (new Date(respondedAt).getTime() - new Date(assignment.assigned_at).getTime()) / 1000
  );

  await supabase
    .from('driver_ride_assignments')
    .update({
      responded_at: respondedAt,
      response,
      response_time_seconds: responseTimeSeconds,
    })
    .eq('id', assignmentId);

  if (response === 'accepted') {
    // Create the ride record
    const { data: request } = await supabase
      .from('ride_requests')
      .select('*')
      .eq('id', assignment.ride_request_id)
      .single();

    if (request) {
      const { error: rideError } = await supabase.from('rides').insert({
        ride_request_id: request.id,
        customer_id: request.customer_id,
        driver_id: driverId,
        vehicle_type_id: request.vehicle_type_id,
        status: 'assigned',
        pickup_latitude: request.pickup_latitude,
        pickup_longitude: request.pickup_longitude,
        pickup_address: request.pickup_address,
        dropoff_latitude: request.dropoff_latitude,
        dropoff_longitude: request.dropoff_longitude,
        dropoff_address: request.dropoff_address,
        scheduled_for: request.scheduled_for,
        surge_multiplier: assignment.surge_multiplier,
        metadata: { assignment_id: assignmentId },
      });

      if (!rideError) {
        // Update ride request status
        await supabase
          .from('ride_requests')
          .update({
            status: 'driver_assigned',
            assigned_driver_id: driverId,
            assigned_at: new Date().toISOString(),
            driver_accepted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', request.id);

        // Log event
        await supabase.from('ride_events').insert({
          ride_id: (await supabase.from('rides').select('id').eq('ride_request_id', request.id).single()).data?.id,
          event_type: 'driver_accepted',
          event_data: { driver_id: driverId, assignment_id: assignmentId },
          triggered_by: driverId,
          triggered_by_role: 'driver',
        });

        // Notify customer (via realtime)
        await supabase.channel(`ride-${request.id}`).send({
          type: 'broadcast',
          event: 'driver_accepted',
          payload: { driver_id: driverId, assignment_id: assignmentId },
        });
      }
    }
  } else if (response === 'rejected') {
    // Find next best driver
    await findAndAssignNextDriver(assignment.ride_request_id);
  }
}

// Find and assign next best driver after rejection/timeout
async function findAndAssignNextDriver(rideRequestId: string): Promise<void> {
  const { data: request } = await supabase
    .from('ride_requests')
    .select('*')
    .eq('id', rideRequestId)
    .single();

  if (!request || request.status !== 'searching') return;

  // Get already tried drivers
  const { data: triedAssignments } = await supabase
    .from('driver_ride_assignments')
    .select('driver_id')
    .eq('ride_request_id', rideRequestId);

  const triedDriverIds = triedAssignments?.map(a => a.driver_id) || [];

  // Find drivers excluding tried ones
  const { data: drivers } = await supabase
    .from('driver_profiles')
    .select('*')
    .eq('vehicle_type_id', request.vehicle_type_id)
    .eq('status', 'approved')
    .eq('is_online', true)
    .not('current_latitude', 'is', null)
    .not('current_longitude', 'is', null)
    .not('user_id', 'in', `(${triedDriverIds.join(',')})`);

  if (!drivers || drivers.length === 0) {
    // No more drivers available
    await supabase
      .from('ride_requests')
      .update({ status: 'no_drivers_found', updated_at: new Date().toISOString() })
      .eq('id', rideRequestId);
    return;
  }

  // Score and sort
  const scored = drivers.map((driver: any) => {
    const distance = calculateDistance(
      request.pickup_latitude,
      request.pickup_longitude,
      driver.current_latitude,
      driver.current_longitude
    );
    const eta = calculateETA(distance);
    return {
      ...driver,
      distance,
      eta,
      score: scoreDriver(driver, request, distance, eta),
    };
  }).sort((a: any, b: any) => b.score - a.score);

  const bestDriver = scored[0];
  if (bestDriver) {
    await assignDriver(rideRequestId, bestDriver.user_id, request.surge_multiplier);
  }
}

// Process ride matching queue
async function processMatchingQueue(): Promise<void> {
  const { data: queueItems } = await supabase
    .from('ride_matching_queue')
    .select('*')
    .eq('status', 'waiting')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(50);

  if (!queueItems || queueItems.length === 0) return;

  for (const item of queueItems) {
    const { data: request } = await supabase
      .from('ride_requests')
      .select('*')
      .eq('id', item.ride_request_id)
      .single();

    if (!request || request.status !== 'searching') {
      // Clean up queue item
      await supabase.from('ride_matching_queue').delete().eq('id', item.id);
      continue;
    }

    // Check if search expired
    if (item.expires_at && new Date(item.expires_at) < new Date()) {
      await supabase
        .from('ride_matching_queue')
        .update({ status: 'expired' })
        .eq('id', item.id);
      
      await supabase
        .from('ride_requests')
        .update({ status: 'no_drivers_found', updated_at: new Date().toISOString() })
        .eq('id', item.ride_request_id);
      continue;
    }

    // Expand search radius if needed
    if (item.search_expands_at && new Date(item.search_expands_at) < new Date()) {
      const newRadius = Math.min(item.search_radius_meters * 2, item.max_search_radius_meters);
      await supabase
        .from('ride_matching_queue')
        .update({ 
          search_radius_meters: newRadius,
          search_expands_at: new Date(Date.now() + 30000).toISOString(), // Expand every 30s
        })
        .eq('id', item.id);
    }

    // Find drivers in current radius
    const radiusKm = item.search_radius_meters / 1000;
    const drivers = await findAvailableDrivers(request, radiusKm);

    if (drivers.length > 0) {
      // Assign best driver
      const bestDriver = drivers[0];
      await assignDriver(item.ride_request_id, bestDriver.driver_id, request.surge_multiplier);
      
      await supabase
        .from('ride_matching_queue')
        .update({ status: 'assigned', assigned_driver_id: bestDriver.driver_id, assigned_at: new Date().toISOString() })
        .eq('id', item.id);
    }
  }
}

// Scheduled ride processing
async function processScheduledRides(): Promise<void> {
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60000);

  const { data: scheduledRequests } = await supabase
    .from('ride_requests')
    .select('*')
    .eq('is_scheduled', true)
    .eq('status', 'searching')
    .lte('scheduled_for', fiveMinutesFromNow.toISOString())
    .gt('scheduled_for', now.toISOString());

  if (!scheduledRequests || scheduledRequests.length === 0) return;

  for (const request of scheduledRequests) {
    // Add to matching queue with high priority
    await supabase.from('ride_matching_queue').insert({
      ride_request_id: request.id,
      vehicle_type_id: request.vehicle_type_id,
      pickup_latitude: request.pickup_latitude,
      pickup_longitude: request.pickup_longitude,
      priority: 100, // High priority for scheduled rides
      search_radius_meters: 5000,
      max_search_radius_meters: 20000,
      search_expands_at: new Date(Date.now() + 30000).toISOString(),
      expires_at: new Date(new Date(request.scheduled_for).getTime() + 10 * 60000).toISOString(),
    });
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    switch (action) {
      case 'find_drivers': {
        const { ride_request_id, search_radius_km } = params;
        
        const { data: request } = await supabase
          .from('ride_requests')
          .select('*')
          .eq('id', ride_request_id)
          .single();

        if (!request) {
          return new Response(
            JSON.stringify({ error: 'Ride request not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const drivers = await findAvailableDrivers(request, search_radius_km || 5);
        
        return new Response(
          JSON.stringify({ drivers: drivers.slice(0, 10) }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'assign_driver': {
        const { ride_request_id, driver_id, surge_multiplier } = params;
        const success = await assignDriver(ride_request_id, driver_id, surge_multiplier || 1.0);
        
        return new Response(
          JSON.stringify({ success }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'driver_response': {
        const { assignment_id, driver_id, response } = params;
        await handleDriverResponse(assignment_id, driver_id, response);
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'process_queue': {
        await processMatchingQueue();
        await processScheduledRides();
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'auto_assign': {
        const { ride_request_id } = params;
        
        const { data: request } = await supabase
          .from('ride_requests')
          .select('*')
          .eq('id', ride_request_id)
          .single();

        if (!request) {
          return new Response(
            JSON.stringify({ error: 'Ride request not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Add to matching queue for processing
        await supabase.from('ride_matching_queue').insert({
          ride_request_id: request.id,
          vehicle_type_id: request.vehicle_type_id,
          pickup_latitude: request.pickup_latitude,
          pickup_longitude: request.pickup_longitude,
          priority: 50,
          search_radius_meters: 5000,
          max_search_radius_meters: 20000,
          search_expands_at: new Date(Date.now() + 30000).toISOString(),
          expires_at: new Date(Date.now() + 10 * 60000).toISOString(),
        });

        return new Response(
          JSON.stringify({ success: true, queued: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Matching engine error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});