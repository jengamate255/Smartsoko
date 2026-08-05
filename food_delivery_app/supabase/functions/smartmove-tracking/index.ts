import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MAPBOX_TOKEN = Deno.env.get('MAPBOX_ACCESS_TOKEN')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface LocationUpdate {
  driver_id: string;
  ride_id: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  timestamp: string;
}

interface RouteUpdate {
  ride_id: string;
  route_geometry: any;
  distance_km: number;
  duration_minutes: number;
}

async function updateDriverLocation(update: LocationUpdate) {
  // Store in driver_locations table (for history)
  const { error: locError } = await supabase.from('driver_locations').insert({
    driver_id: update.driver_id,
    latitude: update.latitude,
    longitude: update.longitude,
    heading: update.heading,
    speed: update.speed,
    accuracy: update.accuracy,
    is_online: true,
    is_on_trip: true,
    current_ride_id: update.ride_id,
    recorded_at: update.timestamp,
  });

  if (locError) throw locError;

  // Update driver_profiles for quick lookup
  const { error: profileError } = await supabase
    .from('driver_profiles')
    .update({
      current_latitude: update.latitude,
      current_longitude: update.longitude,
      current_heading: update.heading,
      last_location_update: update.timestamp,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', update.driver_id);

  if (profileError) throw profileError;

  // Broadcast to ride subscribers via Realtime
  await supabase.channel(`ride-${update.ride_id}`).send({
    type: 'broadcast',
    event: 'driver_location_update',
    payload: {
      latitude: update.latitude,
      longitude: update.longitude,
      heading: update.heading,
      speed: update.speed,
      timestamp: update.timestamp,
    },
  });

  // Check if driver has arrived at pickup/dropoff
  await checkArrival(update.ride_id, update.driver_id, update.latitude, update.longitude);

  return { success: true };
}

async function checkArrival(rideId: string, driverId: string, driverLat: number, driverLon: number) {
  const { data: ride } = await supabase
    .from('rides')
    .select('*, ride_requests!inner(*)')
    .eq('id', rideId)
    .single();

  if (!ride) return;

  const request = (ride as any).ride_requests;
  const ARRIVAL_THRESHOLD_METERS = 100;

  // Check pickup arrival
  if (ride.status === 'driver_en_route' && request.pickup_latitude && request.pickup_longitude) {
    const distanceToPickup = calculateDistance(
      driverLat, driverLon,
      request.pickup_latitude, request.pickup_longitude
    ) * 1000; // Convert to meters

    if (distanceToPickup <= ARRIVAL_THRESHOLD_METERS) {
      // Driver arrived at pickup
      await supabase
        .from('rides')
        .update({ status: 'driver_arrived', driver_arrived_at: new Date().toISOString() })
        .eq('id', rideId);

      await supabase
        .from('ride_requests')
        .update({ status: 'driver_arrived', driver_arrived_at: new Date().toISOString() })
        .eq('id', request.id);

      await supabase.from('ride_events').insert({
        ride_id: rideId,
        event_type: 'driver_arrived',
        event_data: { location: 'pickup', distance_meters: distanceToPickup },
        triggered_by: driverId,
        triggered_by_role: 'driver',
      });

      // Notify customer
      await supabase.channel(`ride-${request.id}`).send({
        type: 'broadcast',
        event: 'driver_arrived_pickup',
        payload: { ride_id: rideId },
      });
    }
  }

  // Check dropoff arrival (for in-progress rides)
  if (ride.status === 'in_progress' && request.dropoff_latitude && request.dropoff_longitude) {
    const distanceToDropoff = calculateDistance(
      driverLat, driverLon,
      request.dropoff_latitude, request.dropoff_longitude
    ) * 1000;

    if (distanceToDropoff <= ARRIVAL_THRESHOLD_METERS) {
      // Auto-complete ride (or notify driver to complete)
      await supabase.channel(`ride-${request.id}`).send({
        type: 'broadcast',
        event: 'arrived_dropoff',
        payload: { ride_id: rideId },
      });
    }
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function updateRoute(routeUpdate: RouteUpdate) {
  const { error } = await supabase
    .from('rides')
    .update({
      route_geometry: routeUpdate.route_geometry,
      route_distance_km: routeUpdate.distance_km,
      route_duration_minutes: routeUpdate.duration_minutes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', routeUpdate.ride_id);

  if (error) throw error;

  // Broadcast route update
  await supabase.channel(`ride-${routeUpdate.ride_id}`).send({
    type: 'broadcast',
    event: 'route_update',
    payload: {
      geometry: routeUpdate.route_geometry,
      distance_km: routeUpdate.distance_km,
      duration_minutes: routeUpdate.duration_minutes,
    },
  });

  return { success: true };
}

async function getRoute(pickupLat: number, pickupLon: number, dropoffLat: number, dropoffLon: number) {
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${pickupLon},${pickupLat};${dropoffLon},${dropoffLat}?geometries=geojson&overview=full&steps=true&access_token=${MAPBOX_TOKEN}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.routes && data.routes.length > 0) {
    const route = data.routes[0];
    return {
      geometry: route.geometry,
      distance_km: route.distance / 1000,
      duration_minutes: route.duration / 60,
      steps: route.legs[0]?.steps || [],
    };
  }
  
  return null;
}

async function getETAs(rideId: string) {
  const { data: ride } = await supabase
    .from('rides')
    .select('*, ride_requests!inner(*), driver_profiles!rides_driver_id_fkey(*)')
    .eq('id', rideId)
    .single();

  if (!ride) return null;

  const request = (ride as any).ride_requests;
  const driver = (ride as any).driver_profiles;

  const etas = {
    to_pickup: null,
    to_dropoff: null,
  };

  if (ride.status === 'driver_en_route' && driver.current_latitude && driver.current_longitude) {
    const distance = calculateDistance(
      driver.current_latitude,
      driver.current_longitude,
      request.pickup_latitude,
      request.pickup_longitude
    );
    etas.to_pickup = {
      distance_km: Number(distance.toFixed(2)),
      duration_minutes: calculateETA(distance),
    };
  }

  if (ride.status === 'in_progress' && driver.current_latitude && driver.current_longitude) {
    const distance = calculateDistance(
      driver.current_latitude,
      driver.current_longitude,
      request.dropoff_latitude,
      request.dropoff_longitude
    );
    etas.to_dropoff = {
      distance_km: Number(distance.toFixed(2)),
      duration_minutes: calculateETA(distance),
    };
  }

  return etas;
}

function calculateETA(distanceKm: number): number {
  return Math.ceil((distanceKm / 25) * 60 + 2);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    switch (action) {
      case 'update_location': {
        const result = await updateDriverLocation(params as LocationUpdate);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update_route': {
        const result = await updateRoute(params as RouteUpdate);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_route': {
        const { pickup_lat, pickup_lon, dropoff_lat, dropoff_lon } = params;
        const route = await getRoute(pickup_lat, pickup_lon, dropoff_lat, dropoff_lon);
        return new Response(JSON.stringify({ route }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_etas': {
        const { ride_id } = params;
        const etas = await getETAs(ride_id);
        return new Response(JSON.stringify({ etas }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'batch_location_update': {
        const { updates } = params; // Array of LocationUpdate
        const results = await Promise.all(
          updates.map((update: LocationUpdate) => updateDriverLocation(update))
        );
        return new Response(JSON.stringify({ results }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Tracking error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});