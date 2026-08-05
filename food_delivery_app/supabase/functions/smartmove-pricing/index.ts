import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PricingRequest {
  vehicle_type_id: string;
  pickup_latitude: number;
  pickup_longitude: number;
  dropoff_latitude: number;
  dropoff_longitude: number;
  pickup_zone_id?: string;
  dropoff_zone_id?: string;
  scheduled_for?: string;
  is_airport_pickup?: boolean;
  is_airport_dropoff?: boolean;
  promo_code?: string;
  customer_id?: string;
  distance_km?: number;
  duration_minutes?: number;
}

interface PricingRule {
  base_fare: number;
  per_km_rate: number;
  per_minute_rate: number;
  min_fare: number;
  max_fare: number | null;
  waiting_fee_per_minute: number;
  cancellation_fee: number;
  airport_fee: number;
  night_surcharge_percentage: number;
  peak_hours_start: string;
  peak_hours_end: string;
  peak_surcharge_percentage: number;
}

interface FareBreakdown {
  base_fare: number;
  distance_fare: number;
  time_fare: number;
  waiting_fare: number;
  airport_fee: number;
  night_surcharge: number;
  peak_surcharge: number;
  promo_discount: number;
  subtotal: number;
  platform_fee: number;
  total_fare: number;
  surge_multiplier: number;
  estimated_distance_km: number;
  estimated_duration_minutes: number;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MAPBOX_TOKEN = Deno.env.get('MAPBOX_ACCESS_TOKEN')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Calculate distance and duration using Mapbox Directions API
async function getRouteInfo(pickupLat: number, pickupLon: number, dropoffLat: number, dropoffLon: number) {
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${pickupLon},${pickupLat};${dropoffLon},${dropoffLat}?overview=full&geometries=geojson&access_token=${MAPBOX_TOKEN}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.routes && data.routes.length > 0) {
    const route = data.routes[0];
    return {
      distance_km: route.distance / 1000,
      duration_minutes: route.duration / 60,
      geometry: route.geometry,
    };
  }
  
  // Fallback to haversine
  const distance = calculateHaversineDistance(pickupLat, pickupLon, dropoffLat, dropoffLon);
  return {
    distance_km: distance,
    duration_minutes: (distance / 25) * 60, // Assume 25 km/h average
    geometry: null,
  };
}

function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function getPricingRule(vehicleTypeId: string, zoneId?: string): Promise<PricingRule> {
  let query = supabase
    .from('ride_pricing_rules')
    .select('*')
    .eq('vehicle_type_id', vehicleTypeId)
    .eq('is_active', true)
    .order('priority', { ascending: false })
    .limit(1);

  if (zoneId) {
    query = query.or(`zone_id.is.null,zone_id.eq.${zoneId}`);
  } else {
    query = query.is('zone_id', null);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    // Default pricing
    return {
      base_fare: 2000,
      per_km_rate: 500,
      per_minute_rate: 50,
      min_fare: 3000,
      max_fare: null,
      waiting_fee_per_minute: 30,
      cancellation_fee: 1000,
      airport_fee: 5000,
      night_surcharge_percentage: 20,
      peak_hours_start: '07:00',
      peak_hours_end: '09:00',
      peak_surcharge_percentage: 25,
    };
  }

  return {
    base_fare: data.base_fare,
    per_km_rate: data.per_km_rate,
    per_minute_rate: data.per_minute_rate,
    min_fare: data.min_fare,
    max_fare: data.max_fare,
    waiting_fee_per_minute: data.waiting_fee_per_minute,
    cancellation_fee: data.cancellation_fee,
    airport_fee: data.airport_fee,
    night_surcharge_percentage: data.night_surcharge_percentage,
    peak_hours_start: data.peak_hours_start,
    peak_hours_end: data.peak_hours_end,
    peak_surcharge_percentage: data.peak_surcharge_percentage,
  };
}

async function getSurgeMultiplier(pickupLat: number, pickupLon: number, zoneId?: string): Promise<number> {
  // Check for active surge in the zone
  // This would typically query a surge_zones table or use real-time demand data
  // For now, return 1.0 (no surge)
  
  // In production, you would check:
  // - Current demand vs supply in the zone
  // - Time-based surge rules
  // - Event-based surge
  
  return 1.0;
}

async function validatePromoCode(code: string, customerId: string, estimatedFare: number): Promise<{ valid: boolean; discount: number; promo_id?: string }> {
  if (!code) return { valid: false, discount: 0 };

  const { data: promo, error } = await supabase
    .from('ride_promotions')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .lte('valid_from', new Date().toISOString())
    .gte('valid_until', new Date().toISOString())
    .single();

  if (error || !promo) return { valid: false, discount: 0 };

  // Check usage limit
  if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
    return { valid: false, discount: 0 };
  }

  // Check per-customer usage
  const { count } = await supabase
    .from('customer_promotion_usage')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', customerId)
    .eq('promotion_id', promo.id);

  if (count && count >= promo.usage_per_customer) {
    return { valid: false, discount: 0 };
  }

  // Check first ride only
  if (promo.is_first_ride_only) {
    const { count: rideCount } = await supabase
      .from('ride_requests')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId)
      .eq('status', 'completed');

    if (rideCount && rideCount > 0) {
      return { valid: false, discount: 0 };
    }
  }

  // Calculate discount
  let discount = 0;
  if (promo.discount_type === 'percentage') {
    discount = Math.floor(estimatedFare * promo.discount_value / 100);
    if (promo.max_discount) discount = Math.min(discount, promo.max_discount);
  } else if (promo.discount_type === 'fixed_amount') {
    discount = promo.discount_value;
  } else if (promo.discount_type === 'free_ride') {
    discount = estimatedFare;
  }

  return { valid: true, discount, promo_id: promo.id };
}

function isNightTime(): boolean {
  const now = new Date();
  const hours = now.getHours();
  return hours >= 22 || hours < 5;
}

function isPeakHours(peakStart: string, peakEnd: string): boolean {
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  return currentTime >= peakStart && currentTime <= peakEnd;
}

function isAirportZone(lat: number, lon: number): boolean {
  // Julius Nyerere International Airport (DAR) coordinates
  const airportLat = -6.8781;
  const airportLon = 39.2026;
  const distance = calculateHaversineDistance(lat, lon, airportLat, airportLon);
  return distance < 5; // Within 5km of airport
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: PricingRequest = await req.json();
    
    const {
      vehicle_type_id,
      pickup_latitude,
      pickup_longitude,
      dropoff_latitude,
      dropoff_longitude,
      pickup_zone_id,
      dropoff_zone_id,
      scheduled_for,
      is_airport_pickup = false,
      is_airport_dropoff = false,
      promo_code,
      customer_id,
      distance_km,
      duration_minutes,
    } = body;

    // Get route info if not provided
    let estimatedDistance = distance_km;
    let estimatedDuration = duration_minutes;
    let routeGeometry = null;

    if (!estimatedDistance || !estimatedDuration) {
      const route = await getRouteInfo(pickup_latitude, pickup_longitude, dropoff_latitude, dropoff_longitude);
      estimatedDistance = route.distance_km;
      estimatedDuration = route.duration_minutes;
      routeGeometry = route.geometry;
    }

    // Get pricing rule
    const pricingRule = await getPricingRule(vehicle_type_id, pickup_zone_id || dropoff_zone_id);

    // Calculate surge multiplier
    const surgeMultiplier = await getSurgeMultiplier(pickup_latitude, pickup_longitude, pickup_zone_id);

    // Calculate base fare components
    const baseFare = pricingRule.base_fare;
    const distanceFare = Math.round(estimatedDistance * pricingRule.per_km_rate);
    const timeFare = Math.round(estimatedDuration * pricingRule.per_minute_rate);

    // Calculate surcharges
    let nightSurcharge = 0;
    let peakSurcharge = 0;
    let airportFee = 0;

    // Night surcharge
    if (scheduled_for) {
      const scheduledDate = new Date(scheduled_for);
      const hours = scheduledDate.getHours();
      if (hours >= 22 || hours < 5) {
        nightSurcharge = Math.round((baseFare + distanceFare + timeFare) * pricingRule.night_surcharge_percentage / 100);
      }
    } else if (isNightTime()) {
      nightSurcharge = Math.round((baseFare + distanceFare + timeFare) * pricingRule.night_surcharge_percentage / 100);
    }

    // Peak hours surcharge
    if (isPeakHours(pricingRule.peak_hours_start, pricingRule.peak_hours_end)) {
      peakSurcharge = Math.round((baseFare + distanceFare + timeFare) * pricingRule.peak_surcharge_percentage / 100);
    }

    // Airport fee
    if (is_airport_pickup || is_airport_dropoff || isAirportZone(pickup_latitude, pickup_longitude) || isAirportZone(dropoff_latitude, dropoff_longitude)) {
      airportFee = pricingRule.airport_fee;
    }

    // Subtotal before promo
    const subtotal = baseFare + distanceFare + timeFare + nightSurcharge + peakSurcharge + airportFee;

    // Apply surge multiplier
    const surgedSubtotal = Math.round(subtotal * surgeMultiplier);

    // Validate promo code
    let promoDiscount = 0;
    let promoId: string | undefined;
    if (promo_code && customer_id) {
      const promoResult = await validatePromoCode(promo_code, customer_id, surgedSubtotal);
      if (promoResult.valid) {
        promoDiscount = promoResult.discount;
        promoId = promoResult.promo_id;
      }
    }

    // Calculate final fare
    let totalFare = surgedSubtotal - promoDiscount;
    
    // Apply minimum fare
    if (totalFare < pricingRule.min_fare) {
      totalFare = pricingRule.min_fare;
    }

    // Apply maximum fare
    if (pricingRule.max_fare && totalFare > pricingRule.max_fare) {
      totalFare = pricingRule.max_fare;
    }

    // Platform fee (e.g., 20%)
    const platformFee = Math.round(totalFare * 0.20);
    const driverEarnings = totalFare - platformFee;

    const breakdown: FareBreakdown = {
      base_fare: baseFare,
      distance_fare: distanceFare,
      time_fare: timeFare,
      waiting_fare: 0, // Calculated at end of trip
      airport_fee: airportFee,
      night_surcharge: nightSurcharge,
      peak_surcharge: peakSurcharge,
      promo_discount: promoDiscount,
      subtotal: surgedSubtotal,
      platform_fee: platformFee,
      total_fare: totalFare,
      surge_multiplier: surgeMultiplier,
      estimated_distance_km: estimatedDistance,
      estimated_duration_minutes: estimatedDuration,
    };

    // Record promo usage if valid
    if (promoId && customer_id) {
      await supabase.from('customer_promotion_usage').insert({
        customer_id,
        promotion_id: promoId,
        discount_applied: promoDiscount,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        fare_breakdown: breakdown,
        route_geometry: routeGeometry,
        estimated_distance_km: estimatedDistance,
        estimated_duration_minutes: estimatedDuration,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Pricing error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});