# SmartMove - Ride Hailing Module for SmartSoko

## Overview

SmartMove is a complete ride-hailing module integrated into the SmartSoko super app ecosystem. It reuses existing SmartSoko infrastructure (Supabase, PostgreSQL, Auth, Wallet, Payments, Notifications, Chat) while adding new ride-hailing specific features.

## Architecture

```
SmartSoko
├── supabase/
│   ├── migrations/
│   │   ├── 008_smartmove_rides.sql      # Ride-hailing tables
│   │   └── 009_smartmove_rls.sql        # RLS policies
│   ├── functions/
│   │   ├── smartmove-pricing/           # Pricing engine
│   │   ├── smartmove-matching/          # Ride matching
│   │   ├── smartmove-matching-engine/   # Auto-assignment
│   │   └── smartmove-tracking/          # Real-time tracking
│   └── config.sql                       # Existing config
├── lib/
│   ├── models/smartmove/
│   │   ├── vehicle_type.dart
│   │   ├── driver_profile.dart
│   │   ├── ride_request.dart
│   │   ├── ride.dart
│   │   ├── ride_stop.dart
│   │   ├── ride_event.dart
│   │   ├── fare_breakdown.dart
│   │   ├── promo_code.dart
│   │   └── driver_earnings.dart
│   ├── services/smartmove/
│   │   ├── ride_service.dart            # Ride CRUD + realtime
│   │   ├── pricing_service.dart         # Fare estimation
│   │   ├── matching_service.dart        # Driver matching
│   │   ├── tracking_service.dart        # Real-time GPS
│   │   ├── driver_service.dart          # Driver operations
│   │   └── maintenance_service.dart     # Vehicle/fuel tracking
│   ├── screens/smartmove/
│   │   ├── customer/
│   │   │   ├── ride_booking_screen.dart
│   │   │   ├── ride_tracking_screen.dart
│   │   │   ├── ride_history_screen.dart
│   │   │   └── ride_receipt_screen.dart
│   │   ├── driver/
│   │   │   ├── driver_dashboard_screen.dart
│   │   │   └── driver_earnings_screen.dart
│   │   ├── admin/
│   │   │   └── smartmove_admin_dashboard.dart
│   │   └── merchant_driver_request_screen.dart
│   └── widgets/smartmove/
│       ├── vehicle_type_card.dart
│       ├── fare_estimate_card.dart
│       ├── location_search_field.dart
│       ├── ride_status_indicator.dart
│       └── driver_card.dart
```

## Database Tables (SmartMove)

### New Tables (in `008_smartmove_rides.sql`)

| Table | Purpose | Key Relationships |
|-------|---------|------------------|
| `vehicle_types` | Vehicle categories (Bajaj, Boda Boda, Sedan, SUV, Van) | - |
| `driver_profiles` | Extended driver info | FK → profiles(id) |
| `driver_locations` | GPS tracking history | FK → driver_profiles(user_id) |
| `driver_availability` | Shift scheduling | FK → driver_profiles(user_id) |
| `driver_documents` | License, insurance, etc. | FK → driver_profiles(user_id) |
| `ride_requests` | Customer ride booking | FK → profiles(id) |
| `ride_stops` | Multi-stop rides | FK → ride_requests(id) |
| `rides` | Active/completed rides | FK → ride_requests(id) |
| `ride_events` | Audit trail & realtime status | FK → rides(id) |
| `ride_promotions` | Promo codes | - |
| `customer_promotion_usage` | Usage tracking | FK → profiles(id), promotion(id) |
| `ride_pricing_rules` | Dynamic pricing config | FK → vehicle_types(id) |
| `ride_transactions` | Linked to existing `transactions` | FK → rides(id), transactions(id) |
| `ride_ratings` | Customer/driver ratings | FK → rides(id) |
| `driver_earnings_summary` | Daily/weekly/monthly aggregation | FK → driver_profiles(user_id) |
| `driver_bonuses` | Incentives & bonuses | FK → driver_profiles(user_id) |
| `zones` | Geofencing & pricing zones | - |
| `heatmap_data` | Demand aggregation | FK → zones(id) |
| `trip_receipts` | PDF/HTML receipts | FK → rides(id) |
| `favorite_places` | Saved home/work places | FK → profiles(id) |
| `saved_routes` | Frequent routes | FK → profiles(id) |
| `emergency_contacts` | SOS contacts | FK → profiles(id) |
| `sos_events` | Emergency triggers | FK → profiles(id), rides(id) |
| `shared_trips` | Trip sharing tokens | FK → rides(id) |
| `corporate_accounts` | Business accounts | - |
| `corporate_users` | Corporate members | FK → corporate_accounts(id), profiles(id) |
| `corporate_trips` | Business rides | FK → rides(id), corporate_accounts(id) |
| `driver_referrals` | Referral program | FK → driver_profiles(user_id) |
| `vehicle_maintenance` | Service reminders | FK → driver_profiles(user_id) |
| `fuel_logs` | Fuel tracking | FK → driver_profiles(user_id) |
| `ride_matching_queue` | Queue for realtime matching | FK → ride_requests(id) |
| `driver_ride_assignments` | Accept/reject tracking | FK → ride_requests(id), driver_profiles(user_id) |

### Key Indexes
- `idx_driver_profiles_current_location` - Spatial index for nearby driver lookups
- `idx_ride_matching_queue_status` - Queue ordering
- `idx_ride_requests_searching` - Finding available ride requests
- `idx_zones_boundary` - Geofencing (GIST index)
- `idx_driver_locations_current` - Real-time location tracking

### RLS Policies (in `009_smartmove_rls.sql`)
- Drivers: Read/update own profile, view assigned rides, update location
- Customers: Create ride requests, view own rides, view assigned driver location
- Admins: Full access to all tables
- Service role: Full access for edge functions

## Edge Functions

### `smartmove-pricing` - Fare Estimation Engine
- **Input**: `vehicle_type_id`, pickup/dropoff coordinates, optional promo code
- **Output**: `FareBreakdown` with base fare, distance/time fares, surge, airport fee, surcharges
- **Features**: Mapbox Route API integration, peak/night surcharge, promo validation, airport detection
- **Call**: `POST /functions/v1/smartmove-pricing`

### `smartmove-matching` - Ride Management
- **Input**: `action` parameter (update_location, update_status, complete_ride, start_ride, driver_arrived)
- **Features**: Location updates, status transitions with validation, automatic settlement, receipt generation
- **Call**: `POST /functions/v1/smartmove-matching`

### `smartmove-matching-engine` - Driver Assignment
- **Input**: `action` parameter (find_drivers, assign_driver, driver_response, process_queue, auto_assign)
- **Features**: Haversine distance, multi-factor scoring (distance, ETA, rating, acceptance rate), expanding radius, scheduled ride processing
- **Call**: `POST /functions/v1/smartmove-matching-engine`

### `smartmove-tracking` - Real-time GPS
- **Input**: `action` parameter (update_location, update_route, get_route, get_etas, batch_location_update)
- **Features**: Driver location updates, automatic arrival detection, ETA calculation, Mapbox route, realtime broadcast
- **Call**: `POST /functions/v1/smartmove-tracking`

## Ride Matching Algorithm

The ride matching engine scores drivers using:

```
Score = 100 
  - distance_km * 3 (max -30)
  - eta_minutes * 0.5 (max -20)
  + (rating - 3) * 5 (max +10)
  + acceptance_rate / 100 * 15 (max +15)
  - cancellation_rate / 100 * 10 (max -10)
  + priority_bonus (+10)
  + corporate_bonus (+5)
  + vehicle_type_match (+10)
  + zone_preference (+5)
```

Search radius starts at 5km and expands by 2x every 30 seconds up to 20km.

## Pricing Engine

Fare = Base Fare + (Distance × Per-Km Rate) + (Time × Per-Minute Rate) + Surcharges

Multipliers:
- **Surge**: 1.0x - 3.0x (based on demand)
- **Peak Hours**: +25% (configurable)
- **Night Surcharge**: +20% (22:00 - 05:00)
- **Airport Fee**: Configurable

## Realtime Subscriptions

Ride status changes are broadcast via Supabase Realtime channels:
- `ride-{ride_id}` - Status changes, driver location, ride events
- `driver-{driver_id}` - Driver location updates

## Customer Features Implemented

1. **Ride Booking** - Search pickup/dropoff, vehicle selection, fare estimate, promo codes, multi-stop
2. **Ride Scheduling** - Future ride booking
3. **Ride Tracking** - Real-time map, driver location, ETA, status indicators
4. **Ride History** - Completed/scheduled/cancelled rides with details
5. **Trip Receipts** - HTML receipts with fare breakdown
6. **Favorite Places** - Save home, work, custom locations
7. **Saved Routes** - Frequent routes
8. **Driver Info** - Name, rating, vehicle details, call/chat
9. **SOS Button** - Emergency alerts
10. **Share Trip** - Sharing tokens
11. **Rating** - Rate driver post-ride
12. **Tips** - Post-ride tipping
13. **Cancellation** - With cancellation fee handling
14. **Rebook** - Rebook previous rides

## Driver Features Implemented

1. **Online/Offline Toggle** - With earnings summary card
2. **Ride Acceptance** - Accept/reject ride requests
3. **Navigation** - Map view with pickup/dropoff markers
4. **Real-time GPS** - Background location updates
5. **Earnings Dashboard** - Balance, daily/weekly earnings
6. **Withdrawals** - Request withdrawal to wallet
7. **Ride History** - Past ride list
8. **Rating** - Driver rating display
9. **Vehicle Info** - Make, model, plate, color
10. **Document Upload** - License, insurance, etc.
11. **Maintenance Reminders** - Oil change, tire rotation, etc.
12. **Fuel Tracking** - Fuel logs and efficiency

## Merchant Integration

Merchants can request drivers directly from their order management screen:

1. Merchant clicks **"Request Driver"** on an order
2. A ride request is created from merchant location to customer location
3. The matching engine assigns the nearest driver
4. Both merchant and customer can track the driver in real-time
5. Driver collects order from merchant and delivers to customer

## Admin Dashboard

SmartMove extends the SmartSoko admin with:
- **Live Drivers** - Online/offline count, active rides
- **Trip Management** - Active and completed rides
- **Revenue Analytics** - Daily revenue tracking
- **Driver Verification** - Pending approvals, document verification
- **Vehicle Approval** - Vehicle document review
- **Pricing Rules** - Configure base fares, surge, surcharges
- **SOS Dashboard** - Emergency event monitoring
- **Heat Maps** - Demand visualization
- **Fraud Detection** - Suspicious activity monitoring

## Reusing SmartSoko Infrastructure

| SmartSoko Service | SmartMove Usage |
|-------------------|-----------------|
| Supabase Auth | User authentication (JWT) |
| PostgreSQL (Profiles) | FK to `profiles(id)` for customers & drivers |
| Wallet (wallets, transactions) | `ride_transactions` FK → `transactions(id)` |
| Payment (existing functions) | `settle_delivery`, `credit_wallet`, `debit_wallet` |
| Notifications | Ride status changes, driver found, etc. |
| Chat | Driver ↔ Customer messaging |
| Storage | Driver document uploads, vehicle images |

## How to Deploy

```bash
# 1. Apply migrations
cd food_delivery_app
supabase db push

# 2. Deploy edge functions
supabase functions deploy smartmove-pricing
supabase functions deploy smartmove-matching
supabase functions deploy smartmove-matching-engine
supabase functions deploy smartmove-tracking

# 3. Set secrets
supabase secrets set MAPBOX_ACCESS_TOKEN="your_mapbox_token"
supabase secrets set PESAPAL_CONSUMER_KEY="your_pesapal_key"
supabase secrets set PESAPAL_CONSUMER_SECRET="your_pesapal_secret"
supabase secrets set SUPABASE_URL="your_supabase_url"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# 4. Add to Flutter app
# - Import SmartMove screens in navigation
# - Add SmartMove services in dependency injection
# - Add SmartMove to bottom navigation bar
```

## Environment Variables

```
MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PESAPAL_CONSUMER_KEY=your_pesapal_key
PESAPAL_CONSUMER_SECRET=your_pesapal_secret
```

## Testing

```bash
# Run SmartMove unit tests
npm run test -- --grep "smartmove"

# Test ride matching
supabase functions serve smartmove-matching-engine
curl -X POST http://localhost:54321/functions/v1/smartmove-matching-engine \
  -H "Content-Type: application/json" \
  -d '{"action":"find_drivers","ride_request_id":"...","search_radius_km":5}'
```