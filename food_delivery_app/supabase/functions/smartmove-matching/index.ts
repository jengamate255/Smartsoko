import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface LocationUpdate {
  ride_id: string;
  driver_id: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
}

interface RideStatusUpdate {
  ride_id: string;
  status: 'assigned' | 'driver_en_route' | 'driver_arrived' | 'in_progress' | 'completed' | 'cancelled';
  actor_id: string;
  actor_role: 'customer' | 'driver' | 'system';
  metadata?: Record<string, any>;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MAPBOX_TOKEN = Deno.env.get('MAPBOX_ACCESS_TOKEN')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function updateDriverLocation(location: LocationUpdate) {
  const { error } = await supabase
    .from('driver_locations')
    .upsert({
      driver_id: location.driver_id,
      latitude: location.latitude,
      longitude: location.longitude,
      heading: location.heading,
      speed: location.speed,
      accuracy: location.accuracy,
      is_online: true,
      is_on_trip: true,
      current_ride_id: location.ride_id,
      recorded_at: new Date().toISOString(),
    }, {
      onConflict: 'driver_id',
    });

  if (error) throw error;

  // Also update driver_profiles for quick lookup
  await supabase
    .from('driver_profiles')
    .update({
      current_latitude: location.latitude,
      current_longitude: location.longitude,
      current_heading: location.heading,
      last_location_update: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', location.driver_id);
}

async function updateRideStatus(update: RideStatusUpdate) {
  const { ride_id, status, actor_id, actor_role, metadata = {} } = update;

  // Get current ride
  const { data: ride, error: rideError } = await supabase
    .from('rides')
    .select('*')
    .eq('id', ride_id)
    .single();

  if (rideError || !ride) throw new Error('Ride not found');

  // Validate status transition
  const validTransitions: Record<string, string[]> = {
    'assigned': ['driver_en_route', 'cancelled'],
    'driver_en_route': ['driver_arrived', 'cancelled'],
    'driver_arrived': ['in_progress', 'cancelled'],
    'in_progress': ['completed', 'cancelled'],
    'completed': [],
    'cancelled': [],
  };

  if (!validTransitions[ride.status]?.includes(status)) {
    throw new Error(`Invalid status transition from ${ride.status} to ${status}`);
  }

  // Update ride
  const updates: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'driver_en_route') updates.driver_en_route_at = new Date().toISOString();
  if (status === 'driver_arrived') updates.driver_arrived_at = new Date().toISOString();
  if (status === 'in_progress') updates.started_at = new Date().toISOString();
  if (status === 'completed') {
    updates.completed_at = new Date().toISOString();
    // Calculate actual distance and duration
    if (ride.route_distance_km && ride.route_duration_minutes) {
      updates.actual_distance_km = ride.route_distance_km;
      updates.actual_duration_minutes = ride.route_duration_minutes;
    }
  }
  if (status === 'cancelled') {
    updates.cancelled_at = new Date().toISOString();
    updates.cancelled_by = actor_id;
    updates.cancellation_reason = metadata.reason;
  }

  const { error: updateError } = await supabase
    .from('rides')
    .update(updates)
    .eq('id', ride_id);

  if (updateError) throw updateError;

  // Log event
  await supabase.from('ride_events').insert({
    ride_id,
    event_type: status,
    event_data: metadata,
    triggered_by: actor_id,
    triggered_by_role: actor_role,
  });

  // If completed, trigger settlement
  if (status === 'completed') {
    await triggerSettlement(ride_id);
  }

  // If cancelled, handle refund/cancellation fee
  if (status === 'cancelled') {
    await handleCancellation(ride_id, actor_id, actor_role, metadata.reason);
  }

  return { success: true };
}

async function triggerSettlement(rideId: string) {
  // Call the settle_delivery function from existing wallet system
  const { data: ride } = await supabase
    .from('rides')
    .select('*, ride_requests!inner(*)')
    .eq('id', rideId)
    .single();

  if (ride) {
    // Get the associated ride_request for payment info
    const rideRequest = (ride as any).ride_requests;
    
    if (rideRequest) {
      // Call the existing settlement function
      await supabase.rpc('settle_delivery', {
        p_order_id: rideRequest.id,
        p_driver_amount: ride.driver_earnings,
      });
    }
  }
}

async function handleCancellation(rideId: string, actorId: string, actorRole: string, reason?: string) {
  const { data: ride } = await supabase
    .from('rides')
    .select('*, ride_requests!inner(*)')
    .eq('id', rideId)
    .single();

  if (!ride) return;

  const rideRequest = (ride as any).ride_requests;
  const isCustomerCancellation = actorRole === 'customer';
  const isDriverCancellation = actorRole === 'driver';

  // Apply cancellation fee if customer cancels after driver assigned
  let cancellationFee = 0;
  if (isCustomerCancellation && ride.status !== 'assigned') {
    // No fee if cancelled before driver assigned
    cancellationFee = 0;
  } else if (isCustomerCancellation) {
    cancellationFee = rideRequest.cancellation_fee || 1000;
  }

  // Update ride request
  await supabase
    .from('ride_requests')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: actorId,
      cancellation_reason: reason,
      cancellation_fee: cancellationFee,
      updated_at: new Date().toISOString(),
    })
    .eq('id', rideRequest.id);

  // Process refund if paid
  if (rideRequest.payment_status === 'paid' && cancellationFee < rideRequest.total_paid) {
    const refundAmount = rideRequest.total_paid - cancellationFee;
    
    // Call refund function
    await supabase.rpc('refund_order_to_wallet', {
      p_order_id: rideRequest.id,
    });
  }

  // Update driver availability
  if (ride.driver_id) {
    await supabase
      .from('driver_profiles')
      .update({ is_online: true })
      .eq('user_id', ride.driver_id);
  }
}

async function completeRideWithPayment(rideId: string) {
  const { data: ride } = await supabase
    .from('rides')
    .select('*, ride_requests!inner(*)')
    .eq('id', rideId)
    .single();

  if (!ride) throw new Error('Ride not found');

  const rideRequest = (ride as any).ride_requests;

  // Calculate final fare based on actual distance/time
  const actualDistance = ride.actual_distance_km || ride.route_distance_km || 0;
  const actualDuration = ride.actual_duration_minutes || ride.route_duration_minutes || 0;

  // Get pricing rule
  const { data: pricingRule } = await supabase
    .from('ride_pricing_rules')
    .select('*')
    .eq('vehicle_type_id', ride.vehicle_type_id)
    .eq('is_active', true)
    .is('zone_id', null)
    .order('priority', { ascending: false })
    .limit(1)
    .single();

  if (pricingRule) {
    const baseFare = pricingRule.base_fare;
    const distanceFare = Math.round(actualDistance * pricingRule.per_km_rate);
    const timeFare = Math.round(actualDuration * pricingRule.per_minute_rate);
    const waitingFare = ride.metadata?.waiting_minutes 
      ? Math.round(ride.metadata.waiting_minutes * pricingRule.waiting_fee_per_minute) 
      : 0;
    
    const subtotal = baseFare + distanceFare + timeFare + waitingFare;
    const platformFee = Math.round(subtotal * 0.20);
    const totalFare = subtotal;
    const driverEarnings = totalFare - platformFee;

    // Update ride with final fare
    await supabase
      .from('rides')
      .update({
        actual_distance_km: actualDistance,
        actual_duration_minutes: actualDuration,
        fare_breakdown: {
          base_fare: baseFare,
          distance_fare: distanceFare,
          time_fare: timeFare,
          waiting_fare: waitingFare,
          platform_fee: platformFee,
          total_fare: totalFare,
        },
        total_fare: totalFare,
        platform_fee: platformFee,
        driver_earnings: driverEarnings,
        payment_status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', rideId);

    // Update ride request
    await supabase
      .from('ride_requests')
      .update({
        actual_distance_km: actualDistance,
        actual_duration_minutes: actualDuration,
        actual_fare: totalFare,
        platform_fee: platformFee,
        driver_earnings: driverEarnings,
        payment_status: 'paid',
        status: 'completed',
        ride_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', rideRequest.id);

    // Create transaction records
    await supabase.from('ride_transactions').insert([
      {
        ride_id: rideId,
        transaction_id: rideRequest.transaction_id,
        transaction_type: 'customer_payment',
        amount: totalFare,
        status: 'completed',
      },
      {
        ride_id: rideId,
        transaction_id: rideRequest.transaction_id,
        transaction_type: 'platform_fee',
        amount: platformFee,
        status: 'completed',
      },
      {
        ride_id: rideId,
        transaction_type: 'driver_payout',
        amount: driverEarnings,
        status: 'completed',
      },
    ]);

    // Credit driver wallet
    await supabase.rpc('credit_wallet', {
      p_user_id: ride.driver_id,
      p_amount: driverEarnings,
      p_order_id: rideRequest.id,
      p_type: 'credit',
      p_description: `Ride earnings for ${rideId}`,
      p_metadata: { ride_id: rideId, role: 'driver' },
    });

    // Generate receipt
    await generateReceipt(rideId, totalFare, driverEarnings, platformFee);
  }

  return { success: true };
}

async function generateReceipt(rideId: string, totalFare: number, driverEarnings: number, platformFee: number) {
  const { data: ride } = await supabase
    .from('rides')
    .select('*, ride_requests!inner(*), driver_profiles!inner(*), profiles!rides_customer_id_fkey(*)')
    .eq('id', rideId)
    .single();

  if (!ride) return;

  const receiptNumber = `RCPT-${Date.now()}-${rideId.slice(0, 8).toUpperCase()}`;
  
  const htmlContent = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #2563EB; }
          .details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0; }
          .fare-breakdown { margin: 20px 0; }
          .fare-row { display: flex; justify-content: space-between; padding: 5px 0; }
          .total { font-weight: bold; font-size: 18px; border-top: 2px solid #000; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">SmartMove</div>
          <div>Trip Receipt</div>
        </div>
        <div class="details">
          <div><strong>Receipt:</strong> ${receiptNumber}</div>
          <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
          <div><strong>Customer:</strong> ${(ride as any).profiles?.name || 'Customer'}</div>
          <div><strong>Driver:</strong> ${(ride as any).driver_profiles?.name || 'Driver'}</div>
          <div><strong>Vehicle:</strong> ${(ride as any).ride_requests?.vehicle_type_id || 'Standard'}</div>
          <div><strong>Pickup:</strong> ${ride.pickup_address}</div>
          <div><strong>Drop-off:</strong> ${ride.dropoff_address}</div>
        </div>
        <div class="fare-breakdown">
          <h3>Fare Breakdown</h3>
          ${Object.entries(ride.fare_breakdown || {}).map(([key, value]) => 
            `<div class="fare-row"><span>${key.replace('_', ' ')}</span><span>TZS ${Number(value).toLocaleString()}</span></div>`
          ).join('')}
          <div class="fare-row total"><span>Total</span><span>TZS ${totalFare.toLocaleString()}</span></div>
        </div>
      </body>
    </html>
  `;

  await supabase.from('trip_receipts').insert({
    ride_id: rideId,
    receipt_number: receiptNumber,
    customer_id: ride.customer_id,
    driver_id: ride.driver_id,
    html_content: htmlContent,
    fare_breakdown: ride.fare_breakdown,
    issued_at: new Date().toISOString(),
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    switch (action) {
      case 'update_location': {
        await updateDriverLocation(params as LocationUpdate);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update_status': {
        await updateRideStatus(params as RideStatusUpdate);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'complete_ride': {
        await completeRideWithPayment(params.ride_id);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'start_ride': {
        // Driver started the ride
        await updateRideStatus({
          ride_id: params.ride_id,
          status: 'in_progress',
          actor_id: params.driver_id,
          actor_role: 'driver',
        });
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'driver_arrived': {
        await updateRideStatus({
          ride_id: params.ride_id,
          status: 'driver_arrived',
          actor_id: params.driver_id,
          actor_role: 'driver',
        });
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Ride tracking error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});